const db = require('../../config/db');

// --- Produkt-Domäne: Service Layer ---
// Diese Funktionen kapseln die gesamte Business-Logik für Produkte.
// Sie werden sowohl von product.controller.js als auch direkt von
// order.service.js aufgerufen (In-Process Call).

// Alle Produkte abrufen (mit Pagination)
async function getAllProducts({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const { rows } = await db.query(
    'SELECT * FROM products ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return rows;
}

// Ein einzelnes Produkt anhand der ID abrufen
async function getProductById(id) {
  const { rows } = await db.query(
    'SELECT * FROM products WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

// Prüfen ob ausreichend Lagerbestand vorhanden ist.
// Wird von order.service.js direkt aufgerufen (In-Process Call).
async function checkStock(productId, quantity) {
  const { rows } = await db.query(
    'SELECT stock FROM products WHERE id = $1',
    [productId]
  );
  if (!rows[0]) return false;
  return rows[0].stock >= quantity;
}

// Lagerbestand reduzieren nach einer Bestellung.
// Nimmt einen laufenden DB-Client entgegen, um Teil einer Transaktion zu sein.
// Wird von order.service.js direkt aufgerufen (In-Process Call).
async function decrementStock(client, productId, quantity) {
  await client.query(
    'UPDATE products SET stock = stock - $1 WHERE id = $2',
    [quantity, productId]
  );
}

module.exports = { getAllProducts, getProductById, checkStock, decrementStock };
