const db = require('../../config/db');

// =============================================================
// In-Process Calls: Order-Domäne ruft direkt die Service-
// Funktionen der anderen Domänen auf — kein HTTP, kein Netzwerk.
// Dies ist das Kernmerkmal des Monolithen gegenüber Microservices.
// =============================================================
const { checkStock, decrementStock } = require('../product/product.service');
const { getCartWithItems, clearCart } = require('../cart/cart.service');

// --- Order-Domäne: Service Layer ---

// Bestellung aus dem Warenkorb des Users erstellen.
// Ablauf: Warenkorb lesen → Stock prüfen → Transaktion starten
//         → Order anlegen → Stock reduzieren → Warenkorb leeren
async function createOrder(userId) {

  // Schritt 1: Warenkorb lesen (In-Process Call → cart.service.js)
  const cart = await getCartWithItems(userId);

  if (!cart || cart.items.length === 0) {
    const err = new Error('Warenkorb ist leer oder existiert nicht');
    err.status = 400;
    throw err;
  }

  // Schritt 2: Lagerbestand für alle Artikel prüfen (In-Process Call → product.service.js)
  for (const item of cart.items) {
    const hasStock = await checkStock(item.product_id, item.quantity);
    if (!hasStock) {
      const err = new Error(`Nicht genug Lagerbestand für: ${item.name}`);
      err.status = 409;
      throw err;
    }
  }

  // Schritt 3: Gesamtpreis berechnen (Preis-Snapshot zum Bestellzeitpunkt)
  const totalPrice = cart.items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  // Schritt 4: Alles atomar in einer DB-Transaktion ausführen
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Order-Datensatz anlegen
    const { rows } = await client.query(
      'INSERT INTO orders (user_id, total_price) VALUES ($1, $2) RETURNING *',
      [userId, totalPrice.toFixed(2)]
    );
    const order = rows[0];

    // Für jedes Artikel: Order-Item anlegen + Stock reduzieren
    for (const item of cart.items) {
      // Preis-Snapshot speichern (verhindert Auswirkung späterer Preisänderungen)
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [order.id, item.product_id, item.quantity, item.price]
      );
      // Lagerbestand reduzieren (In-Process Call → product.service.js)
      await decrementStock(client, item.product_id, item.quantity);
    }

    // Warenkorb leeren (In-Process Call → cart.service.js)
    await clearCart(client, userId);

    await client.query('COMMIT');
    return { ...order, items: cart.items };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Alle Bestellungen eines Users abrufen
async function getOrdersByUser(userId) {
  const { rows } = await db.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

module.exports = { createOrder, getOrdersByUser };
