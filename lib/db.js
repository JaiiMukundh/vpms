import oracledb from "oracledb";

let poolPromise;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export async function getPool() {
  if (!poolPromise) {
    poolPromise = oracledb.createPool({
      user: requireEnv("ORACLE_USER"),
      password: requireEnv("ORACLE_PASSWORD"),
      connectionString: requireEnv("ORACLE_CONNECTION_STRING"),
      poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
      poolMax: Number(process.env.ORACLE_POOL_MAX || 5),
      poolIncrement: Number(process.env.ORACLE_POOL_INCREMENT || 1),
    });
  }

  return poolPromise;
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
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    return await handler(connection);
  } finally {
    await connection.close();
  }
}

export async function query(sql, binds = {}, options = {}) {
  return withConnection(async (connection) => {
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options,
    });

    return {
      ...result,
      rows: normalizeRows(result.rows || []),
    };
  });
}

export async function execute(sql, binds = {}, options = {}) {
  return withConnection(async (connection) => {
    const result = await connection.execute(sql, binds, {
      autoCommit: true,
      ...options,
    });

    return result;
  });
}

