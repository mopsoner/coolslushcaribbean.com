export type SchemaAudit = {
  missingTables: string[];
  missingColumns: string[];
};

export function compareSchema(
  expected: Map<string, Set<string>>,
  actual: Map<string, Set<string>>,
): SchemaAudit {
  const missingTables: string[] = [];
  const missingColumns: string[] = [];

  expected.forEach((columns, table) => {
    const actualColumns = actual.get(table);
    if (!actualColumns) {
      missingTables.push(table);
      return;
    }
    columns.forEach((column) => {
      if (!actualColumns.has(column)) missingColumns.push(`${table}.${column}`);
    });
  });

  return { missingTables: missingTables.sort(), missingColumns: missingColumns.sort() };
}
