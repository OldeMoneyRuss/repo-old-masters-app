import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  CART_COOKIE_NAME,
  getCartWithItems,
  getOrCreateCart,
  type CartIdentity,
} from "@/lib/cart";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CART_COOKIE_NAME)?.value ?? null;

  const identity: CartIdentity | null = session?.user?.id
    ? { kind: "user", userId: session.user.id }
    : cookieToken
      ? { kind: "guest", token: cookieToken }
      : null;

  if (!identity) {
    return NextResponse.json({
      id: null,
      itemCount: 0,
      subtotalCents: 0,
      items: [],
    });
  }

  const { id } = await getOrCreateCart(identity);
  const cart = await getCartWithItems(id);
  return NextResponse.json(cart);
}
