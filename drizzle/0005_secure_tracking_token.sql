ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_token" text;
UPDATE "orders" SET "tracking_token" = md5(random()::text || clock_timestamp()::text || "id"::text) WHERE "tracking_token" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "tracking_token" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_tracking_token_unique" ON "orders" USING btree ("tracking_token");
