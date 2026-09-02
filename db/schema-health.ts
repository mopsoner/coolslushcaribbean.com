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

/**
 * Repairs the production drift that caused every booking SELECT to fail with
 * PostgreSQL 42703 after access_token_hash was introduced. Existing bookings
 * receive an unguessable, non-exported placeholder; newly created bookings
 * continue to receive the hash of the token returned to their owner.
 */
export async function repairKnownSchemaDrift(client: DatabaseClient = pool): Promise<void> {
  await client.query("BEGIN");
  try {
    await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS access_token_hash text`);
    await client.query(`
      UPDATE bookings
      SET access_token_hash = md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text)
      WHERE access_token_hash IS NULL
    `);
    await client.query(`ALTER TABLE bookings ALTER COLUMN access_token_hash SET NOT NULL`);
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
