import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export async function getPool(): Promise<mysql.Pool> {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "fluxo_finance",
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 8000,
    enableKeepAlive: false,
  });

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query<T>(sql: string, values?: unknown[]): Promise<[T[], unknown]> {
  const poolConn = await getPool();
  return poolConn.query<mysql.RowDataPacket[]>(sql, values) as Promise<[T[], unknown]>;
}

export async function queryOne<T>(sql: string, values?: unknown[]): Promise<T | null> {
  const [rows] = await query<T>(sql, values);
  return rows[0] || null;
}

export async function execute(sql: string, values?: unknown[]): Promise<mysql.ResultSetHeader> {
  const poolConn = await getPool();
  const [result] = await poolConn.execute<mysql.ResultSetHeader>(sql, values);
  return result;
}
