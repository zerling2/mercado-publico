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
 *   resultados.csv   — registro por request (incluye detalle_error)
 *   resumen.txt      — estadísticas finales
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const TICKET    = process.env.MP_API_TICKET ?? '';
const TAMANO    = Number(process.env.TAMANO_PAGINA ?? 50);
const ESPERA_MS = Number(process.env.ESPERA_MS    ?? 3000);
const MAX_429   = 3;  // consecutive 429s before stopping
const MAX_ERR   = 5;  // consecutive network errors before stopping
const API_BASE  = 'https://api2.mercadopublico.cl';

// ── Validación del ticket ─────────────────────────────────────────────────────

if (!TICKET) {
  console.error('');
  console.error('ERROR: MP_API_TICKET no está definido o está vacío.');
  console.error('  GitHub Actions: agrega el secret MP_API_TICKET en Settings → Secrets → Actions');
  console.error('  Local: MP_API_TICKET=<valor> node medir-cuota.js');
  console.error('');
  process.exit(1);
}

// Muestra solo los primeros 8 caracteres para confirmar que cargó el correcto
// sin exponer el ticket completo en los logs
console.log('');
console.log('══════════════════════════════════════════');
console.log(' medir-cuota.js — verificación previa');
console.log('══════════════════════════════════════════');
console.log(`Ticket cargado  : ${TICKET.slice(0, 8)}${'*'.repeat(Math.max(0, TICKET.length - 8))} (${TICKET.length} chars)`);

// ── Endpoint ──────────────────────────────────────────────────────────────────

// La API v2 de Mercado Público (api2.mercadopublico.cl) requiere el ticket
// como header HTTP personalizado llamado "ticket", NO como query param.
// La API v1 (api.mercadopublico.cl) lo requiere como ?ticket= en la URL.
// Este script usa v2 porque es el mismo endpoint que usa el sync del prototipo
// (enriquecer-compras, cotizacion, compras-agiles), que probadamente funciona.
const TEST_URL = `${API_BASE}/v2/compra-agil?tamano_pagina=1&pagina=1`;
const LIST_URL = (pagina) => `${API_BASE}/v2/compra-agil?tamano_pagina=${TAMANO}&pagina=${pagina}`;

console.log(`Endpoint        : ${TEST_URL}`);
console.log(`Método de auth  : header HTTP "ticket" (no query param)`);
console.log(`Tamaño página   : ${TAMANO} | Espera: ${ESPERA_MS}ms`);
console.log('');

// ── Archivos de salida ────────────────────────────────────────────────────────

const OUT_DIR   = __dirname;
const CSV_PATH  = path.join(OUT_DIR, 'resultados.csv');
const SUM_PATH  = path.join(OUT_DIR, 'resumen.txt');

const csvStream = fs.createWriteStream(CSV_PATH, { flags: 'w' });
csvStream.write('timestamp,request_num,pagina,http_status,items_recibidos,detalle_error\n');

// ── Helpers ───────────────────────────────────────────────────────────────────

function ts() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Escapa un campo CSV: encierra en comillas si contiene coma, comilla o salto
function csvEscape(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function csvRow(requestNum, pagina, status, items, detalle) {
  return [ts(), requestNum, pagina, status, items, csvEscape(detalle ?? '')].join(',') + '\n';
}

/**
 * Hace un request GET al endpoint y devuelve { status, json, rawBody }.
 * En caso de error de red lanza una excepción.
 * El ticket va como header HTTP (ver comentario en la sección Endpoint).
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { ticket: TICKET } }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) { /* body no es JSON */ }
        resolve({ status: res.statusCode, json, rawBody: body.slice(0, 300) });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout después de 15s')); });
  });
}

// ── Request de prueba ─────────────────────────────────────────────────────────

async function testRequest() {
  console.log('── REQUEST DE PRUEBA ────────────────────────');
  console.log(`URL: ${TEST_URL}`);
  console.log('Enviando...');

  let result;
  try {
    result = await fetchJson(TEST_URL);
  } catch (err) {
    console.error(`FALLO DE RED: ${err.message}`);
    console.error('Verifica conectividad y que el endpoint sea correcto.');
    console.error('');
    return false;
  }

  const { status, json, rawBody } = result;
  const items = json?.payload?.items?.length ?? 0;

  console.log(`HTTP ${status}`);
  if (status === 200) {
    const sample = json?.payload?.items?.[0];
    console.log(`Items en página 1: ${items}`);
    console.log(`Primer item: ${JSON.stringify(sample ?? {}).slice(0, 200)}`);
    console.log('PRUEBA OK ✓');
  } else {
    console.error(`Error HTTP ${status}`);
    console.error(`Cuerpo respuesta: ${rawBody}`);
    if (status === 403) {
      console.error('→ 403 Forbidden: el ticket probablemente es incorrecto o expiró.');
    } else if (status === 401) {
      console.error('→ 401 Unauthorized: ticket inválido.');
    } else if (status === 429) {
      console.error('→ 429 Too Many Requests: ya hay throttling antes de empezar.');
    }
  }
  console.log('');
  return status === 200;
}

