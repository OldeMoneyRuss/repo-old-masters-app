import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  check,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const publishStatusEnum = pgEnum("publish_status", [
  "draft",
  "published",
  "archived",
]);

export const orientationEnum = pgEnum("orientation", [
  "portrait",
  "landscape",
  "square",
]);

export const artists = pgTable(
  "artists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    bio: text("bio"),
    birthYear: integer("birth_year"),
    deathYear: integer("death_year"),
    nationality: varchar("nationality", { length: 100 }),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("artists_slug_key").on(t.slug)],
);

export const movements = pgTable(
  "movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    dateRangeLabel: varchar("date_range_label", { length: 100 }),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("movements_slug_key").on(t.slug)],
);

export const museums = pgTable(
  "museums",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    city: varchar("city", { length: 120 }),
    country: varchar("country", { length: 120 }),
    externalUrl: text("external_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("museums_slug_key").on(t.slug)],
);

export const artworks = pgTable(
  "artworks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    artistId: uuid("artist_id").references(() => artists.id, {
      onDelete: "set null",
    }),
    movementId: uuid("movement_id").references(() => movements.id, {
      onDelete: "set null",
    }),
    museumId: uuid("museum_id").references(() => museums.id, {
      onDelete: "set null",
    }),
    yearLabel: varchar("year_label", { length: 80 }),
    shortDescription: text("short_description"),
    longDescription: text("long_description"),
    provenanceNote: text("provenance_note"),
    subjectTags: jsonb("subject_tags")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    orientation: orientationEnum("orientation"),
    publishStatus: publishStatusEnum("publish_status")
      .notNull()
      .default("draft"),
    rightsApproved: boolean("rights_approved").notNull().default(false),
    masterAssetId: uuid("master_asset_id"),
    canonicalUrl: text("canonical_url"),
    sortWeight: integer("sort_weight").notNull().default(0),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: text("seo_description"),
    searchVector: text("search_vector"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("artworks_slug_key").on(t.slug),
    index("artworks_artist_idx").on(t.artistId),
    index("artworks_movement_idx").on(t.movementId),
    index("artworks_museum_idx").on(t.museumId),
    index("artworks_publish_idx").on(t.publishStatus, t.sortWeight),
    // Rights gate: cannot be published without rights_approved.
    check(
      "artworks_rights_gate",
      sql`${t.publishStatus} <> 'published' OR ${t.rightsApproved} = true`,
    ),
  ],
);
