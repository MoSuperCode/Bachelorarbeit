const { Pool } = require('pg');

// Connection Pool ausschließlich für die Cart-Datenbank
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('Datenbankfehler:', err);
  process.exit(-1);
});

module.exports = pool;
