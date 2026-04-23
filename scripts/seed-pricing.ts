/**
 * Seed the pricing_config singleton row. TDS §5.3 prices are illustrative only.
 * Run with: `npm run db:seed`
 */
import { db } from "@/lib/db";
import { pricingConfig } from "@/db/schema";

async function main() {
  const base = 4900; // $49.00
  await db
    .insert(pricingConfig)
    .values({
      id: 1,
      basePriceCents: base,
      sizeModifiers: {
        "8x10": 0,
        "11x14": 1500,
        "16x20": 3500,
        "18x24": 5000,
        "24x36": 8000,
        "30x40": 12000,
      },
      paperModifiers: {
        archival_matte: 0,
        lustre: 500,
        fine_art_cotton: 2000,
      },
    })
    .onConflictDoNothing({ target: pricingConfig.id });

  console.log("Seeded pricing_config singleton.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
