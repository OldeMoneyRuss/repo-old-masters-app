import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  varchar,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { artworks } from "./catalog";

export const assetKindEnum = pgEnum("asset_kind", [
  "master",
  "thumb",
  "catalog",
  "pdp",
  "zoom",
  "social",
  "email",
]);

export const printSizeEnum = pgEnum("print_size", [
  "8x10",
  "11x14",
  "16x20",
  "18x24",
  "24x36",
  "30x40",
]);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artworkId: uuid("artwork_id")
      .notNull()
      .references(() => artworks.id, { onDelete: "cascade" }),
    kind: assetKindEnum("kind").notNull(),
    bucket: varchar("bucket", { length: 120 }).notNull(),
    key: varchar("key", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    widthPx: integer("width_px").notNull(),
    heightPx: integer("height_px").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }),
    dominantColors: jsonb("dominant_colors")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("assets_artwork_kind_key").on(t.artworkId, t.kind),
    index("assets_artwork_idx").on(t.artworkId),
  ],
);

export const artworkSizeEligibility = pgTable(
  "artwork_size_eligibility",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artworkId: uuid("artwork_id")
      .notNull()
      .references(() => artworks.id, { onDelete: "cascade" }),
    printSize: printSizeEnum("print_size").notNull(),
    dpi: integer("dpi").notNull(),
    eligible: boolean("eligible").notNull(),
    borderTreatment: varchar("border_treatment", { length: 40 })
      .notNull()
      .default("fit_pad"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("artwork_size_eligibility_key").on(t.artworkId, t.printSize),
  ],
);
