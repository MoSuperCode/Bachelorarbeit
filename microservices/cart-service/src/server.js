require('dotenv').config();
const app = require('./app');
const db  = require('./config/db');

const PORT = process.env.PORT || 3002;

async function start() {
  try {
    await db.query('SELECT 1');
    console.log('[cart-service] Datenbankverbindung hergestellt');
    app.listen(PORT, () => console.log(`[cart-service] läuft auf Port ${PORT}`));
  } catch (err) {
    console.error('[cart-service] Startfehler:', err);
    process.exit(1);
  }
}

start();
