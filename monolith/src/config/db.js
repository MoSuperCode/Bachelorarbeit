const { Pool } = require('pg');

// Gemeinsamer Connection Pool für den gesamten Monolithen.
// Alle drei Domänen (Product, Cart, Order) teilen sich diesen Pool.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Bei unerwartetem Verbindungsfehler Prozess beenden
pool.on('error', (err) => {
  console.error('Unerwarteter Datenbankfehler:', err);
  process.exit(-1);
});

module.exports = pool;
