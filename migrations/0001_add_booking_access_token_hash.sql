-- Fix PostgreSQL 42703 on booking reads after owner access tokens were added.
-- The statements are idempotent so they are also safe after the runtime repair.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "access_token_hash" text;

-- Old reservations never had a token returned to their owner. Give them a
-- random, unreachable hash rather than weakening access control with NULL.
UPDATE "bookings"
SET "access_token_hash" = md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text)
WHERE "access_token_hash" IS NULL;

ALTER TABLE "bookings" ALTER COLUMN "access_token_hash" SET NOT NULL;
