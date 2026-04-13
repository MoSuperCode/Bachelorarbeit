require('dotenv').config();
const app = require('./app');
const db  = require('./config/db');

const PORT = process.env.PORT || 3003;

async function start() {
  try {
    await db.query('SELECT 1');
    console.log('[order-service] Datenbankverbindung hergestellt');
    app.listen(PORT, () => console.log(`[order-service] läuft auf Port ${PORT}`));
  } catch (err) {
    console.error('[order-service] Startfehler:', err);
    process.exit(1);
  }
}

start();
