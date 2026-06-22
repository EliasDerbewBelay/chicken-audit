const { Pool } = require("pg");

function isLocalDatabase(url) {
  return /localhost|127\.0\.0\.1/.test(url);
}

function isSupabaseDatabase(url) {
  return /supabase\.co|supabase\.com/.test(url);
}

function isSupabasePooler(url) {
  return /pooler\.supabase\.com/.test(url) || /:6543\//.test(url);
}

function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  let url = rawUrl.trim();

  if (isSupabaseDatabase(url) && !/[?&]sslmode=/.test(url)) {
    url += url.includes("?") ? "&" : "?";
    url += "uselibpqcompat=true&sslmode=require";
  }

  return url;
}

function resolveSsl(dbUrl) {
  if (isLocalDatabase(dbUrl)) return false;

  // Render internal DBs don't support SSL. Render external DBs require it.
  const isRenderInternal = dbUrl.includes("dpg-") && !dbUrl.includes("render.com");
  if (isRenderInternal) return false;

  return { rejectUnauthorized: false };
}

function buildPoolConfig() {
  const dbUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || "");

  const config = {
    connectionString: dbUrl,
    ssl: resolveSsl(dbUrl),
    max: Number.parseInt(process.env.DB_POOL_MAX || "10", 10),
    idleTimeoutMillis: Number.parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10),
    connectionTimeoutMillis: Number.parseInt(
      process.env.DB_CONNECT_TIMEOUT_MS || "10000",
      10,
    ),
  };

  // Supabase transaction pooler (PgBouncer) does not support prepared statements.
  if (isSupabasePooler(dbUrl)) {
    config.allowExitOnIdle = true;
  }

  return config;
}

const pool = new Pool(buildPoolConfig());

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});

async function verifyConnection() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

module.exports = pool;
module.exports.verifyConnection = verifyConnection;
