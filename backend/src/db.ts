import mysql from "mysql2/promise";

function validateEnv() {
  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

let pool: mysql.Pool | null = null;

export async function getPool(): Promise<mysql.Pool> {
  if (pool) return pool;

  validateEnv();

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: false,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Test the connection on first pool creation
  try {
    const conn = await pool.getConnection();
    console.log("[DB] Connected to MySQL:", process.env.DB_HOST, "/", process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error("[DB] Failed to connect:", err);
    pool = null;
    throw err;
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query<T>(sql: string, values?: unknown[]): Promise<[T[], unknown]> {
  try {
    const poolConn = await getPool();
    return poolConn.query<mysql.RowDataPacket[]>(sql, values) as Promise<[T[], unknown]>;
  } catch (err) {
    console.error("[DB] Query error:", sql.substring(0, 80), err);
    throw err;
  }
}

export async function queryOne<T>(sql: string, values?: unknown[]): Promise<T | null> {
  const [rows] = await query<T>(sql, values);
  return rows[0] || null;
}

export async function execute(sql: string, values?: unknown[]): Promise<mysql.ResultSetHeader> {
  try {
    const poolConn = await getPool();
    const [result] = await poolConn.execute<mysql.ResultSetHeader>(sql, values);
    return result;
  } catch (err) {
    console.error("[DB] Execute error:", sql.substring(0, 80), err);
    throw err;
  }
}
