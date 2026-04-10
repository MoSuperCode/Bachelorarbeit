require('dotenv').config();
const app = require('./app');
const db  = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // DB-Verbindung testen bevor Traffic akzeptiert wird
    await db.query('SELECT 1');
    console.log('Datenbankverbindung hergestellt');

    app.listen(PORT, () => {
      console.log(`Monolith läuft auf Port ${PORT}`);
    });
  } catch (err) {
    console.error('Fehler beim Starten des Servers:', err);
    process.exit(1);
  }
}

start();
