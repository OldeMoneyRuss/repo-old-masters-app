import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pricingConfig } from "@/db/schema/pricing";
import {
  unitPriceCents,
  type PriceInput,
  type PricingSnapshot,
} from "./calc";

export { unitPriceCents };
export type { PriceInput, PricingSnapshot };

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

export async function priceFor(input: PriceInput): Promise<number> {
  return unitPriceCents(await getPricing(), input);
}
