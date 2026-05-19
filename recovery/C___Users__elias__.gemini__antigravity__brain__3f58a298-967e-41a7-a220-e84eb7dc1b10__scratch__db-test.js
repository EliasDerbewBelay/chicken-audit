const { Client } = require('pg');

const passwords = ['postgres', 'admin', '', 'root', 'password'];

async function testPasswords() {
  for (const pwd of passwords) {
    console.log(`Testing password: "${pwd}"`);
    const client = new Client({\
<truncated 503 bytes>