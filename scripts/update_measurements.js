#!/usr/bin/env node
/**
 * update_measurements.js
 *
 * Liest die k6-Rohdaten (--summary-export JSON) aus results/raw/,
 * mittelt die 5 Wiederholungen pro Konfiguration und schreibt die
 * Werte in die richtigen Spalten der Tabellen in results/measurements.md.
 *
 * Beim erneuten Aufruf werden die Spalten der angegebenen Architektur
 * überschrieben – die jeweils andere Architektur bleibt unberührt.
 *
 * Verwendung (wird von run_test.sh aufgerufen):
 *   node scripts/update_measurements.js monolith
 *   node scripts/update_measurements.js microservices
 */

const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const TARGET      = process.argv[2];
const RAW_DIR     = path.join(__dirname, '..', 'results', 'raw');
const MD_FILE     = path.join(__dirname, '..', 'results', 'measurements.md');
const SCRIPTS     = ['load_read', 'load_write', 'load_mixed'];
const VU_LEVELS   = [10, 25, 50, 100, 200];
const REPETITIONS = 5;

if (!TARGET || !['monolith', 'microservices'].includes(TARGET)) {
  console.error('Verwendung: node update_measurements.js monolith|microservices');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mittelt ein Array von Zahlen; gibt '—' zurück wenn keine Daten vorhanden. */
function average(values) {
  const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (!valid.length) return '—';
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
}

/**
 * Liest eine k6 --summary-export JSON-Datei und extrahiert die Metriken.
 * Unterstützt sowohl das flache als auch das verschachtelte k6-Format.
 */
function readSummary(file) {
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const m    = data.metrics || {};

    // k6 summary-export: Werte können direkt auf dem Metric-Objekt liegen
    // oder in einem verschachtelten "values"-Objekt (ältere vs. neuere k6-Versionen).
    function get(metric, key) {
      if (!m[metric]) return null;
      // Flaches Format: m.http_req_duration["p(95)"]
      if (m[metric][key] !== undefined) return m[metric][key];
      // Verschachteltes Format: m.http_req_duration.values["p(95)"]
      if (m[metric].values && m[metric].values[key] !== undefined)
        return m[metric].values[key];
      return null;
    }

    return {
      // p50 → k6 exportiert den Median als "med", nicht als "p(50)"
      p50: get('http_req_duration', 'med') ?? get('http_req_duration', 'p(50)'),
      p95: get('http_req_duration', 'p(95)'),
      rps: get('http_reqs', 'rate'),
      // http_req_failed: "value" enthält die Rate (0..1), alternativ "rate"
      err: get('http_req_failed', 'value') ?? get('http_req_failed', 'rate'),
    };
  } catch (e) {
    console.warn(`  Warnung: Konnte ${file} nicht lesen: ${e.message}`);
    return null;
  }
}

/**
 * Liest alle Wiederholungen für eine Kombination (arch, script, vus)
 * und gibt gemittelte Metriken zurück.
 */
function getAveragedMetrics(arch, script, vus) {
  const p50s = [], p95s = [], rpss = [], errs = [];

  for (let run = 1; run <= REPETITIONS; run++) {
    const file    = path.join(RAW_DIR, `${arch}_${script}_${vus}vu_run${run}.json`);
    const summary = readSummary(file);
    if (!summary) continue;
    p50s.push(summary.p50);
    p95s.push(summary.p95);
    rpss.push(summary.rps);
    errs.push(summary.err);
  }

  return {
    p50: average(p50s),
    p95: average(p95s),
    rps: average(rpss),
    // Fehlerrate als Prozentzahl mit 2 Dezimalstellen
    err: errs.filter(v => v !== null && !isNaN(v)).length
      ? (errs.filter(v => v !== null && !isNaN(v))
             .reduce((a, b) => a + b, 0) /
         errs.filter(v => v !== null && !isNaN(v)).length * 100
        ).toFixed(2) + '%'
      : '—',
  };
}

// ── Markdown-Tabellen-Update ──────────────────────────────────────────────────

/**
 * Ersetzt die Werte einer Markdown-Tabellenzeile an den angegebenen
 * Spaltenindizes (0-basiert, ohne die leeren Rand-Elemente nach split('|')).
 *
 * Beispiel: "| 10 | — | — | — | — | — | — |"
 *   split('|') → ['', ' 10 ', ' — ', ' — ', ' — ', ' — ', ' — ', ' — ', '']
 *   Spaltenindex 1 = VUs, 2 = Monolith p50, 3 = Monolith p95, ...
 */
