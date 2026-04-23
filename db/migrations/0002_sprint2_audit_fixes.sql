CREATE UNIQUE INDEX IF NOT EXISTS "orders_stripe_payment_intent_key" ON "orders" ("stripe_payment_intent_id") WHERE "stripe_payment_intent_id" IS NOT NULL;
