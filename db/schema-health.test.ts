import assert from "node:assert/strict";
import test from "node:test";
import { compareSchema } from "./schema-audit";

test("schema audit reports missing tables and columns", () => {
  const expected = new Map([
    ["bookings", new Set(["id", "access_token_hash"])],
    ["machines", new Set(["id"])],
  ]);
  const actual = new Map([["bookings", new Set(["id"])]]);

  assert.deepEqual(compareSchema(expected, actual), {
    missingTables: ["machines"],
    missingColumns: ["bookings.access_token_hash"],
  });
});

test("schema audit accepts a matching schema", () => {
  const schema = new Map([["bookings", new Set(["id", "access_token_hash"])]]);
  assert.deepEqual(compareSchema(schema, schema), { missingTables: [], missingColumns: [] });
});
