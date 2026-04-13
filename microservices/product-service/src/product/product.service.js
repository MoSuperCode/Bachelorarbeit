const db = require('../config/db');

// --- Product Service: Business Logic ---

// Alle Produkte mit Pagination
async function getAllProducts({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const { rows } = await db.query(
    'SELECT * FROM products ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return rows;
}

// Einzelnes Produkt per ID
async function getProductById(id) {
  const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] || null;
}

// Lagerbestand prüfen — wird per HTTP vom Order Service aufgerufen
async function checkStock(productId, quantity) {
  const { rows } = await db.query('SELECT stock FROM products WHERE id = $1', [productId]);
  if (!rows[0]) return false;
  return rows[0].stock >= quantity;
}

// Lagerbestand reduzieren — wird per HTTP vom Order Service aufgerufen
async function decrementStock(productId, quantity) {
  const result = await db.query(
    'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id',
    [quantity, productId]
  );
  // Wenn kein Datensatz aktualisiert wurde, war der Stock nicht ausreichend
  if (result.rowCount === 0) {
    const err = new Error('Stock nicht ausreichend');
    err.status = 409;
    throw err;
  }
}

module.exports = { getAllProducts, getProductById, checkStock, decrementStock };
