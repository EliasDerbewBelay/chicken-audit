require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./pool");

async function migrate() {
  // Create migrations tracking table if it doesn't exist
  await pool.query(`
    create table if not exists _migrations (
      id        serial primary key,
      filename  text not null unique,
      ran_at    timestamptz not null default now()
    )
  `);

  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const { rows } = await pool.query("select 1 from _migrations where filename = $1", [file]);
    if (rows.length > 0) {
      console.log(`  ⏭   ${file} (already ran)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    await pool.query("insert into _migrations (filename) values ($1)", [file]);
    console.log(`  ✅  ${file}`);
  }

  console.log("Migration complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
