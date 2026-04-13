/**
 * load_read.js – Read-Heavy Workload
 *
 * Simulates product browsing: repeated GET /products requests.
 * No write operations, no state changes.
 *
 * Usage:
 *   k6 run --vus 50 --duration 60s --env TARGET=monolith scripts/load_read.js
 *   k6 run --vus 50 --duration 60s --env TARGET=microservices scripts/load_read.js
 */

import http from 'k6/http';
import { sleep, check } from 'k6';

// Base URLs per architecture
const URLS = {
  monolith:      { products: 'http://localhost:3000/api/products' },
  microservices: { products: 'http://localhost:3001/products' },
};

const target = __ENV.TARGET || 'monolith';
const urls   = URLS[target];

export const options = {
  vus:      __ENV.VUS      ? parseInt(__ENV.VUS)  : 10,
  duration: __ENV.DURATION || '60s',
  thresholds: {
    http_req_failed:          ['rate<0.01'],   // error rate below 1%
    'http_req_duration{p(95)}': ['p(95)<2000'], // 95th percentile below 2s
  },
};

export default function () {
  const res = http.get(urls.products);

  check(res, {
    'status 200': (r) => r.status === 200,
  });

  sleep(1);
}
