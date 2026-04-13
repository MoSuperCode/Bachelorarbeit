-- =============================================================
-- Order Service – eigene isolierte Datenbank
-- Enthält ausschließlich die Order-Domäne
-- Kein FK zu products/carts – andere DBs, andere Services
-- =============================================================

CREATE TABLE IF NOT EXISTS orders (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(255)   NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  status      VARCHAR(50)    DEFAULT 'confirmed',
  created_at  TIMESTAMP      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER        REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER        NOT NULL,             -- Nur ID, kein FK
  quantity   INTEGER        NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL              -- Preis-Snapshot zum Bestellzeitpunkt
);
