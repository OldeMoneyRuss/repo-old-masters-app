ALTER TYPE "public"."order_status" ADD VALUE 'quality_check' BEFORE 'shipped';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_carrier" varchar(80);
