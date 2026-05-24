/**
 * Seed script — run once after migration to create your 3 users.
 *
 * Usage:
 *   node src/db/seed.js
 *
 * Edit the USERS array below before running.
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./pool");

const USERS = [
  {
    full_name: "Mr. Getnet Aycheh",       
    email: "getnet.aycheh@chickenaudit.com", 
    password: "change_me_123",    
    role: "owner",
  },
  {
    full_name: "Mr. Derbew Belay",
    email: "derbew.belay@chickenaudit.com",
    password: "change_me_456",
    role: "employee",
  },
  {
    full_name: "Aklilu Derbew",
    email: "aklilu.derbew@chickenaudit.com",
    password: "change_me_789",
    role: "employee",
  },
];

async function seed() {
  console.log("Seeding users...\n");
  for (const user of USERS) {
    const hash = await bcrypt.hash(user.password, 12);
    try {
      await pool.query(
        `insert into users (full_name, email, password, role)
         values ($1, $2, $3, $4)
         on conflict (email) do update
         set password = excluded.password,
             full_name = excluded.full_name,
             role = excluded.role`,
        [user.full_name, user.email.toLowerCase(), hash, user.role]
      );
      console.log(`  ✅  ${user.role.padEnd(8)} ${user.email}`);
    } catch (err) {
      console.error(`  ❌  ${user.email}:`, err.message);
    }
  }
  console.log("\nDone. You can now log in.");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
