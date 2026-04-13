-- =============================================================
-- Cart Service – eigene isolierte Datenbank
-- Enthält ausschließlich die Cart-Domäne
-- Kein FK zu products – andere DB, anderer Service
-- =============================================================

CREATE TABLE IF NOT EXISTS carts (
  id         SERIAL PRIMARY KEY,
  user_id    VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  cart_id    INTEGER      REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER      NOT NULL,  -- Nur ID, kein FK (Product lebt in anderer DB)
  quantity   INTEGER      NOT NULL DEFAULT 1,
  UNIQUE (cart_id, product_id)
);
