# Hardware & Runtime Environment

| Eigenschaft | Wert |
|-------------|------|
| **Modell** | MacBook Air (M2, 2022) |
| **Chip** | Apple M2 (8 Kerne: 4 Performance, 4 Efficiency) |
| **RAM** | 8 GB |
| **OS** | macOS 14.6.1 |
| **Docker-Ressourcen** | 1 CPU / 1 GB RAM pro Container (definiert in Compose-Dateien) |
| **Node.js** | 20 (Alpine) |
| **PostgreSQL** | 15 (Alpine) |

---

# SQ1 – Strukturelle Komplexität: Baseline-Messungen

## Metrik-Definitionen

| Metrik | Definition |
|--------|-----------|
| **JS-Dateien** | Anzahl `.js`-Dateien im `src/`-Verzeichnis |
| **LOC** | Gesamte Zeilen aller `.js`-Dateien in `src/` (inkl. Kommentare) |
| **Deployable Units** | Anzahl eigenständig deploybare Container |
| **Netzwerk-Kommunikationspfade** | Anzahl eindeutiger Service-zu-Service HTTP-Verbindungen |

---

## Monolith

**Git-Commit:** `548e5e3169e546101e547bb27a47b4624c92ed0f`

| Metrik | Wert |
|--------|------|
| JS-Dateien | 13 |
| LOC | 413 |
| Deployable Units | 2 (App + DB) |
| Netzwerk-Kommunikationspfade | 0 |

**Kommunikation zwischen Domänen:** In-Process Calls (direkte Funktionsaufrufe im selben Prozess)

---

## Microservices

**Git-Commit:** `f1c5be7`

| Metrik | Wert |
|--------|------|
| JS-Dateien | 21 |
| LOC | 507 |
| Deployable Units | 6 (3 Services + 3 DBs) |
| Netzwerk-Kommunikationspfade | 3 |

**Kommunikationspfade im Detail:**
1. `cart-service` → `product-service` (Produkt validieren beim Hinzufügen, Produktdetails beim Abrufen)
2. `order-service` → `product-service` (Stock prüfen, Stock reduzieren)
3. `order-service` → `cart-service` (Warenkorb lesen, Warenkorb leeren)

---

## Vergleich

| Metrik | Monolith | Microservices | Differenz |
|--------|----------|---------------|-----------|
| JS-Dateien | 13 | 21 | +8 (+62 %) |
| LOC | 413 | 507 | +94 (+23 %) |
| Deployable Units | 2 | 6 | +4 (+200 %) |
| Netzwerk-Kommunikationspfade | 0 | 3 | +3 |
