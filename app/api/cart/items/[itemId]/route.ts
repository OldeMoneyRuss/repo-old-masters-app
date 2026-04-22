import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { cartItems } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  CART_COOKIE_NAME,
  findActiveCart,
  getCartWithItems,
  type CartIdentity,
} from "@/lib/cart";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  quantity: z.number().int().min(1).max(10),
});

async function resolveCartId(): Promise<string | null> {
  const session = await auth();
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CART_COOKIE_NAME)?.value ?? null;

  const identity: CartIdentity | null = session?.user?.id
    ? { kind: "user", userId: session.user.id }
    : cookieToken
      ? { kind: "guest", token: cookieToken }
      : null;

  if (!identity) return null;
  const found = await findActiveCart(identity);
  return found?.id ?? null;
}

async function ensureItemBelongs(
  itemId: string,
  cartId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: cartItems.id })
    .from(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
    .limit(1);
  return !!row;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const cartId = await resolveCartId();
  if (!cartId) {
    return NextResponse.json({ error: "No cart" }, { status: 404 });
  }
  if (!(await ensureItemBelongs(itemId, cartId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .update(cartItems)
    .set({ quantity: parsed.data.quantity, updatedAt: new Date() })
    .where(eq(cartItems.id, itemId));

  const cart = await getCartWithItems(cartId);
  return NextResponse.json(cart);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const cartId = await resolveCartId();
  if (!cartId) {
    return NextResponse.json({ error: "No cart" }, { status: 404 });
  }
  if (!(await ensureItemBelongs(itemId, cartId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(cartItems).where(eq(cartItems.id, itemId));

  const cart = await getCartWithItems(cartId);
  return NextResponse.json(cart);
}
