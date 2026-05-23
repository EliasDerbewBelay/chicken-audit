const { Pool } = require("pg");

const dbUrl = process.env.DATABASE_URL || "";
const isLocalhost = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
const isRenderInternal = dbUrl.includes("dpg-") && !dbUrl.includes("render.com");

const pool = new Pool({
  connectionString: dbUrl,
  // Render internal DBs don't support SSL. Render external DBs require it.
  ssl: (isLocalhost || isRenderInternal) ? false : { rejectUnauthorized: false },
});

// Fail fast if the DB is unreachable at startup
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌  Database connection failed:", err.message);
    process.exit(1);
  }
  release();
  console.log("✅  Database connected");
});

module.exports = pool;
