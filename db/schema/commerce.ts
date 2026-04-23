import {
  pgTable,
  pgEnum,
  varchar,
  integer,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { artworks } from "./catalog";
import { users, addresses } from "./users";
import { printSizeEnum } from "./assets";

export const cartStatusEnum = pgEnum("cart_status", [
  "active",
  "converted",
  "abandoned",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "in_production",
  "quality_check",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paperTypeEnum = pgEnum("paper_type", [
  "archival_matte",
  "lustre",
  "fine_art_cotton",
]);

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    guestToken: varchar("guest_token", { length: 64 }),
    status: cartStatusEnum("status").notNull().default("active"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("carts_guest_token_key").on(t.guestToken),
    index("carts_user_idx").on(t.userId),
    index("carts_status_idx").on(t.status),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    artworkId: uuid("artwork_id")
      .notNull()
      .references(() => artworks.id, { onDelete: "restrict" }),
    printSize: printSizeEnum("print_size").notNull(),
    paperType: paperTypeEnum("paper_type").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("cart_items_cart_idx").on(t.cartId)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    email: varchar("email", { length: 320 }).notNull(),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    shippingAddressId: uuid("shipping_address_id").references(
      () => addresses.id,
      { onDelete: "set null" },
    ),
    billingAddressId: uuid("billing_address_id").references(
      () => addresses.id,
      { onDelete: "set null" },
    ),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", {
      length: 100,
    }),
    trackingNumber: varchar("tracking_number", { length: 120 }),
    trackingCarrier: varchar("tracking_carrier", { length: 80 }),
    placedAt: timestamp("placed_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("orders_order_number_key").on(t.orderNumber),
    uniqueIndex("orders_stripe_payment_intent_key").on(t.stripePaymentIntentId),
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    artworkId: uuid("artwork_id")
      .notNull()
      .references(() => artworks.id, { onDelete: "restrict" }),
    artworkTitle: varchar("artwork_title", { length: 300 }).notNull(),
    artistName: varchar("artist_name", { length: 200 }),
    printSize: printSizeEnum("print_size").notNull(),
    paperType: paperTypeEnum("paper_type").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    borderTreatment: varchar("border_treatment", { length: 40 })
      .notNull()
      .default("fit_pad"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);
