-- =============================================================
-- Datenbankschema für den E-Commerce Monolithen
-- Eine gemeinsame DB für alle drei Domänen (Shared Persistence)
-- =============================================================

-- Domäne: Product
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255)   NOT NULL,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL,
  stock       INTEGER        NOT NULL DEFAULT 0,
  created_at  TIMESTAMP      DEFAULT NOW()
);

-- Domäne: Cart
CREATE TABLE IF NOT EXISTS carts (
  id         SERIAL PRIMARY KEY,
  user_id    VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  cart_id    INTEGER REFERENCES carts(id)    ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity   INTEGER NOT NULL DEFAULT 1,
  UNIQUE (cart_id, product_id)  -- Verhindert doppelte Einträge pro Produkt
);

-- Domäne: Order
CREATE TABLE IF NOT EXISTS orders (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(255)   NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  status      VARCHAR(50)    DEFAULT 'confirmed',
  created_at  TIMESTAMP      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER        REFERENCES orders(id)   ON DELETE CASCADE,
  product_id INTEGER        REFERENCES products(id),
  quantity   INTEGER        NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL  -- Preis-Snapshot zum Bestellzeitpunkt
);

-- =============================================================
-- Seed: 10 Beispielprodukte für Tests
-- =============================================================
INSERT INTO products (name, description, price, stock) VALUES
  ('Laptop Pro 15',      'High-performance laptop with 16GB RAM',  1299.99, 50),
  ('Wireless Mouse',     'Ergonomic wireless mouse, 2.4GHz',          29.99, 200),
  ('USB-C Hub',          '7-in-1 USB-C hub with HDMI and SD card',    49.99, 150),
  ('Mechanical Keyboard','TKL mechanical keyboard, Cherry MX Red',    89.99, 100),
  ('4K Monitor',         '27-inch 4K IPS display, 144Hz',            449.99,  30),
  ('Webcam HD',          '1080p webcam with built-in microphone',     79.99,  80),
  ('Headphones',         'Noise-cancelling over-ear headphones',     199.99,  60),
  ('Desk Lamp',          'LED desk lamp with adjustable brightness',  39.99, 120),
  ('Mousepad XL',        'Extended mousepad, 900x400mm',              19.99, 300),
  ('Laptop Stand',       'Adjustable aluminium laptop stand',         34.99,  90);
