const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runCheck() {
  try {
    const { rows } = await pool.query("select id, full_name, email, role,
<truncated 268 bytes>