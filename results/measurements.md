# Bachelor Thesis – Architecture Comparison Measurements

## Hardware & Runtime Environment

| Property | Value |
| --- | --- |
| Model | MacBook Air (M2, 2022) |
| Chip | Apple M2 (8 cores: 4 Performance, 4 Efficiency) |
| RAM | 8 GB |
| OS | macOS 14.6.1 |
| Docker Resources | 1 CPU / 1 GB RAM per container (defined in Compose files) |
| Node.js | 20 (Alpine) |
| PostgreSQL | 15 (Alpine) |

---

## SQ1 – Structural Complexity: Baseline Measurements

### Metric Definitions

| Metric | Definition |
| --- | --- |
| JS Files | Number of `.js` files in the `src/` directory |
| LOC | Total lines across all `.js` files in `src/` (including comments) |
| Deployable Units | Number of independently deployable containers |
| Network Communication Paths | Number of unique service-to-service HTTP connections |

### Monolith Baseline

**Git Commit:** `548e5e3169e546101e547bb27a47b4624c92ed0f`

| Metric | Value |
| --- | --- |
| JS Files | 13 |
| LOC | 413 |
| Deployable Units | 2 (App + DB) |
| Network Communication Paths | 0 |

Inter-domain communication: In-process calls (direct function calls within the same process)

### Microservices Baseline

**Git Commit:** `f1c5be7`

| Metric | Value |
| --- | --- |
| JS Files | 21 |
| LOC | 507 |
| Deployable Units | 6 (3 Services + 3 DBs) |
| Network Communication Paths | 3 |

Communication paths in detail:

1. `cart-service` → `product-service` (validate product on add, fetch product details on cart retrieval)
2. `order-service` → `product-service` (check stock, decrement stock)
3. `order-service` → `cart-service` (read cart, clear cart)

### SQ1 Comparison

| Metric | Monolith | Microservices | Difference |
| --- | --- | --- | --- |
| JS Files | 13 | 21 | +8 (+62%) |
| LOC | 413 | 507 | +94 (+23%) |
| Deployable Units | 2 | 6 | +4 (+200%) |
| Network Communication Paths | 0 | 3 | +3 |

---

## SQ2 – Maintainability Evaluation

### Methodology

Each scenario was implemented in both codebases independently. After measuring the impact via `git diff --stat`, all changes were reverted before the next scenario to ensure an identical baseline. The metrics recorded are:

- **Files changed:** exact count and paths from `git diff --stat`
- **Services/Modules affected:** which domain or microservice was touched
- **API change required:** whether the REST contract was modified
- **Redeployment scope:** which containers must be rebuilt and restarted

---

### S1 – New Validation Rule (Minimum Order Quantity of 2)

Change: Reject orders where the total item quantity across all cart items is below 2. Added after the empty-cart check inside `createOrder()`.

| Metric | Monolith | Microservices |
| --- | --- | --- |
| Files changed | 1 | 1 |
| Changed files | `monolith/src/modules/order/order.service.js` | `microservices/order-service/src/order/order.service.js` |
| Modules / Services affected | Order module | order-service |
| API change required | No | No |
| Redeployment scope | App container | order-service only |

**Finding:** No difference. Validation logic is localized to one function in both architectures. Microservices offer a smaller redeployment scope.

---

### S2 – Schema Extension (Add `category` Field to Product)

Change: Added `category VARCHAR(100)` column to the `products` table and updated seed data. Both implementations use `SELECT *`, so the field is returned automatically without query changes.

| Metric | Monolith | Microservices |
| --- | --- | --- |
| Files changed | 1 | 1 |
| Changed files | `monolith/db/init.sql` | `microservices/product-service/db/init.sql` |
| Modules / Services affected | Product (shared DB visible to all modules) | product-service only |
| API change required | No | No |
| Redeployment scope | App container + DB migration | product-service + product-db only |

**Finding:** Same file count. In the monolith, the shared database makes the schema change globally visible to all modules even though no other module's code requires updating. In microservices, the change is fully isolated within product-service's own database.

---

### S3 – Pricing Logic (Apply 10% Global Discount at Checkout)

Change: Applied a `0.10` discount multiplier to `totalPrice` inside `createOrder()` at the `reduce()` calculation.

| Metric | Monolith | Microservices |
| --- | --- | --- |
| Files changed | 1 | 1 |
| Changed files | `monolith/src/modules/order/order.service.js` | `microservices/order-service/src/order/order.service.js` |
| Modules / Services affected | Order module | order-service |
| API change required | No | No |
| Redeployment scope | App container | order-service only |

**Finding:** No difference in file count. The discount is applied to price data already fetched from cart-service, requiring no cross-service changes. If the discounted price also needed to be reflected in the cart view, microservices would require an additional change in cart-service (+1 service).

---

### S4 – API Change (Price Filter on Product Listing)

Change: Added `minPrice` and `maxPrice` query parameters to `GET /products`. The service layer builds a dynamic SQL `WHERE` clause; the controller layer parses the new query parameters.

