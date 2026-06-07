import { NextRequest, NextResponse } from 'next/server';

const API_V1 = 'https://api.mercadopublico.cl/servicios/v1';
const API_V2 = 'https://api2.mercadopublico.cl';

export async function GET(
  _req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  if (!ticket) return NextResponse.json({ error: 'sin ticket' }, { status: 500 });

  const codigo = params.codigo;
  const results: Record<string, unknown> = {};

  // ── V2 attempts ────────────────────────────────────────────────────────────

  // 1. v2 detail by path
  try {
    const r = await fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}`, { headers: { ticket } });
    const j = await r.json();
    results['v2 GET /v2/compra-agil/{codigo}'] = { status: r.status, keys: topKeys(j), raw: j };
  } catch (e) { results['v2 GET /v2/compra-agil/{codigo}'] = { error: String(e) }; }

  // 2. v2 list — first item to see field names and code format
  try {
    const r = await fetch(`${API_V2}/v2/compra-agil?tamano_pagina=3`, { headers: { ticket } });
    const j = await r.json();
    const items = j?.payload?.items ?? [];
    results['v2 GET /v2/compra-agil?tamano_pagina=3 (sample)'] = {
      status: r.status,
      payload_keys: topKeys(j?.payload),
      sample_codigos: items.slice(0, 3).map((i: Record<string,unknown>) => i.codigo),
      item_keys: items[0] ? Object.keys(items[0]) : [],
    };
  } catch (e) { results['v2 list sample'] = { error: String(e) }; }

  // 3. v2 list — search by codigo_externo
  try {
    const r = await fetch(`${API_V2}/v2/compra-agil?codigo_externo=${encodeURIComponent(codigo)}&tamano_pagina=5`, { headers: { ticket } });
    const j = await r.json();
    results['v2 GET /v2/compra-agil?codigo_externo=X'] = { status: r.status, payload_keys: topKeys(j?.payload), items: j?.payload?.items?.slice(0, 2) };
  } catch (e) { results['v2 codigo_externo'] = { error: String(e) }; }

  // 4. v2 list — search by nombre
  try {
    const r = await fetch(`${API_V2}/v2/compra-agil?nombre=${encodeURIComponent(codigo)}&tamano_pagina=5`, { headers: { ticket } });
    const j = await r.json();
    const items = j?.payload?.items ?? [];
    results['v2 GET /v2/compra-agil?nombre=X'] = {
      status: r.status,
      count: items.length,
      items: items.slice(0, 2),
    };
  } catch (e) { results['v2 nombre search'] = { error: String(e) }; }

  // ── V1 attempts ────────────────────────────────────────────────────────────

  // 5. v1 compras ágiles by codigo
  try {
    const r = await fetch(`${API_V1}/publico/comprasagiles?ticket=${ticket}&codigo=${encodeURIComponent(codigo)}`);
    const j = await r.json();
    results['v1 GET /publico/comprasagiles?codigo=X'] = { status: r.status, keys: topKeys(j), raw: j };
  } catch (e) { results['v1 comprasagiles codigo'] = { error: String(e) }; }

  // 6. v1 compras ágiles — list (sample)
  try {
    const r = await fetch(`${API_V1}/publico/comprasagiles?ticket=${ticket}&pagina=1`);
    const j = await r.json();
    const items = j?.Listado ?? j?.listado ?? j?.payload?.items ?? [];
    results['v1 GET /publico/comprasagiles?pagina=1 (sample)'] = {
      status: r.status,
      top_keys: topKeys(j),
      item_keys: items[0] ? Object.keys(items[0]) : [],
      sample_codigos: items.slice(0, 3).map((i: Record<string,unknown>) => i.CodigoExterno ?? i.codigo ?? i.Codigo),
    };
  } catch (e) { results['v1 comprasagiles list'] = { error: String(e) }; }

  // 7. v1 licitaciones search (to compare auth/format)
  try {
    const r = await fetch(`${API_V1}/publico/licitaciones.json?ticket=${ticket}&codigo=${encodeURIComponent(codigo)}`);
    const j = await r.json();
    results['v1 GET /publico/licitaciones?codigo=X'] = { status: r.status, keys: topKeys(j), raw: j };
  } catch (e) { results['v1 licitaciones'] = { error: String(e) }; }

  return NextResponse.json(results, { headers: { 'Content-Type': 'application/json' } });
}

function topKeys(obj: unknown): string[] {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.keys(obj as Record<string, unknown>);
  }
  return [];
}
