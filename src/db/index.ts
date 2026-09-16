import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __tarifwerkPool?: Pool;
};

function getPool(): Pool {
  if (globalForDb.__tarifwerkPool) return globalForDb.__tarifwerkPool;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for database operations");
  const instance = new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
    query_timeout: 12000,
  });
  // An idle connection error otherwise becomes an uncaught EventEmitter error.
  instance.on("error", () => console.error("[database] idle connection lost"));
  globalForDb.__tarifwerkPool = instance;
  return instance;
}

function createDatabase() {
  return drizzle(getPool());
}

type Database = ReturnType<typeof createDatabase>;
let database: Database | undefined;

/** Importing a page never opens a database connection, including during builds. */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    database ??= createDatabase();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export const pool = new Proxy({} as Pool, {
  get(_target, property) {
    const instance = getPool();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
