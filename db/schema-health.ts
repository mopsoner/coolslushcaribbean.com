import { getTableColumns, getTableName } from "drizzle-orm";
import { bookingMachines, bookings, machines, offerMachinePrices, offers, settings, syrups } from "../shared/schema";
import { pool } from "./index";
import { compareSchema, type SchemaAudit } from "./schema-audit";

type DatabaseClient = Pick<typeof pool, "query">;

const applicationTables = [machines, bookings, bookingMachines, offers, offerMachinePrices, syrups, settings];

export async function auditDatabaseSchema(client: DatabaseClient = pool): Promise<SchemaAudit> {
  const expected = new Map(applicationTables.map((table) => [
    getTableName(table),
    new Set(Object.values(getTableColumns(table)).map((column) => column.name)),
  ]));
  const result = await client.query<{ table_name: string; column_name: string }>(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
  `);
  const actual = new Map<string, Set<string>>();
  for (const row of result.rows) {
    const columns = actual.get(row.table_name) ?? new Set<string>();
    columns.add(row.column_name);
    actual.set(row.table_name, columns);
  }
  return compareSchema(expected, actual);
}

/** Repair booking migrations that may be absent from older deployments. */
export async function repairKnownSchemaDrift(client: DatabaseClient = pool): Promise<void> {
  await client.query("BEGIN");
  try {
    // Serialize startup repairs when a deployment briefly runs multiple instances.
    await client.query("SELECT pg_advisory_xact_lock(1935760711)");
    await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS access_token_hash text`);
    await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_swikly_event_id text`);
    await client.query(`
      UPDATE bookings
      SET access_token_hash = md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text)
      WHERE access_token_hash IS NULL
    `);
    await client.query(`ALTER TABLE bookings ALTER COLUMN access_token_hash SET NOT NULL`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS booking_machines (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        booking_id varchar NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        machine_id varchar NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
        machine_name text NOT NULL,
        quantity integer NOT NULL,
        start_at timestamp NOT NULL,
        end_at timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT booking_machines_booking_id_machine_id_unique UNIQUE (booking_id, machine_id),
        CONSTRAINT booking_machines_positive_quantity CHECK (quantity > 0),
        CONSTRAINT booking_machines_valid_period CHECK (start_at < end_at)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS booking_machines_availability_idx
      ON booking_machines (machine_id, start_at, end_at)
    `);
    await client.query(`
      INSERT INTO booking_machines (
        booking_id, machine_id, machine_name, quantity, start_at, end_at
      )
      SELECT
        b.id,
        line->>'machineId',
        min(line->>'machineName'),
        sum((line->>'quantity')::integer),
        date_trunc('day', b.start_date) + make_interval(hours => b.start_hour),
        date_trunc('day', b.end_date) + make_interval(hours => b.end_hour)
      FROM bookings b
      CROSS JOIN LATERAL json_array_elements(coalesce(b.booked_machines, '[]'::json)) AS line
      WHERE line->>'machineId' IS NOT NULL
      GROUP BY b.id, line->>'machineId', b.start_date, b.end_date, b.start_hour, b.end_hour
      ON CONFLICT (booking_id, machine_id) DO NOTHING
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function prepareDatabase(): Promise<void> {
  await repairKnownSchemaDrift();
  const audit = await auditDatabaseSchema();
  if (audit.missingTables.length || audit.missingColumns.length) {
    throw new Error(`Database schema audit failed: ${JSON.stringify(audit)}. Run npm run db:push.`);
  }
  console.info(`[database-audit] schema healthy (${applicationTables.length} tables checked)`);
}
