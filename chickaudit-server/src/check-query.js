const { Pool } = require('pg');
require('dotenv').config();

console.log("Database URL:", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runCheck() {
  try {
    const tod
<truncated 2578 bytes>