| Metric | Monolith | Microservices |
| --- | --- | --- |
| Files changed | 2 | 2 |
| Changed files | `product.service.js`, `product.controller.js` (monolith/src/modules/product/) | `product.service.js`, `product.controller.js` (microservices/product-service/src/product/) |
| Modules / Services affected | Product module | product-service |
| API change required | Yes — new query params on `GET /api/products` | Yes — new query params on `GET /products` |
| Redeployment scope | App container | product-service only |

**Finding:** Identical file count and change pattern. Only product-service is restarted in the microservices case; cart-service and order-service remain running without interruption.

---

### S5 – Behavioral Change (Auto-delete Inactive Carts After 24h)

Change: Added `updated_at` column to `carts` table, a `deleteInactiveCarts()` function in the cart service, and a `setInterval` in server startup to run the cleanup every hour.

| Metric | Monolith | Microservices |
| --- | --- | --- |
| Files changed | 3 | 3 |
| Changed files | `db/init.sql`, `cart/cart.service.js`, `server.js` (monolith/) | `db/init.sql`, `cart/cart.service.js`, `server.js` (microservices/cart-service/) |
| Modules / Services affected | Cart module | cart-service only |
| API change required | No | No |
| Redeployment scope | App container + DB migration | cart-service + cart-db only |

**Finding:** Same file count and identical change pattern. In microservices, the change is completely contained within cart-service — product-service and order-service are not restarted.

---

### SQ2 Summary

| Scenario | Monolith Files | MS Files | Monolith Redeployment | MS Redeployment |
| --- | --- | --- | --- | --- |
| S1 – Validation rule | 1 | 1 | App | order-service |
| S2 – Schema extension | 1 | 1 | App + DB | product-service + DB |
| S3 – Pricing logic | 1 | 1 | App | order-service |
| S4 – API change | 2 | 2 | App | product-service |
| S5 – Behavioral change | 3 | 3 | App + DB | cart-service + DB |

**Key finding:** The number of files changed per scenario is identical across both architectures in all five cases. The structural difference lies exclusively in redeployment scope: the monolith always requires a full application restart, while microservices allow targeted redeployment of only the affected service — leaving all other services running without interruption.

---

## SQ3 – Performance Behaviour

### Test Configuration

| Parameter | Value |
| --- | --- |
| Tool | k6 |
| Duration per run | 60s |
| Repetitions per configuration | 5 |
| VU levels | 10, 25, 50, 100, 200 |
| Workload scripts | `load_read.js`, `load_write.js`, `load_mixed.js` |
| Metrics collected | p50 (ms), p95 (ms), throughput (req/s), error rate (%) |

### Workload Definitions

| Script | Traffic Pattern | Endpoints |
| --- | --- | --- |
| `load_read.js` | 100% GET /products | Monolith: `GET /api/products` — Microservices: `GET /products` (port 3001) |
| `load_write.js` | POST /cart → POST /orders per VU | Monolith: ports 3000 — Microservices: ports 3002 + 3003 |
| `load_mixed.js` | 60% browse / 30% add-to-cart / 10% checkout | All endpoints, realistic distribution |

---

### Read-Heavy Results (load_read.js)

*To be filled after running `./scripts/run_performance_suite.sh load_read`*

| VUs | Monolith p50 (ms) | Monolith p95 (ms) | Monolith RPS | MS p50 (ms) | MS p95 (ms) | MS RPS |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | — | — | — | — | — | — |
| 25 | — | — | — | — | — | — |
| 50 | — | — | — | — | — | — |
| 100 | — | — | — | — | — | — |
| 200 | — | — | — | — | — | — |

---

### Write-Heavy Results (load_write.js)

*To be filled after running `./scripts/run_performance_suite.sh load_write`*

| VUs | Monolith p50 (ms) | Monolith p95 (ms) | Monolith RPS | MS p50 (ms) | MS p95 (ms) | MS RPS |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | — | — | — | — | — | — |
| 25 | — | — | — | — | — | — |
| 50 | — | — | — | — | — | — |
| 100 | — | — | — | — | — | — |
| 200 | — | — | — | — | — | — |

---

### Mixed Workload Results (load_mixed.js)

*To be filled after running `./scripts/run_performance_suite.sh load_mixed`*

| VUs | Monolith p50 (ms) | Monolith p95 (ms) | Monolith RPS | MS p50 (ms) | MS p95 (ms) | MS RPS |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | — | — | — | — | — | — |
| 25 | — | — | — | — | — | — |
| 50 | — | — | — | — | — | — |
| 100 | — | — | — | — | — | — |
| 200 | — | — | — | — | — | — |

---

### SQ3 Error Rates

*To be filled after test runs*

| Script | VUs | Monolith Error Rate | MS Error Rate |
| --- | --- | --- | --- |
| load_read | 10–200 | — | — |
| load_write | 10–200 | — | — |
| load_mixed | 10–200 | — | — |

---

### SQ3 Key Finding

*To be filled after analysis of `results/sq3_results.csv`*
