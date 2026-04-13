/**
 * load_write.js – Write-Heavy Workload (Checkout Flow)
 *
 * Simulates the full checkout sequence per virtual user:
 *   1. POST /cart/:userId  – add a product to cart
 *   2. POST /orders        – place the order (reads cart, checks stock, clears cart)
 *
 * Each VU uses a unique userId (__VU + __ITER) to avoid cart state collisions.
 *
 * Usage:
 *   k6 run --vus 25 --duration 60s --env TARGET=monolith scripts/load_write.js
 *   k6 run --vus 25 --duration 60s --env TARGET=microservices scripts/load_write.js
 */

import http from 'k6/http';
import { sleep, check } from 'k6';

// Base URLs per architecture
const URLS = {
  monolith: {
    cart:   (uid) => `http://localhost:3000/api/cart/${uid}`,
    orders: 'http://localhost:3000/api/orders',
  },
  microservices: {
    cart:   (uid) => `http://localhost:3002/cart/${uid}`,
    orders: 'http://localhost:3003/orders',
  },
};

const target  = __ENV.TARGET || 'monolith';
const urls    = URLS[target];
const headers = { 'Content-Type': 'application/json' };

export const options = {
  vus:      __ENV.VUS      ? parseInt(__ENV.VUS)  : 10,
  duration: __ENV.DURATION || '60s',
  thresholds: {
    http_req_failed:          ['rate<0.05'],   // tolerate up to 5% errors (stock exhaustion)
    'http_req_duration{p(95)}': ['p(95)<5000'], // 95th percentile below 5s
  },
};

export default function () {
  // Unique user per VU iteration — prevents cart conflicts between VUs
  const userId    = `vu${__VU}_iter${__ITER}`;
  const productId = ((__VU + __ITER) % 10) + 1; // cycle through product IDs 1–10

  // Step 1: Add item to cart (quantity 2 satisfies the min-order-quantity rule)
  const cartRes = http.post(
    urls.cart(userId),
    JSON.stringify({ productId, quantity: 2 }),
    { headers }
  );
  check(cartRes, { 'cart add 201': (r) => r.status === 201 });
  sleep(0.3);

  // Step 2: Place order
  const orderRes = http.post(
    urls.orders,
    JSON.stringify({ userId }),
    { headers }
  );
  check(orderRes, { 'order placed 201': (r) => r.status === 201 });
  sleep(1);
}
