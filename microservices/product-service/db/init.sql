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

-- Seed: 10 Beispielprodukte
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
