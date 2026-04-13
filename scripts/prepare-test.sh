#!/bin/bash
# prepare-test.sh
#
# Bereitet die Testumgebung vor einem Testlauf vor.
# Stellt einen sauberen Zustand sicher: alle Container + Volumes werden
# gelöscht und neu gestartet, damit keine Daten aus vorherigen Läufen
# die Messergebnisse verfälschen.
#
# Verwendung:
#   ./scripts/prepare-test.sh monolith
#   ./scripts/prepare-test.sh microservices

set -e  # Bei Fehler sofort abbrechen

TARGET=${1:-monolith}

# Ports und Healthcheck-URLs je nach Architektur
if [ "$TARGET" = "monolith" ]; then
  COMPOSE_FILE="docker-compose.yml"
  HEALTH_URLS=("http://localhost:3000/health")
elif [ "$TARGET" = "microservices" ]; then
  COMPOSE_FILE="docker-compose.microservices.yml"
  HEALTH_URLS=(
    "http://localhost:3001/health"
    "http://localhost:3002/health"
    "http://localhost:3003/health"
  )
else
  echo "Ungültiges Ziel: $TARGET. Verwende 'monolith' oder 'microservices'."
  exit 1
fi

echo "==> [$TARGET] Stoppe laufende Container und lösche Volumes..."
docker compose -f "$COMPOSE_FILE" down -v --remove-orphans

echo "==> [$TARGET] Baue Images und starte Container..."
docker compose -f "$COMPOSE_FILE" up --build -d

echo "==> [$TARGET] Warte auf Health Checks..."
for URL in "${HEALTH_URLS[@]}"; do
  echo -n "    Warte auf $URL "
  until curl -sf "$URL" > /dev/null 2>&1; do
    echo -n "."
    sleep 2
  done
  echo " OK"
done

echo ""
echo "==> [$TARGET] Umgebung bereit. Starte Warm-up..."
k6 run --env TARGET="$TARGET" scripts/warmup.js

echo ""
echo "==> [$TARGET] Warm-up abgeschlossen. Testlauf kann beginnen."
