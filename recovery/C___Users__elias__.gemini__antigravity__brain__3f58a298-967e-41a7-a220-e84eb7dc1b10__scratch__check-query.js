const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/projects/chicken-audit/chickaudit-server/.env' });

console.log("Database URL:", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
<truncated 2696 bytes>