import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pricingConfig, type PriceModifiers } from "@/db/schema/pricing";

export type PriceInput = {
  printSize: string;
  paperType: string;
};

export type PricingSnapshot = {
  basePriceCents: number;
  sizeModifiers: PriceModifiers;
  paperModifiers: PriceModifiers;
  updatedAt: Date;
};

let cached: { snap: PricingSnapshot; cachedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getPricing(): Promise<PricingSnapshot> {
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.snap;
  }
  const [row] = await db
    .select()
    .from(pricingConfig)
    .where(eq(pricingConfig.id, 1))
    .limit(1);
  const snap: PricingSnapshot = {
    basePriceCents: row?.basePriceCents ?? 0,
    sizeModifiers: row?.sizeModifiers ?? {},
    paperModifiers: row?.paperModifiers ?? {},
    updatedAt: row?.updatedAt ?? new Date(0),
  };
  cached = { snap, cachedAt: Date.now() };
  return snap;
}

export function invalidatePricingCache(): void {
  cached = null;
}

export function unitPriceCents(
  snap: PricingSnapshot,
  input: PriceInput,
): number {
  const sizeMod = snap.sizeModifiers[input.printSize] ?? 0;
  const paperMod = snap.paperModifiers[input.paperType] ?? 0;
  return Math.max(0, snap.basePriceCents + sizeMod + paperMod);
}

export async function priceFor(input: PriceInput): Promise<number> {
  return unitPriceCents(await getPricing(), input);
}
