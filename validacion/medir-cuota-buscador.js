#!/usr/bin/env node
/**
 * medir-cuota-buscador.js
 * Mide la cuota del endpoint compra-agil del Buscador de Mercado Público.
 * Lee MP_BUSCADOR_API_KEY desde el entorno (nunca hardcodeado).
 * Graba resultados en buscador-resultados.csv.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ── Configuración ──────────────────────────────────────────────────────────────

const API_KEY = process.env.MP_BUSCADOR_API_KEY;
if (!API_KEY) {
  console.error('ERROR: La variable de entorno MP_BUSCADOR_API_KEY no está definida.');
  process.exit(1);
}

const BASE_URL = 'https://api.buscador.mercadopublico.cl/compra-agil';
const DATE_FROM = process.env.DATE_FROM || '2025-01-01';
const DATE_TO   = process.env.DATE_TO   || '2025-01-31';
const DELAY_MS  = 1500;
const MAX_CONSECUTIVE_429  = 3;
const MAX_CONSECUTIVE_NET  = 5;

const CSV_PATH = path.join(__dirname, 'buscador-resultados.csv');

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isoNow() {
  return new Date().toISOString();
}

function appendCsvRow(row) {
  const line = [
    row.timestamp,
    row.page,
    row.httpCode,
    row.resultCount,
    (row.errorMsg || '').replace(/,/g, ';'),
  ].join(',') + '\n';
  fs.appendFileSync(CSV_PATH, line, 'utf8');
}

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Timeout de red (15s)'));
    });
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  // Inicializar CSV
  fs.writeFileSync(CSV_PATH, 'timestamp,page,http_code,result_count,error_msg\n', 'utf8');

  const headers = {
    'x-api-key': API_KEY,
    'Accept': 'application/json',
  };

  let page = 1;
  let pageCount = null;

  let consecutive429 = 0;
  let consecutiveNet = 0;

  let totalSuccess = 0;
  let first429Page = null;
  const startTime = Date.now();
  let requestCount = 0;

  console.log(`Iniciando sondeo: ${BASE_URL}`);
  console.log(`date_from=${DATE_FROM}  date_to=${DATE_TO}`);
  console.log(`CSV: ${CSV_PATH}\n`);

  while (true) {
    const url =
      `${BASE_URL}?date_from=${DATE_FROM}&date_to=${DATE_TO}` +
      `&order_by=recent&status=2&page_number=${page}`;

    const timestamp = isoNow();
    let httpCode = null;
    let resultCount = 0;
    let errorMsg = '';

    try {
      const { statusCode, body } = await fetchJson(url, headers);
      httpCode = statusCode;
      requestCount++;

      if (statusCode === 200) {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          errorMsg = 'JSON inválido: ' + e.message;
        }

        if (!errorMsg) {
          // Intentar detectar la estructura de respuesta
          const items =
            parsed?.data ||
            parsed?.results ||
            parsed?.compras ||
            parsed?.items ||
            (Array.isArray(parsed) ? parsed : null);

          resultCount = Array.isArray(items) ? items.length : 0;

          if (pageCount === null) {
            pageCount =
              parsed?.pageCount ||
              parsed?.totalPages ||
              parsed?.page_count ||
              parsed?.meta?.pageCount ||
              null;
            if (pageCount !== null) {
              console.log(`pageCount detectado: ${pageCount}`);
            }
          }
        }

        consecutive429 = 0;
        consecutiveNet = 0;
        totalSuccess++;

        process.stdout.write(`[pág ${page}] HTTP ${statusCode} — ${resultCount} resultados\n`);
      } else if (statusCode === 429) {
        errorMsg = 'Rate limit (429)';
        consecutive429++;
        consecutiveNet = 0;
        if (first429Page === null) first429Page = page;
        console.warn(`[pág ${page}] 429 — consecutivos: ${consecutive429}`);
      } else {
        errorMsg = `HTTP ${statusCode}`;
        consecutiveNet = 0;
        console.warn(`[pág ${page}] Error HTTP ${statusCode}`);
      }
    } catch (netErr) {
      httpCode = 0;
      errorMsg = netErr.message;
      consecutiveNet++;
      requestCount++;
      console.error(`[pág ${page}] Error de red — ${netErr.message} (consecutivos: ${consecutiveNet})`);
    }

    appendCsvRow({ timestamp, page, httpCode, resultCount, errorMsg });

    // ── Condiciones de parada ────────────────────────────────────────────────
    if (consecutive429 >= MAX_CONSECUTIVE_429) {
      console.warn(`\nDetenido: ${MAX_CONSECUTIVE_429} errores 429 consecutivos.`);
      break;
    }
    if (consecutiveNet >= MAX_CONSECUTIVE_NET) {
      console.error(`\nDetenido: ${MAX_CONSECUTIVE_NET} errores de red consecutivos.`);
      break;
    }
    if (pageCount !== null && page >= pageCount) {
      console.log(`\nÚltima página alcanzada (page ${page} / pageCount ${pageCount}).`);
      break;
    }

    page++;
    await sleep(DELAY_MS);
  }

  // ── Resumen ──────────────────────────────────────────────────────────────────
  const elapsedMinutes = (Date.now() - startTime) / 60000;
  const rpm = elapsedMinutes > 0 ? (requestCount / elapsedMinutes).toFixed(2) : 'N/A';

  console.log('\n══════════════════════════════════════════');
  console.log('RESUMEN');
  console.log('══════════════════════════════════════════');
  console.log(`Páginas exitosas (HTTP 200): ${totalSuccess}`);
  console.log(`Primer 429 en página:        ${first429Page ?? 'ninguno'}`);
  console.log(`Total requests:              ${requestCount}`);
  console.log(`Tiempo transcurrido:         ${elapsedMinutes.toFixed(2)} min`);
  console.log(`Requests/minuto sostenidos:  ${rpm}`);
  console.log(`CSV guardado en:             ${CSV_PATH}`);
  console.log('══════════════════════════════════════════');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
