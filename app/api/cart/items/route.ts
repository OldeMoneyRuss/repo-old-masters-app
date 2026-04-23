import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { artworks, cartItems, artworkSizeEligibility } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getPricing, unitPriceCents } from "@/lib/pricing";
import {
  CART_COOKIE_MAX_AGE_SECONDS,
  CART_COOKIE_NAME,
  extendCartExpiry,
  generateGuestToken,
  getCartWithItems,
  getOrCreateCart,
  type CartIdentity,
} from "@/lib/cart";

export const dynamic = "force-dynamic";

const PRINT_SIZES = ["8x10", "11x14", "16x20", "18x24", "24x36", "30x40"] as const;
const PAPER_TYPES = ["archival_matte", "lustre", "fine_art_cotton"] as const;

const addItemSchema = z.object({
  artworkId: z.string().uuid(),
  printSize: z.enum(PRINT_SIZES),
  paperType: z.enum(PAPER_TYPES),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { artworkId, printSize, paperType } = parsed.data;

  const [artwork] = await db
    .select({ publishStatus: artworks.publishStatus })
    .from(artworks)
    .where(eq(artworks.id, artworkId))
    .limit(1);

  if (!artwork || artwork.publishStatus !== "published") {
    return NextResponse.json(
      { error: "This artwork is not available for purchase." },
      { status: 404 },
    );
  }

  const [eligibility] = await db
    .select({ eligible: artworkSizeEligibility.eligible })
    .from(artworkSizeEligibility)
    .where(
      and(
        eq(artworkSizeEligibility.artworkId, artworkId),
        eq(artworkSizeEligibility.printSize, printSize),
      ),
    )
    .limit(1);

  if (!eligibility || !eligibility.eligible) {
    return NextResponse.json(
      { error: "This size is not available for the selected artwork." },
      { status: 422 },
    );
  }

  const pricing = await getPricing();
  const price = unitPriceCents(pricing, { printSize, paperType });

  const session = await auth();
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(CART_COOKIE_NAME)?.value ?? null;

  let newGuestToken: string | null = null;
  let identity: CartIdentity;
  if (session?.user?.id) {
    identity = { kind: "user", userId: session.user.id };
  } else if (existingCookie) {
    identity = { kind: "guest", token: existingCookie };
  } else {
    newGuestToken = generateGuestToken();
    identity = { kind: "guest", token: newGuestToken };
  }

  const { id: cartId } = await getOrCreateCart(identity);

  const [existing] = await db
    .select({ id: cartItems.id, quantity: cartItems.quantity })
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.artworkId, artworkId),
        eq(cartItems.printSize, printSize),
        eq(cartItems.paperType, paperType),
      ),
    )
    .limit(1);

  if (existing) {
    const nextQty = Math.min(10, existing.quantity + 1);
    await db
      .update(cartItems)
      .set({ quantity: nextQty, updatedAt: new Date() })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      cartId,
      artworkId,
      printSize,
      paperType,
      quantity: 1,
      unitPriceCents: price,
    });
  }

  await extendCartExpiry(cartId);
  const cart = await getCartWithItems(cartId);
  const res = NextResponse.json(cart);

  if (newGuestToken) {
    res.cookies.set(CART_COOKIE_NAME, newGuestToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: CART_COOKIE_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return res;
}
