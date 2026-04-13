require('dotenv').config();
const app = require('./app');
const db  = require('./config/db');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await db.query('SELECT 1');
    console.log('[product-service] Datenbankverbindung hergestellt');
    app.listen(PORT, () => console.log(`[product-service] läuft auf Port ${PORT}`));
  } catch (err) {
    console.error('[product-service] Startfehler:', err);
    process.exit(1);
  }
}

start();
