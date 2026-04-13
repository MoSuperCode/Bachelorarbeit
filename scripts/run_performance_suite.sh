#!/bin/bash
# run_performance_suite.sh
#
# Automates the full SQ3 performance evaluation.
# For each architecture × script × VU level: runs prepare-test.sh once,
# then executes the k6 script 5 times and writes results to a CSV.
#
# Usage:
#   ./scripts/run_performance_suite.sh                    # all scripts
#   ./scripts/run_performance_suite.sh load_read          # single script
#
# Output:
#   results/raw/<arch>_<script>_<vu>vu_run<n>.json   – per-run k6 summary
#   results/sq3_results.csv                           – aggregated CSV

set -e

# ── Configuration ────────────────────────────────────────────────────────────

ARCHITECTURES=("monolith" "microservices")
VU_LEVELS=(10 25 50 100 200)
DURATION="60s"
REPETITIONS=5
SCRIPT_ARG="${1:-}"  # optional: pass a single script name to run only that one

ALL_SCRIPTS=("load_read" "load_write" "load_mixed")
if [ -n "$SCRIPT_ARG" ]; then
  SCRIPTS=("$SCRIPT_ARG")
else
  SCRIPTS=("${ALL_SCRIPTS[@]}")
fi

RAW_DIR="results/raw"
CSV_FILE="results/sq3_results.csv"

# ── Setup ────────────────────────────────────────────────────────────────────

mkdir -p "$RAW_DIR"

# Write CSV header if file does not exist yet
if [ ! -f "$CSV_FILE" ]; then
  echo "architecture,script,vus,run,p50_ms,p95_ms,rps,error_rate" > "$CSV_FILE"
fi

# Check dependencies
command -v k6  &>/dev/null || { echo "ERROR: k6 not found. Install with: brew install k6"; exit 1; }
command -v jq  &>/dev/null || { echo "ERROR: jq not found. Install with: brew install jq";  exit 1; }

# ── Main Loop ────────────────────────────────────────────────────────────────

for ARCH in "${ARCHITECTURES[@]}"; do
  for SCRIPT in "${SCRIPTS[@]}"; do
    for VUS in "${VU_LEVELS[@]}"; do

      echo ""
      echo "════════════════════════════════════════════════════════"
      echo " Architecture : $ARCH"
      echo " Script       : $SCRIPT"
      echo " VUs          : $VUS"
      echo "════════════════════════════════════════════════════════"

      # Fresh environment before each VU level
      echo "--> Preparing clean environment..."
      ./scripts/prepare-test.sh "$ARCH"

      for RUN in $(seq 1 "$REPETITIONS"); do
        echo "--> Run $RUN / $REPETITIONS"

        SUMMARY_FILE="${RAW_DIR}/${ARCH}_${SCRIPT}_${VUS}vu_run${RUN}.json"

        # Run k6 — pass VUs and duration as env vars so scripts can also be run standalone
        k6 run \
          --vus       "$VUS" \
          --duration  "$DURATION" \
          --env       TARGET="$ARCH" \
          --env       VUS="$VUS" \
          --env       DURATION="$DURATION" \
          --summary-export "$SUMMARY_FILE" \
          --quiet \
          "scripts/${SCRIPT}.js"

        # Parse summary JSON and append row to CSV
        P50=$(jq -r '.metrics.http_req_duration["p(50)"] // "N/A"'   "$SUMMARY_FILE")
        P95=$(jq -r '.metrics.http_req_duration["p(95)"] // "N/A"'   "$SUMMARY_FILE")
        RPS=$(jq -r '.metrics.http_reqs.rate              // "N/A"'   "$SUMMARY_FILE")
        ERR=$(jq -r '.metrics.http_req_failed.rate        // "N/A"'   "$SUMMARY_FILE")

        echo "$ARCH,$SCRIPT,$VUS,$RUN,$P50,$P95,$RPS,$ERR" >> "$CSV_FILE"
        echo "    p50=${P50}ms  p95=${P95}ms  rps=${RPS}  err=${ERR}"
      done

    done
  done
done

echo ""
echo "════════════════════════════════════════════════════════"
echo " Suite complete. Results written to: $CSV_FILE"
echo "════════════════════════════════════════════════════════"
