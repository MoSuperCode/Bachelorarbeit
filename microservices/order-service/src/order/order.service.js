const db = require('../config/db');

// =============================================================
// REST-Kommunikation: Statt In-Process Calls (wie im Monolithen)
// kommuniziert der Order Service per HTTP mit den anderen Services.
// Jeder Pfeil unten ist ein Netzwerk-Request über Docker-Netzwerk.
//
// order-service → cart-service    (Warenkorb lesen, leeren)
// order-service → product-service (Stock prüfen, Stock reduzieren)
// =============================================================

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001';
const CART_SERVICE_URL    = process.env.CART_SERVICE_URL    || 'http://cart-service:3002';

// Hilfsfunktion: HTTP-Fehler als Error-Objekt werfen
async function httpRequest(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Bestellung aus dem Warenkorb des Users erstellen
async function createOrder(userId) {

  // Schritt 1: Warenkorb per HTTP vom Cart Service holen
  // → Netzwerk-Kommunikationspfad: order-service → cart-service
  const cart = await httpRequest(`${CART_SERVICE_URL}/cart/${userId}`);

  if (!cart || cart.items.length === 0) {
    const err = new Error('Warenkorb ist leer oder existiert nicht');
    err.status = 400;
    throw err;
  }

  // Schritt 2: Stock für alle Artikel per HTTP beim Product Service prüfen
  // → Netzwerk-Kommunikationspfad: order-service → product-service
  for (const item of cart.items) {
    const { available } = await httpRequest(
      `${PRODUCT_SERVICE_URL}/products/${item.product_id}/stock?quantity=${item.quantity}`
    );
    if (!available) {
      const err = new Error(`Nicht genug Lagerbestand für: ${item.name}`);
      err.status = 409;
      throw err;
    }
  }

  // Schritt 3: Gesamtpreis berechnen (Preis-Snapshot aus Cart-Antwort)
  const totalPrice = cart.items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  // Schritt 4: Order in eigener DB speichern (lokale Transaktion)
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'INSERT INTO orders (user_id, total_price) VALUES ($1, $2) RETURNING *',
      [userId, totalPrice.toFixed(2)]
    );
    const order = rows[0];

    for (const item of cart.items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [order.id, item.product_id, item.quantity, item.price]
      );
    }

    await client.query('COMMIT');

    // Schritt 5: Stock reduzieren per HTTP beim Product Service
    // → Netzwerk-Kommunikationspfad: order-service → product-service
    for (const item of cart.items) {
      await httpRequest(`${PRODUCT_SERVICE_URL}/products/${item.product_id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: item.quantity }),
      });
    }

    // Schritt 6: Warenkorb leeren per HTTP beim Cart Service
    // → Netzwerk-Kommunikationspfad: order-service → cart-service
    await httpRequest(`${CART_SERVICE_URL}/cart/${userId}/items`, { method: 'DELETE' });

    return { ...order, items: cart.items };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Alle Bestellungen eines Users
async function getOrdersByUser(userId) {
  const { rows } = await db.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

module.exports = { createOrder, getOrdersByUser };
