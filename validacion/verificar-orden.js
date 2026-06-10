#!/usr/bin/env node
/**
 * verificar-orden.js
 * Consulta las 3 primeras páginas del endpoint de compras ágiles
 * y verifica si los resultados vienen ordenados cronológicamente
 * (más reciente primero).
 *
 * Uso:
 *   MP_API_TICKET=<ticket> node verificar-orden.js
 *   MP_API_TICKET=<ticket> REGION_FILTER=7 node verificar-orden.js
 *
 * Mismos filtros que el sync de producción (backend/lib/mercado-publico-api.js).
 */

'use strict';

const https  = require('https');
const path   = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const TICKET  = (process.env.MP_API_TICKET ?? '').trim();
const REGION  = process.env.REGION_FILTER ?? '14';
const API_BASE = 'https://api2.mercadopublico.cl';
const PAGINAS  = [1, 2, 3];
const ESPERA_MS = 3000;

// ── Nota sobre parámetros de ordenamiento ────────────────────────────────────
//
// Revisado: backend/lib/mercado-publico-api.js y backend/scripts/sync.js
// No existe ningún parámetro de orden explícito (orden, sort, orderBy,
// order_by, fecha_orden) en el código ni en la documentación visible.
// La API v2 devuelve los resultados en el orden por defecto del servidor.
// Si Mercado Público expone un parámetro de sort en el futuro, conviene
// agregarlo aquí (ej: orden_fecha=DESC) para garantizar el orden y no
// depender del comportamiento implícito.
//
// ─────────────────────────────────────────────────────────────────────────────

if (!TICKET) {
  console.error('ERROR: MP_API_TICKET no está definido.');
  console.error('  Uso: MP_API_TICKET=<valor> node verificar-orden.js');
  process.exit(1);
}

console.log(`Ticket    : ${TICKET.slice(0, 8)}${'*'.repeat(TICKET.length - 8)}`);
console.log(`Región    : ${REGION}`);
console.log(`Páginas   : ${PAGINAS.join(', ')}`);
console.log(`Espera    : ${ESPERA_MS}ms entre requests\n`);

// ── HTTP helper ───────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { ticket: TICKET } }, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, json: null, raw: body.slice(0, 300) }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => req.destroy(new Error('timeout')));
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Tabla en consola ──────────────────────────────────────────────────────────

function imprimirTabla(pagina, items) {
  console.log(`\n─── Página ${pagina} (${items.length} items) ${'─'.repeat(40)}`);
  console.log(
    'Nº'.padEnd(4) +
    'Código'.padEnd(22) +
    'Publicación'.padEnd(22) +
    'Cierre'
  );
  console.log('─'.repeat(80));
  items.forEach((it, i) => {
    console.log(
      String(i + 1).padEnd(4) +
      (it.codigo ?? '—').padEnd(22) +
      (it.fecha_pub ?? '—').padEnd(22) +
      (it.fecha_cierre ?? '—')
    );
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const desde = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const hasta = new Date().toISOString();

  const todasLasFilas = []; // {pagina, idx, codigo, fecha_pub, fecha_cierre}

  for (let p = 0; p < PAGINAS.length; p++) {
    const pagina = PAGINAS[p];
    const params = new URLSearchParams({
      publicado_desde: desde,
      publicado_hasta: hasta,
      region: REGION,
      tamano_pagina: '50',
      numero_pagina: String(pagina),
    });
    const url = `${API_BASE}/v2/compra-agil?${params}`;

    console.log(`Consultando página ${pagina}...`);
    let result;
    try {
      result = await get(url);
    } catch (err) {
      console.error(`  Error de red en página ${pagina}: ${err.message}`);
      continue;
    }

    if (result.status !== 200) {
      console.error(`  HTTP ${result.status} en página ${pagina}`);
      if (result.json) console.error('  ', JSON.stringify(result.json).slice(0, 200));
      continue;
    }

    const items = result.json?.payload?.items ?? [];
    if (items.length === 0) {
      console.log(`  Página ${pagina} vacía — fin del dataset.`);
      break;
    }

    const filas = items.map((it, i) => ({
      pagina,
      idx: i,
      codigo:       it.codigo ?? null,
      fecha_pub:    it.fechas?.fecha_publicacion ?? null,
      fecha_cierre: it.fechas?.fecha_cierre ?? null,
    }));

    imprimirTabla(pagina, filas);
    todasLasFilas.push(...filas);

    if (p < PAGINAS.length - 1) {
      console.log(`\nEsperando ${ESPERA_MS}ms...`);
      await sleep(ESPERA_MS);
    }
  }

  if (todasLasFilas.length === 0) {
    console.error('\nNo se obtuvieron datos — no es posible verificar el orden.');
    process.exit(1);
  }

  // ── Verificación de orden ─────────────────────────────────────────────────

  console.log('\n' + '═'.repeat(60));
  console.log(' VERIFICACIÓN DE ORDEN CRONOLÓGICO');
  console.log('═'.repeat(60));

  const quebrantos = [];

  for (let i = 1; i < todasLasFilas.length; i++) {
    const anterior = todasLasFilas[i - 1];
    const actual   = todasLasFilas[i];
    if (!anterior.fecha_pub || !actual.fecha_pub) continue;

    const tAnterior = new Date(anterior.fecha_pub).getTime();
    const tActual   = new Date(actual.fecha_pub).getTime();

    // Orden descendente: anterior debe ser >= actual
    if (tAnterior < tActual) {
      quebrantos.push({
        pos: i,
        anterior: `pág ${anterior.pagina} #${anterior.idx + 1} ${anterior.codigo} ${anterior.fecha_pub}`,
        actual:   `pág ${actual.pagina}   #${actual.idx + 1} ${actual.codigo} ${actual.fecha_pub}`,
      });
    }
  }

  if (quebrantos.length === 0) {
    console.log('\n✅  ORDEN CRONOLÓGICO DESCENDENTE CONFIRMADO');
    console.log('    Las fechas de publicación van de más reciente a más antigua');
    console.log('    tanto dentro de cada página como entre páginas.\n');
  } else {
    console.log('\n⚠️   ORDEN NO CRONOLÓGICO');
    console.log(`    Se encontraron ${quebrantos.length} quiebres de orden.\n`);
    console.log('Primeros 5 pares que rompen el orden:');
    quebrantos.slice(0, 5).forEach((q, i) => {
      console.log(`  ${i + 1}. ANTERIOR: ${q.anterior}`);
      console.log(`     ACTUAL  : ${q.actual}`);
      console.log(`     → La fecha actual es MÁS RECIENTE que la anterior (rompe DESC)`);
    });
    console.log('');
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
