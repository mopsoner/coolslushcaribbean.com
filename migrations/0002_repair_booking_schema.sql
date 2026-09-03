-- Bring older deployments up to the booking schema used by the application.
-- Every statement is idempotent because this migration is also performed by
-- the startup repair for hosts that do not run migrations during deployment.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "last_swikly_event_id" text;

CREATE TABLE IF NOT EXISTS "booking_machines" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" varchar NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "machine_id" varchar NOT NULL REFERENCES "machines"("id") ON DELETE RESTRICT,
  "machine_name" text NOT NULL,
  "quantity" integer NOT NULL,
  "start_at" timestamp NOT NULL,
  "end_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "booking_machines_booking_id_machine_id_unique" UNIQUE("booking_id", "machine_id"),
  CONSTRAINT "booking_machines_positive_quantity" CHECK ("quantity" > 0),
  CONSTRAINT "booking_machines_valid_period" CHECK ("start_at" < "end_at")
);

CREATE INDEX IF NOT EXISTS "booking_machines_availability_idx"
  ON "booking_machines" ("machine_id", "start_at", "end_at");

INSERT INTO "booking_machines" (
  "booking_id", "machine_id", "machine_name", "quantity", "start_at", "end_at"
)
SELECT
  b."id",
  line->>'machineId',
  min(line->>'machineName'),
  sum((line->>'quantity')::integer),
  date_trunc('day', b."start_date") + make_interval(hours => b."start_hour"),
  date_trunc('day', b."end_date") + make_interval(hours => b."end_hour")
FROM "bookings" b
CROSS JOIN LATERAL json_array_elements(coalesce(b."booked_machines", '[]'::json)) AS line
WHERE line->>'machineId' IS NOT NULL
GROUP BY b."id", line->>'machineId', b."start_date", b."end_date", b."start_hour", b."end_hour"
ON CONFLICT ("booking_id", "machine_id") DO NOTHING;
