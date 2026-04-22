import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  carts,
  cartItems,
  artworks,
  artists,
  assets,
} from "@/db/schema";

export type CartIdentity =
  | { kind: "user"; userId: string }
  | { kind: "guest"; token: string };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function newExpiry(): Date {
  return new Date(Date.now() + THIRTY_DAYS_MS);
}

export async function findActiveCart(
  identity: CartIdentity,
): Promise<{ id: string } | null> {
  const whereClause =
    identity.kind === "user"
      ? and(eq(carts.userId, identity.userId), eq(carts.status, "active"))
      : and(
          eq(carts.guestToken, identity.token),
          eq(carts.status, "active"),
        );

  const [row] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(whereClause)
    .limit(1);

  return row ?? null;
}

export async function getOrCreateCart(
  identity: CartIdentity,
): Promise<{ id: string; guestToken: string | null }> {
  const whereClause =
    identity.kind === "user"
      ? and(eq(carts.userId, identity.userId), eq(carts.status, "active"))
      : and(
          eq(carts.guestToken, identity.token),
          eq(carts.status, "active"),
        );

  const [existing] = await db
    .select({ id: carts.id, guestToken: carts.guestToken })
    .from(carts)
    .where(whereClause)
    .limit(1);

  if (existing) {
    return { id: existing.id, guestToken: existing.guestToken };
  }

  const [created] = await db
    .insert(carts)
    .values({
      userId: identity.kind === "user" ? identity.userId : null,
      guestToken: identity.kind === "guest" ? identity.token : null,
      status: "active",
      expiresAt: newExpiry(),
    })
    .returning({ id: carts.id, guestToken: carts.guestToken });

  return { id: created.id, guestToken: created.guestToken };
}

export type CartWithItems = {
  id: string;
  itemCount: number;
  subtotalCents: number;
  items: Array<{
    id: string;
    artworkId: string;
    artworkSlug: string;
    artworkTitle: string;
    artistName: string | null;
    thumbKey: string | null;
    printSize: string;
    paperType: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
};

export async function getCartWithItems(cartId: string): Promise<CartWithItems> {
  const rows = await db
    .select({
      id: cartItems.id,
      artworkId: cartItems.artworkId,
      artworkSlug: artworks.slug,
      artworkTitle: artworks.title,
      artistName: artists.name,
      thumbKey: assets.key,
      printSize: cartItems.printSize,
      paperType: cartItems.paperType,
      quantity: cartItems.quantity,
      unitPriceCents: cartItems.unitPriceCents,
      createdAt: cartItems.createdAt,
    })
    .from(cartItems)
    .innerJoin(artworks, eq(artworks.id, cartItems.artworkId))
    .leftJoin(artists, eq(artists.id, artworks.artistId))
    .leftJoin(
      assets,
      and(eq(assets.artworkId, artworks.id), eq(assets.kind, "thumb")),
    )
    .where(eq(cartItems.cartId, cartId))
    .orderBy(cartItems.createdAt);

  const items = rows.map((r) => ({
    id: r.id,
    artworkId: r.artworkId,
    artworkSlug: r.artworkSlug,
    artworkTitle: r.artworkTitle,
    artistName: r.artistName,
    thumbKey: r.thumbKey,
    printSize: r.printSize as string,
    paperType: r.paperType as string,
    quantity: r.quantity,
    unitPriceCents: r.unitPriceCents,
    lineTotalCents: r.unitPriceCents * r.quantity,
  }));

  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const subtotalCents = items.reduce((n, i) => n + i.lineTotalCents, 0);

  return { id: cartId, itemCount, subtotalCents, items };
}

export async function mergeGuestCart(
  guestToken: string,
  userId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [guestCart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(
        and(eq(carts.guestToken, guestToken), eq(carts.status, "active")),
      )
      .limit(1);

    if (!guestCart) return;

    const [userCart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.userId, userId), eq(carts.status, "active")))
      .limit(1);

    if (!userCart) {
      await tx
        .update(carts)
        .set({
          userId,
          guestToken: null,
          expiresAt: newExpiry(),
          updatedAt: new Date(),
        })
        .where(eq(carts.id, guestCart.id));
      return;
    }

    const guestItems = await tx
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, guestCart.id));

    for (const gi of guestItems) {
      const [match] = await tx
        .select({ id: cartItems.id, quantity: cartItems.quantity })
        .from(cartItems)
        .where(
          and(
            eq(cartItems.cartId, userCart.id),
            eq(cartItems.artworkId, gi.artworkId),
            eq(cartItems.printSize, gi.printSize),
            eq(cartItems.paperType, gi.paperType),
          ),
        )
        .limit(1);

      if (match) {
        const merged = Math.min(10, match.quantity + gi.quantity);
        await tx
          .update(cartItems)
          .set({ quantity: merged, updatedAt: new Date() })
          .where(eq(cartItems.id, match.id));
      } else {
        await tx.insert(cartItems).values({
          cartId: userCart.id,
          artworkId: gi.artworkId,
          printSize: gi.printSize,
          paperType: gi.paperType,
          quantity: Math.min(10, gi.quantity),
          unitPriceCents: gi.unitPriceCents,
        });
      }
    }

    await tx
      .update(carts)
      .set({ status: "converted", updatedAt: new Date() })
      .where(eq(carts.id, guestCart.id));

    await tx
      .update(carts)
      .set({ expiresAt: newExpiry(), updatedAt: new Date() })
      .where(eq(carts.id, userCart.id));
  });
}

export function generateGuestToken(): string {
  return randomUUID();
}

export const CART_COOKIE_NAME = "CART_TOKEN";
export const CART_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
