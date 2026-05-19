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
    full_name: "Farm Owner",       // ← change to real name
    email: "owner@chickaudit.com", // ← change to real email
    password: "change_me_123",     // ← change before running
    role: "owner",
  },
  {
    full_name: "Employee One",
    email: "employee1@chickaudit.com",
    password: "change_me_456",
    role: "employee",
  },
  {
    full_name: "Employee Two",
    email: "employee2@chickaudit.com",
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
         on conflict (email) do nothing`,
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