function replaceColumns(row, updates) {
  const parts = row.split('|');
  for (const [idx, value] of Object.entries(updates)) {
    parts[parseInt(idx)] = ` ${value} `;
  }
  return parts.join('|');
}

/**
 * Sucht die Ergebnistabelle eines Load-Skripts in measurements.md und
 * überschreibt die Spalten der aktuellen Architektur.
 *
 * Tabellenheader:
 *   | VUs | Monolith p50 | Monolith p95 | Monolith RPS | MS p50 | MS p95 | MS RPS |
 *   col:      1              2              3              4        5        6        7
 *             ↑ (split-Index, 0 = leer vor erstem |)
 *
 * Monolith:      cols 2, 3, 4
 * Microservices: cols 5, 6, 7
 */
function updateResultsTable(lines, script) {
  const SECTION_MARKERS = {
    load_read:  '### Read-Heavy Results',
    load_write: '### Write-Heavy Results',
    load_mixed: '### Mixed Workload Results',
  };

  const marker = SECTION_MARKERS[script];
  // Monolith belegt Spalten 2/3/4, Microservices 5/6/7
  const colBase = TARGET === 'monolith' ? 2 : 5;

  // Tabellenheader-Zeile finden
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(marker)) {
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        if (lines[j].startsWith('| VUs |')) { headerIdx = j; break; }
      }
      break;
    }
  }

  if (headerIdx === -1) {
    console.warn(`  Warnung: Tabelle für "${marker}" nicht gefunden.`);
    return;
  }

  // Datenzeilen aktualisieren (überspringt Header + Trennzeile)
  for (let vuIdx = 0; vuIdx < VU_LEVELS.length; vuIdx++) {
    const vus     = VU_LEVELS[vuIdx];
    const rowIdx  = headerIdx + 2 + vuIdx;
    if (!lines[rowIdx] || !lines[rowIdx].startsWith('|')) break;

    const m = getAveragedMetrics(TARGET, script, vus);

    lines[rowIdx] = replaceColumns(lines[rowIdx], {
      [colBase]:     m.p50,
      [colBase + 1]: m.p95,
      [colBase + 2]: m.rps,
    });

    console.log(`  ${script} | ${vus} VUs → p50=${m.p50}ms  p95=${m.p95}ms  rps=${m.rps}`);
  }
}

/**
 * Aktualisiert die SQ3-Fehlerrate-Tabelle.
 *
 * Header: | Script | VUs | Monolith Error Rate | MS Error Rate |
 * cols:       1       2           3                    4
 *
 * Monolith: col 3 — Microservices: col 4
 */
function updateErrorTable(lines) {
  const errCol = TARGET === 'monolith' ? 3 : 4;

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('### SQ3 Error Rates')) {
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].startsWith('| Script |')) { headerIdx = j; break; }
      }
      break;
    }
  }

  if (headerIdx === -1) {
    console.warn('  Warnung: SQ3-Fehlerratentabelle nicht gefunden.');
    return;
  }

  for (let sIdx = 0; sIdx < SCRIPTS.length; sIdx++) {
    const script = SCRIPTS[sIdx];
    const rowIdx = headerIdx + 2 + sIdx;
    if (!lines[rowIdx] || !lines[rowIdx].startsWith('|')) break;

    // Fehlerrate über alle VU-Levels und Runs mitteln
    const allErrors = [];
    for (const vus of VU_LEVELS) {
      for (let run = 1; run <= REPETITIONS; run++) {
        const file    = path.join(RAW_DIR, `${TARGET}_${script}_${vus}vu_run${run}.json`);
        const summary = readSummary(file);
        if (summary && summary.err !== null) allErrors.push(summary.err);
      }
    }

    const valid  = allErrors.filter(v => !isNaN(v));
    const avgErr = valid.length
      ? (valid.reduce((a, b) => a + b, 0) / valid.length * 100).toFixed(2) + '%'
      : '—';

    lines[rowIdx] = replaceColumns(lines[rowIdx], { [errCol]: avgErr });
    console.log(`  Fehlerrate ${script} → ${avgErr}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\nAktualisiere measurements.md für: ${TARGET}`);

const content = fs.readFileSync(MD_FILE, 'utf8');
const lines   = content.split('\n');

for (const script of SCRIPTS) {
  console.log(`\n  [${script}]`);
  updateResultsTable(lines, script);
}

console.log('\n  [Fehlerrate]');
updateErrorTable(lines);

fs.writeFileSync(MD_FILE, lines.join('\n'), 'utf8');
console.log('\nmeasurements.md erfolgreich aktualisiert.\n');