// ── Medición completa ─────────────────────────────────────────────────────────

async function main() {
  const ok = await testRequest();
  if (!ok) {
    console.error('Medición cancelada: la prueba previa falló.');
    csvStream.end();
    process.exit(1);
  }

  console.log('── MEDICIÓN COMPLETA ────────────────────────');
  console.log(`Detención: ${MAX_429} × 429 consecutivos | ${MAX_ERR} × error de red consecutivos`);
  console.log('');

  let requestNum        = 0;
  let pagina            = 1;
  let consecutivos429   = 0;
  let consecutivosErr   = 0;
  let primer429At       = null;
  let exitosos          = 0;
  const startTime       = Date.now();

  while (true) {
    requestNum++;
    const url = LIST_URL(pagina);

    let status  = 0;
    let items   = 0;
    let json    = null;
    let rawBody = '';
    let detalle = '';

    try {
      const result = await fetchJson(url);
      status  = result.status;
      json    = result.json;
      rawBody = result.rawBody;
      consecutivosErr = 0; // reset al recuperar conectividad
    } catch (err) {
      consecutivosErr++;
      detalle = err.message;
      console.error(`  #${requestNum} | pág ${pagina} | ERROR RED (${consecutivosErr}/${MAX_ERR}): ${err.message}`);
      csvStream.write(csvRow(requestNum, pagina, 'ERR_RED', 0, err.message));

      if (consecutivosErr >= MAX_ERR) {
        console.error(`\n${MAX_ERR} errores de red consecutivos. Deteniendo.`);
        break;
      }
      await sleep(ESPERA_MS);
      continue;
    }

    if (status === 200) {
      items = json?.payload?.items?.length ?? 0;
      consecutivos429 = 0;
      exitosos++;

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  #${requestNum} | pág ${pagina} | 200 OK | ${items} items | ${elapsed}s`);
      csvStream.write(csvRow(requestNum, pagina, 200, items, ''));

      if (items === 0) {
        console.log('\nFin del dataset — no quedan más páginas.');
        break;
      }

      pagina++;

    } else if (status === 429) {
      consecutivos429++;
      if (!primer429At) primer429At = new Date().toISOString();

      detalle = rawBody;
      console.warn(`  #${requestNum} | pág ${pagina} | 429 RATE LIMIT (${consecutivos429}/${MAX_429})`);
      csvStream.write(csvRow(requestNum, pagina, 429, 0, detalle));

      if (consecutivos429 >= MAX_429) {
        console.warn(`\nAlcanzados ${MAX_429} errores 429 consecutivos. Deteniendo.`);
        break;
      }

      await sleep(ESPERA_MS * 2);
      continue;

    } else {
      // 403, 401, 5xx, etc. — registrar y continuar (no detener)
      detalle = `HTTP ${status}: ${rawBody}`;
      console.warn(`  #${requestNum} | pág ${pagina} | HTTP ${status} — ${rawBody.slice(0, 80)}`);
      csvStream.write(csvRow(requestNum, pagina, status, 0, detalle));
      // No incrementamos pagina ni detenemos: seguimos midiendo
    }

    await sleep(ESPERA_MS);
  }

  csvStream.end();

  // ── Resumen ─────────────────────────────────────────────────────────────────

  const totalMs  = Date.now() - startTime;
  const totalSeg = totalMs / 1000;
  const rpm      = exitosos > 0 ? ((exitosos / totalSeg) * 60).toFixed(2) : '0';

  const resumen = [
    '══════════════════════════════════════════',
    ' RESUMEN — medir-cuota.js',
    '══════════════════════════════════════════',
    `Fecha ejecución        : ${new Date().toISOString()}`,
    `Requests exitosos (200): ${exitosos}`,
    `Requests totales       : ${requestNum}`,
    `Primer 429             : ${primer429At ?? 'No se recibió 429'}`,
    `Duración total         : ${totalSeg.toFixed(1)}s`,
    `Requests/min sostenido : ${rpm}`,
    `Tamaño página usado    : ${TAMANO}`,
    `Espera configurada     : ${ESPERA_MS}ms`,
    '══════════════════════════════════════════',
  ].join('\n');

  fs.writeFileSync(SUM_PATH, resumen + '\n');

  console.log('\n' + resumen);
  console.log(`\nCSV  : ${CSV_PATH}`);
  console.log(`Resumen: ${SUM_PATH}`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
