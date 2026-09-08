import { neon, Pool } from "@neondatabase/serverless";

let pool;
let sqlClient;

function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("Missing environment variable: DATABASE_URL");
  return value;
}

export function getPool() {
  if (!pool) pool = new Pool({ connectionString: requireDatabaseUrl() });
  return pool;
}

function getSqlClient() {
  if (!sqlClient) sqlClient = neon(requireDatabaseUrl(), { fullResults: true });
  return sqlClient;
}

function prepareQuery(sql, binds = {}) {
  const values = [];
  const text = sql.replace(/(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
    values.push(binds[name]);
    return `$${values.length}`;
  });
  return { text, values };
}

export function normalizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

export function normalizeRows(rows = []) {
  return rows.map(normalizeRow);
}

export async function withConnection(handler) {
  const client = await getPool().connect();
  client.execute = (sql, binds = {}) => client.query(prepareQuery(sql, binds));
  client.commit = () => client.query("COMMIT");

  try {
    return await handler(client);
  } finally {
    client.release();
  }
}

export async function withTransaction(handler) {
  return withConnection(async (client) => {
    await client.query("BEGIN");
    try {
      const result = await handler(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function query(sql, binds = {}) {
  const prepared = prepareQuery(sql, binds);
  const result = await getSqlClient().query(prepared.text, prepared.values, { fullResults: true });
  return { ...result, rows: normalizeRows(result.rows || []) };
}

export async function execute(sql, binds = {}) {
  const prepared = prepareQuery(sql, binds);
  return getSqlClient().query(prepared.text, prepared.values, { fullResults: true });
}

