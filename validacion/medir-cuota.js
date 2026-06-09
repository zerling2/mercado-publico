#!/usr/bin/env node
/**
 * medir-cuota.js
 * Mide cuántas requests sostenidas acepta la API de Mercado Público
 * antes de responder 429.
 *
 * Uso:
 *   MP_API_TICKET=<ticket> node medir-cuota.js
 *   MP_API_TICKET=<ticket> TAMANO_PAGINA=50 ESPERA_MS=3000 node medir-cuota.js
 *
 * Salidas:
 *   resultados.csv   — registro por request
 *   resumen.txt      — estadísticas finales
 */

'use strict';

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const TICKET      = process.env.MP_API_TICKET;
const TAMANO      = Number(process.env.TAMANO_PAGINA ?? 50);
const ESPERA_MS   = Number(process.env.ESPERA_MS    ?? 3000);
const MAX_429     = 3;   // consecutive 429s before stopping
const API_BASE    = 'https://api2.mercadopublico.cl';

if (!TICKET) {
  console.error('ERROR: MP_API_TICKET no está definido. Exporta la variable antes de correr el script.');
  process.exit(1);
}

// ── Archivos de salida ────────────────────────────────────────────────────────

const OUT_DIR   = __dirname;
const CSV_PATH  = path.join(OUT_DIR, 'resultados.csv');
const SUM_PATH  = path.join(OUT_DIR, 'resumen.txt');

const csvStream = fs.createWriteStream(CSV_PATH, { flags: 'w' });
csvStream.write('timestamp,request_num,pagina,http_status,items_recibidos\n');

// ── Helpers ───────────────────────────────────────────────────────────────────

function ts() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: { ticket: TICKET },
    };
    const req = https.get(url, opts, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) { /* ignore parse error */ }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}

function csvRow(requestNum, pagina, status, items) {
  return `${ts()},${requestNum},${pagina},${status},${items}\n`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Iniciando medición — endpoint: ${API_BASE}/v2/compra-agil`);
  console.log(`Tamaño página: ${TAMANO} | Espera entre requests: ${ESPERA_MS}ms`);
  console.log(`Detención automática tras ${MAX_429} errores 429 consecutivos\n`);

  let requestNum        = 0;
  let pagina            = 1;
  let consecutivos429   = 0;
  let primer429At       = null;
  let exitosos          = 0;
  const startTime       = Date.now();

  while (true) {
    requestNum++;
    const url = `${API_BASE}/v2/compra-agil?tamano_pagina=${TAMANO}&pagina=${pagina}`;

    let status  = 0;
    let items   = 0;
    let json    = null;

    try {
      const result = await fetchJson(url);
      status = result.status;
      json   = result.json;
    } catch (err) {
      console.error(`  Request #${requestNum} — error de red: ${err.message}`);
      csvStream.write(csvRow(requestNum, pagina, 'ERR', 0));
      break;
    }

    if (status === 200) {
      items = json?.payload?.items?.length ?? 0;
      consecutivos429 = 0;
      exitosos++;

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  #${requestNum} | pág ${pagina} | 200 OK | ${items} items | ${elapsed}s`);

      csvStream.write(csvRow(requestNum, pagina, status, items));

      // Si la página devuelve 0 items, llegamos al final del dataset
      if (items === 0) {
        console.log('\nFin del dataset — no quedan más páginas.');
        break;
      }

      pagina++;
    } else if (status === 429) {
      consecutivos429++;
      if (!primer429At) primer429At = new Date().toISOString();

      console.warn(`  #${requestNum} | pág ${pagina} | 429 TOO MANY REQUESTS (consecutivo ${consecutivos429}/${MAX_429})`);
      csvStream.write(csvRow(requestNum, pagina, status, 0));

      if (consecutivos429 >= MAX_429) {
        console.warn(`\nAlcanzados ${MAX_429} errores 429 consecutivos. Deteniendo.`);
        break;
      }

      // Espera más larga ante 429 antes del siguiente intento
      await sleep(ESPERA_MS * 2);
      continue;
    } else {
      console.warn(`  #${requestNum} | pág ${pagina} | HTTP ${status}`);
      csvStream.write(csvRow(requestNum, pagina, status, 0));
    }

    if (pagina > 1) {
      await sleep(ESPERA_MS);
    }
  }

  csvStream.end();

  // ── Resumen ─────────────────────────────────────────────────────────────────

  const totalMs      = Date.now() - startTime;
  const totalSeg     = totalMs / 1000;
  const rpm          = exitosos > 0 ? ((exitosos / totalSeg) * 60).toFixed(2) : '0';

  const resumen = [
    '══════════════════════════════════════════',
    ' RESUMEN — medir-cuota.js',
    '══════════════════════════════════════════',
    `Fecha ejecución     : ${new Date().toISOString()}`,
    `Requests exitosos   : ${exitosos}`,
    `Requests totales    : ${requestNum}`,
    `Primer 429          : ${primer429At ?? 'No se recibió 429'}`,
    `Duración total      : ${totalSeg.toFixed(1)}s`,
    `Requests/min sostenido: ${rpm}`,
    `Tamaño página usado : ${TAMANO}`,
    `Espera configurada  : ${ESPERA_MS}ms`,
    '══════════════════════════════════════════',
  ].join('\n');

  fs.writeFileSync(SUM_PATH, resumen + '\n');

  console.log('\n' + resumen);
  console.log(`\nCSV guardado en : ${CSV_PATH}`);
  console.log(`Resumen guardado en : ${SUM_PATH}`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
