import { eq } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { pricingConfig } from "@/db/schema/pricing";
import {
  unitPriceCents,
  type PriceInput,
  type PricingSnapshot,
} from "./calc";

export { unitPriceCents };
export type { PriceInput, PricingSnapshot };

async function _fetchPricing(): Promise<PricingSnapshot> {
  const [row] = await db
    .select()
    .from(pricingConfig)
    .where(eq(pricingConfig.id, 1))
    .limit(1);
  return {
    basePriceCents: row?.basePriceCents ?? 0,
    sizeModifiers: row?.sizeModifiers ?? {},
    paperModifiers: row?.paperModifiers ?? {},
    updatedAt: row?.updatedAt ?? new Date(0),
  };
}

export const getPricing = unstable_cache(_fetchPricing, ["pricing"], {
  tags: ["pricing"],
  revalidate: 300,
});

export function invalidatePricingCache(): void {
  revalidateTag("pricing");
}

export async function priceFor(input: PriceInput): Promise<number> {
  return unitPriceCents(await getPricing(), input);
}
