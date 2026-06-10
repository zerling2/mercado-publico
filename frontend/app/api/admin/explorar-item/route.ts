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

  // 1. Fetch lista — 50 items, tomamos solo el primero (tamano_pagina=1 devuelve 400)
  const listParams = new URLSearchParams({
    publicado_desde: desde,
    publicado_hasta: hasta,
    region,
    tamano_pagina: '50',
    numero_pagina: '1',
  });

  let listaRaw: unknown = null;
  let primerItem: unknown = null;
  let listStatus = 0;
  let listError: string | undefined;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(`${API_BASE}/v2/compra-agil?${listParams}`, {
      headers: { ticket },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    listStatus = r.status;
    const text = await r.text();
    try {
      listaRaw = JSON.parse(text);
      if (listStatus !== 200) {
        listError = text.slice(0, 300);
      } else {
        const items = (listaRaw as { payload?: { items?: unknown[] } })?.payload?.items ?? [];
        primerItem = items[0] ?? null;
      }
    } catch {
      listaRaw = { parseError: true, raw: text.slice(0, 500) };
    }
  } catch (err) {
    listaRaw = { fetchError: String(err) };
  }

  // 2. Fetch detalle por código
  const codigo = (primerItem as Record<string, unknown>)?.codigo as string | undefined;
  let detalleRaw: unknown = null;
  let detalleStatus = 0;
  let detalleUrl = '';

  if (codigo) {
    detalleUrl = `${API_BASE}/v2/compra-agil/${encodeURIComponent(codigo)}`;
    try {
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 7000);
      const r2 = await fetch(detalleUrl, {
        headers: { ticket },
        signal: ctrl2.signal,
      });
      clearTimeout(t2);
      detalleStatus = r2.status;
      const text2 = await r2.text();
      try { detalleRaw = JSON.parse(text2); }
      catch { detalleRaw = { parseError: true, raw: text2.slice(0, 500) }; }
    } catch (err) {
      detalleRaw = { fetchError: String(err) };
    }
  }

  return NextResponse.json({
    lista: {
      status: listStatus,
      error: listError,
      primer_item: primerItem,
    },
    detalle: {
      url: detalleUrl,
      status: detalleStatus,
      raw: detalleRaw,
    },
  });
}
