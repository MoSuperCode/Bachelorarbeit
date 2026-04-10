const db = require('../../config/db');

// --- Cart-Domäne: Service Layer ---

// Warenkorb für einen User holen oder neu anlegen
async function getOrCreateCart(userId) {
  const existing = await db.query(
    'SELECT * FROM carts WHERE user_id = $1',
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0];

  const { rows } = await db.query(
    'INSERT INTO carts (user_id) VALUES ($1) RETURNING *',
    [userId]
  );
  return rows[0];
}

// Artikel zum Warenkorb hinzufügen.
// Existiert das Produkt bereits, wird die Menge erhöht (Upsert).
async function addItemToCart(userId, productId, quantity = 1) {
  const cart = await getOrCreateCart(userId);

  const { rows } = await db.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + $3
     RETURNING *`,
    [cart.id, productId, quantity]
  );
  return rows[0];
}

// Warenkorb mit allen Artikeln und Produktdetails abrufen.
// Wird von order.service.js direkt aufgerufen (In-Process Call).
async function getCartWithItems(userId) {
  const cartResult = await db.query(
    'SELECT * FROM carts WHERE user_id = $1',
    [userId]
  );
  if (!cartResult.rows[0]) return null;

  const cart = cartResult.rows[0];

  const { rows: items } = await db.query(
    `SELECT ci.product_id, ci.quantity, p.name, p.price
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.cart_id = $1`,
    [cart.id]
  );

  return { ...cart, items };
}

// Warenkorb nach einer Bestellung leeren.
// Nimmt einen laufenden DB-Client entgegen, um Teil einer Transaktion zu sein.
// Wird von order.service.js direkt aufgerufen (In-Process Call).
async function clearCart(client, userId) {
  const { rows } = await client.query(
    'SELECT id FROM carts WHERE user_id = $1',
    [userId]
  );
  if (rows[0]) {
    await client.query(
      'DELETE FROM cart_items WHERE cart_id = $1',
      [rows[0].id]
    );
  }
}

module.exports = { addItemToCart, getCartWithItems, clearCart };
