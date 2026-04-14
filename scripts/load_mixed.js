/**
 * load_mixed.js – Mixed Realistic Workload
 *
 * Simulates a realistic e-commerce traffic distribution:
 *   60% → Browse products (GET /products)
 *   30% → Add item to cart (POST /cart/:userId)
 *   10% → Full checkout (POST /cart/:userId + POST /orders)
 *
 * This ratio reflects typical e-commerce behaviour where most users
 * browse without purchasing.
 *
 * Usage:
 *   k6 run --vus 50 --duration 60s --env TARGET=monolith scripts/load_mixed.js
 *   k6 run --vus 50 --duration 60s --env TARGET=microservices scripts/load_mixed.js
 */

import http from 'k6/http';
import { sleep, check } from 'k6';

// Base URLs per architecture
const URLS = {
  monolith: {
    products: 'http://localhost:3000/api/products',
    cart:     (uid) => `http://localhost:3000/api/cart/${uid}`,
    orders:   'http://localhost:3000/api/orders',
  },
  microservices: {
    products: 'http://localhost:3001/products',
    cart:     (uid) => `http://localhost:3002/cart/${uid}`,
    orders:   'http://localhost:3003/orders',
  },
};

const target  = __ENV.TARGET || 'monolith';
const urls    = URLS[target];
const headers = { 'Content-Type': 'application/json' };

export const options = {
  vus:      __ENV.VUS      ? parseInt(__ENV.VUS)  : 10,
  duration: __ENV.DURATION || '60s',
  thresholds: {
    http_req_failed:          ['rate<0.05'],
    'http_req_duration':          ['p(95)<3000'],
  },
};

export default function () {
  const rand      = Math.random();
  const userId    = `vu${__VU}_iter${__ITER}`;
  const productId = ((__VU + __ITER) % 10) + 1;

  if (rand < 0.60) {
    // 60% – Browse products
    const res = http.get(urls.products);
    check(res, { 'products 200': (r) => r.status === 200 });
    sleep(1);

  } else if (rand < 0.90) {
    // 30% – Add to cart only
    const res = http.post(
      urls.cart(userId),
      JSON.stringify({ productId, quantity: 1 }),
      { headers }
    );
    check(res, { 'cart add 201': (r) => r.status === 201 });
    sleep(0.5);

  } else {
    // 10% – Full checkout: add to cart, then order
    const cartRes = http.post(
      urls.cart(userId),
      JSON.stringify({ productId, quantity: 2 }),
      { headers }
    );
    check(cartRes, { 'cart add 201': (r) => r.status === 201 });
    sleep(0.3);

    const orderRes = http.post(
      urls.orders,
      JSON.stringify({ userId }),
      { headers }
    );
    check(orderRes, { 'order placed 201': (r) => r.status === 201 });
    sleep(1);
  }
}
