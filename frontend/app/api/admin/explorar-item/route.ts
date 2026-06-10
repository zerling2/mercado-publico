import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BASE = 'https://api2.mercadopublico.cl';

// GET /api/admin/explorar-item?codigo=2909-329-COT26  → solo detalle
// GET /api/admin/explorar-item                        → lista + primer item + detalle
export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization') ?? '';
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  const region = process.env.REGION_FILTER ?? '14';

  if (!ticket) return NextResponse.json({ error: 'MERCADO_PUBLICO_TICKET no configurado' }, { status: 500 });
  if (auth !== `Bearer ${ticket}`) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const codigoParam = req.nextUrl.searchParams.get('codigo');

  // ── Modo directo: solo el endpoint de detalle ─────────────────────────────
  if (codigoParam) {
    const detalleUrl = `${API_BASE}/v2/compra-agil/${encodeURIComponent(codigoParam)}`;
    let status = 0;
    let bodyRaw = '';
    let parsed: unknown = null;

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 7000);
      const r = await fetch(detalleUrl, { headers: { ticket }, signal: ctrl.signal });
      clearTimeout(t);
      status = r.status;
      bodyRaw = await r.text();
      try { parsed = JSON.parse(bodyRaw); } catch { /* no-op */ }
    } catch (err) {
      bodyRaw = String(err);
    }

    return NextResponse.json({ url: detalleUrl, status, body_raw: bodyRaw, parsed });
  }

  // ── Modo exploración: lista + primer item + detalle ───────────────────────
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const hasta = new Date().toISOString();
  const listParams = new URLSearchParams({
    publicado_desde: desde, publicado_hasta: hasta,
    region, tamano_pagina: '50', numero_pagina: '1',
  });
  const listUrl = `${API_BASE}/v2/compra-agil?${listParams}`;

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
    debug: { list_url: listUrl, list_status: listStatus, list_body_raw: listBodyRaw.slice(0, 2000) },
    lista: { status: listStatus, primer_item: primerItem },
    detalle: { url: detalleUrl, status: detalleStatus, body_raw: detalleBodyRaw.slice(0, 2000), parsed: detalleParsed },
  });
}
