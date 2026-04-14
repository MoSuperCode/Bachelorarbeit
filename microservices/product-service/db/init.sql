-- =============================================================
-- Product Service – eigene isolierte Datenbank
-- Enthält ausschließlich die Product-Domäne
-- =============================================================

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255)   NOT NULL,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL,
  stock       INTEGER        NOT NULL DEFAULT 0,
  created_at  TIMESTAMP      DEFAULT NOW()
);

-- Seed: 10 Produkte mit hohem Stock für Performance-Tests
INSERT INTO products (name, description, price, stock) VALUES
  ('Laptop Pro 15',       'High-performance laptop with 16GB RAM',   1299.99, 999999),
  ('Wireless Mouse',      'Ergonomic wireless mouse, 2.4GHz',           29.99, 999999),
  ('USB-C Hub',           '7-in-1 USB-C hub with HDMI and SD card',     49.99, 999999),
  ('Mechanical Keyboard', 'TKL mechanical keyboard, Cherry MX Red',     89.99, 999999),
  ('4K Monitor',          '27-inch 4K IPS display, 144Hz',             449.99, 999999),
  ('Webcam HD',           '1080p webcam with built-in microphone',      79.99, 999999),
  ('Headphones',          'Noise-cancelling over-ear headphones',      199.99, 999999),
  ('Desk Lamp',           'LED desk lamp with adjustable brightness',   39.99, 999999),
  ('Mousepad XL',         'Extended mousepad, 900x400mm',               19.99, 999999),
  ('Laptop Stand',        'Adjustable aluminium laptop stand',          34.99, 999999);
