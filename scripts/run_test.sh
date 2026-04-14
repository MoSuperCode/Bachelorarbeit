#!/bin/bash
# run_test.sh
#
# Vollständiger Testlauf für eine Architektur (ein Aufruf pro Architektur):
#   1. Umgebung vorbereiten + Warm-up  (prepare-test.sh)
#   2. Alle drei Load-Skripte × 5 VU-Levels × 5 Wiederholungen
#   3. Ergebnisse in measurements.md schreiben (update_measurements.js)
#
# Verwendung:
#   ./scripts/run_test.sh monolith              # alle fehlenden Runs nachholen
#   ./scripts/run_test.sh microservices
#   ./scripts/run_test.sh monolith --force      # alle Runs neu starten (überschreibt vorhandene)

set -e

TARGET=${1:-}
FORCE=${2:-}

if [ -z "$TARGET" ] || { [ "$TARGET" != "monolith" ] && [ "$TARGET" != "microservices" ]; }; then
  echo "Verwendung: $0 monolith|microservices [--force]"
  exit 1
fi

SCRIPTS=("load_read" "load_write" "load_mixed")
VU_LEVELS=(10 25 50 100 200)
REPETITIONS=5
DURATION="60s"
RAW_DIR="results/raw"

command -v k6   &>/dev/null || { echo "ERROR: k6 nicht gefunden.  →  brew install k6";   exit 1; }
command -v node &>/dev/null || { echo "ERROR: node nicht gefunden. →  brew install node"; exit 1; }

mkdir -p "$RAW_DIR"

# Prüft ob alle 5 Runs einer Kombination bereits vorhanden sind
all_runs_done() {
  local arch=$1 script=$2 vus=$3
  for run in $(seq 1 "$REPETITIONS"); do
    [ -f "${RAW_DIR}/${arch}_${script}_${vus}vu_run${run}.json" ] || return 1
  done
  return 0
}

# ── 1. Umgebung vorbereiten + Warm-up ─────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  [$TARGET]  Schritt 1 / 3 – Umgebung + Warm-up"
echo "════════════════════════════════════════════════════════"
./scripts/prepare-test.sh "$TARGET"

# ── 2. Load Tests ──────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  [$TARGET]  Schritt 2 / 3 – Load Tests"
echo "════════════════════════════════════════════════════════"

for SCRIPT in "${SCRIPTS[@]}"; do
  for VUS in "${VU_LEVELS[@]}"; do
    echo ""
    echo "  Script: ${SCRIPT}.js  |  VUs: ${VUS}"
    echo "  ──────────────────────────────────────────────────"

    # --force: vorhandene Runs löschen und neu starten
    if [ "$FORCE" = "--force" ]; then
      rm -f "${RAW_DIR}/${TARGET}_${SCRIPT}_${VUS}vu_run"*.json
    fi

    # Alle 5 Runs bereits vorhanden → überspringen
    if all_runs_done "$TARGET" "$SCRIPT" "$VUS"; then
      echo "    ✓ bereits vorhanden – übersprungen"
      continue
    fi

    for RUN in $(seq 1 "$REPETITIONS"); do
      SUMMARY_FILE="${RAW_DIR}/${TARGET}_${SCRIPT}_${VUS}vu_run${RUN}.json"

      # Einzelner Run bereits vorhanden → überspringen
      if [ -f "$SUMMARY_FILE" ] && [ "$FORCE" != "--force" ]; then
        echo "    Run ${RUN}/${REPETITIONS} ... ✓ vorhanden"
        continue
      fi

      echo -n "    Run ${RUN}/${REPETITIONS} ... "
      # set -e deaktivieren damit k6-Threshold-Fehler (Exit 99) das Skript nicht beenden
      set +e
      k6 run \
        --vus      "$VUS"      \
        --duration "$DURATION" \
        --env      TARGET="$TARGET" \
        --env      VUS="$VUS"       \
        --env      DURATION="$DURATION" \
        --summary-export "$SUMMARY_FILE" \
        --quiet \
        "scripts/${SCRIPT}.js"
      K6_EXIT=$?
      set -e
      # Exit 99 = nur Threshold überschritten — Daten wurden trotzdem gespeichert.
      # Jeder andere Fehlercode bricht den Lauf ab.
      if [ $K6_EXIT -ne 0 ] && [ $K6_EXIT -ne 99 ]; then
        echo "FEHLER (exit $K6_EXIT)"
        exit $K6_EXIT
      fi
      [ $K6_EXIT -eq 99 ] && echo "done (Threshold überschritten)" || echo "done"

      # Recovery-Pause zwischen Runs — Server-Ressourcen (Connection Pool, GC) erholen lassen.
      # Nur wenn noch ein weiterer Run folgt.
      if [ "$RUN" -lt "$REPETITIONS" ] && [ ! -f "${RAW_DIR}/${TARGET}_${SCRIPT}_${VUS}vu_run$((RUN+1)).json" ]; then
        echo "    Warte 15s (Recovery) ..."
        sleep 15
      fi
    done
  done
done

# ── 3. measurements.md aktualisieren ──────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  [$TARGET]  Schritt 3 / 3 – measurements.md schreiben"
echo "════════════════════════════════════════════════════════"
node scripts/update_measurements.js "$TARGET"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  [$TARGET]  Fertig. Ergebnisse in results/measurements.md"
echo "════════════════════════════════════════════════════════"
