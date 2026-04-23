import type { PriceModifiers } from "@/db/schema/pricing";

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

export function unitPriceCents(
  snap: PricingSnapshot,
  input: PriceInput,
): number {
  const sizeMod = snap.sizeModifiers[input.printSize] ?? 0;
  const paperMod = snap.paperModifiers[input.paperType] ?? 0;
  return Math.max(0, snap.basePriceCents + sizeMod + paperMod);
}
