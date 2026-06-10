import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BASE = 'https://api2.mercadopublico.cl';

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization') ?? '';
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  const region = process.env.REGION_FILTER ?? '14';

  if (!ticket) return NextResponse.json({ error: 'MERCADO_PUBLICO_TICKET no configurado' }, { status: 500 });
  if (auth !== `Bearer ${ticket}`) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const hasta = new Date().toISOString();

  const listParams = new URLSearchParams({
    publicado_desde: desde,
    publicado_hasta: hasta,
    region,
    tamano_pagina: '50',
    numero_pagina: '1',
  });
  const listUrl = `${API_BASE}/v2/compra-agil?${listParams}`;

  // ── Paso 1: lista ────────────────────────────────────────────────────────────
  let listStatus = 0;
  let listBodyRaw = '';
  let listParsed: unknown = null;
  let primerItem: unknown = null;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(listUrl, { headers: { ticket }, signal: ctrl.signal });
    clearTimeout(t);
    listStatus = r.status;
    listBodyRaw = await r.text();
    try { listParsed = JSON.parse(listBodyRaw); } catch { /* no-op */ }
    const items = (listParsed as { payload?: { items?: unknown[] } })?.payload?.items ?? [];
    primerItem = items[0] ?? null;
  } catch (err) {
    listBodyRaw = String(err);
  }

  // ── Paso 2: detalle ──────────────────────────────────────────────────────────
  const codigo = (primerItem as Record<string, unknown>)?.codigo as string | undefined;
  let detalleStatus = 0;
  let detalleBodyRaw = '';
  let detalleParsed: unknown = null;
  const detalleUrl = codigo ? `${API_BASE}/v2/compra-agil/${encodeURIComponent(codigo)}` : '';

  if (codigo) {
    try {
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 7000);
      const r2 = await fetch(detalleUrl, { headers: { ticket }, signal: ctrl2.signal });
      clearTimeout(t2);
      detalleStatus = r2.status;
      detalleBodyRaw = await r2.text();
      try { detalleParsed = JSON.parse(detalleBodyRaw); } catch { /* no-op */ }
    } catch (err) {
      detalleBodyRaw = String(err);
    }
  }

  return NextResponse.json({
    debug: {
      list_url: listUrl,
      list_status: listStatus,
      list_body_raw: listBodyRaw.slice(0, 2000),
    },
    lista: {
      status: listStatus,
      primer_item: primerItem,
    },
    detalle: {
      url: detalleUrl,
      status: detalleStatus,
      body_raw: detalleBodyRaw.slice(0, 2000),
      parsed: detalleParsed,
    },
  });
}
