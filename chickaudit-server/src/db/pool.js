const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway / Supabase require SSL in production
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
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
