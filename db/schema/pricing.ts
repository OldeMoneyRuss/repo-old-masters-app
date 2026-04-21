import { sql } from "drizzle-orm";
import {
  pgTable,
  integer,
  timestamp,
  jsonb,
  check,
} from "drizzle-orm/pg-core";

export type PriceModifiers = Record<string, number>;

export const pricingConfig = pgTable(
  "pricing_config",
  {
    // Singleton row — id is always 1. CHECK constraint enforces this.
    id: integer("id").primaryKey().default(1),
    basePriceCents: integer("base_price_cents").notNull().default(0),
    sizeModifiers: jsonb("size_modifiers")
      .$type<PriceModifiers>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    paperModifiers: jsonb("paper_modifiers")
      .$type<PriceModifiers>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: integer("updated_by"),
  },
  (t) => [
    check("pricing_config_singleton", sql`${t.id} = 1`),
    check("pricing_config_base_nonneg", sql`${t.basePriceCents} >= 0`),
  ],
);
