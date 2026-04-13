const db = require('../config/db');

// --- Cart Service: Business Logic ---
// Kommunikation mit dem Product Service erfolgt per HTTP (REST),
// da dieser in einer anderen Datenbank und einem anderen Container lebt.

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001';

// Produkt per HTTP beim Product Service validieren
async function validateProduct(productId) {
  const res = await fetch(`${PRODUCT_SERVICE_URL}/products/${productId}`);
  if (!res.ok) {
    const err = new Error(`Produkt ${productId} nicht gefunden`);
    err.status = 404;
    throw err;
  }
  return res.json();
}

// Warenkorb holen oder neu anlegen
async function getOrCreateCart(userId) {
  const existing = await db.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
  if (existing.rows[0]) return existing.rows[0];
  const { rows } = await db.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING *', [userId]);
  return rows[0];
}

// Artikel hinzufügen – validiert Produkt per HTTP beim Product Service
async function addItemToCart(userId, productId, quantity = 1) {
  // HTTP-Aufruf → Product Service (Netzwerk-Kommunikationspfad 1)
  await validateProduct(productId);

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

// Warenkorb mit Artikeln und Produktdetails abrufen.
// Produktdetails (Name, Preis) werden per HTTP beim Product Service abgefragt.
async function getCartWithItems(userId) {
  const cartResult = await db.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
  if (!cartResult.rows[0]) return null;

  const cart = cartResult.rows[0];
  const { rows: items } = await db.query(
    'SELECT product_id, quantity FROM cart_items WHERE cart_id = $1',
    [cart.id]
  );

  // Für jedes Item Produktdetails per HTTP laden (Netzwerk-Kommunikationspfad 1)
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const res = await fetch(`${PRODUCT_SERVICE_URL}/products/${item.product_id}`);
      const product = await res.json();
      return { ...item, name: product.name, price: product.price };
    })
  );

  return { ...cart, items: enrichedItems };
}

// Warenkorb leeren — wird per HTTP vom Order Service aufgerufen
async function clearCart(userId) {
  const { rows } = await db.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
  if (rows[0]) {
    await db.query('DELETE FROM cart_items WHERE cart_id = $1', [rows[0].id]);
  }
}

module.exports = { addItemToCart, getCartWithItems, clearCart };
