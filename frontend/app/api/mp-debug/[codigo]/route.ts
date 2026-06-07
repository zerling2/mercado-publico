import { NextRequest, NextResponse } from 'next/server';

const API_V2 = 'https://api2.mercadopublico.cl';

export async function GET(
  _req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  if (!ticket) return NextResponse.json({ error: 'sin ticket' }, { status: 500 });

  const codigo = params.codigo;
  const results: Record<string, unknown> = {};

  // Attempt 1: detail by path
  try {
    const r = await fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}`, { headers: { ticket } });
    const j = await r.json();
    results['GET /v2/compra-agil/{codigo}'] = { status: r.status, keys: topLevelKeys(j), raw: j };
  } catch (e) { results['GET /v2/compra-agil/{codigo}'] = { error: String(e) }; }

  // Attempt 2: documents sub-endpoint
  try {
    const r = await fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}/documentos`, { headers: { ticket } });
    const j = await r.json();
    results['GET /v2/compra-agil/{codigo}/documentos'] = { status: r.status, keys: topLevelKeys(j), raw: j };
  } catch (e) { results['GET /v2/compra-agil/{codigo}/documentos'] = { error: String(e) }; }

  // Attempt 3: archivos sub-endpoint
  try {
    const r = await fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}/archivos`, { headers: { ticket } });
    const j = await r.json();
    results['GET /v2/compra-agil/{codigo}/archivos'] = { status: r.status, keys: topLevelKeys(j), raw: j };
  } catch (e) { results['GET /v2/compra-agil/{codigo}/archivos'] = { error: String(e) }; }

  // Attempt 4: list search for this codigo
  try {
    const r = await fetch(`${API_V2}/v2/compra-agil?codigo_externo=${encodeURIComponent(codigo)}&tamano_pagina=1`, { headers: { ticket } });
    const j = await r.json();
    const item = j?.payload?.items?.[0];
    results['GET /v2/compra-agil?codigo_externo=X (item keys)'] = {
      status: r.status,
      item_keys: item ? Object.keys(item) : [],
      item,
    };
  } catch (e) { results['list search'] = { error: String(e) }; }

  return NextResponse.json(results, {
    headers: { 'Content-Type': 'application/json' },
  });
}

function topLevelKeys(obj: unknown): string[] {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.keys(obj as Record<string, unknown>);
  }
  return [];
}
