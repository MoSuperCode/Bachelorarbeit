/**
 * warmup.js – k6 Warm-up Skript
 *
 * Ziel: Node.js JIT-Optimierung triggern, bevor der eigentliche Lasttest startet.
 * Sendet einfache GET-Requests an den Produkt-Endpunkt beider Architekturen.
 *
 * Verwendung:
 *   Monolith:       k6 run --env TARGET=monolith scripts/warmup.js
 *   Microservices:  k6 run --env TARGET=microservices scripts/warmup.js
 */

import http from 'k6/http';
import { sleep } from 'k6';

// Endpunkt je nach Ziel-Architektur
const TARGETS = {
  monolith:      'http://localhost:3000/api/products',
  microservices: 'http://localhost:3001/products',
};

const target = __ENV.TARGET || 'monolith';
const url = TARGETS[target];

export const options = {
  // 30 Sekunden bei 10 VUs – reicht um JIT zu warmen
  vus:      10,
  duration: '30s',
};

export default function () {
  http.get(url);
  sleep(0.1);
}
