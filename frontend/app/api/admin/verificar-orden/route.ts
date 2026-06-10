import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// Hobby plan: 10s max. 3 páginas × ~1s respuesta + 2 esperas × 2s = ~7s → seguro

const API_BASE = 'https://api2.mercadopublico.cl';

// No existe parámetro de sort en la API v2 — orden depende del servidor.
// Ver validacion/verificar-orden.js para detalle.

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization') ?? '';
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  const region = process.env.REGION_FILTER ?? '14';

  if (!ticket) return NextResponse.json({ error: 'MERCADO_PUBLICO_TICKET no configurado' }, { status: 500 });
  if (auth !== `Bearer ${ticket}`) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const desde = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const hasta = new Date().toISOString();

  type Fila = { pagina: number; idx: number; codigo: string; fecha_pub: string; fecha_cierre: string };
  const paginas: { num: number; items: Fila[]; error?: string }[] = [];
  const todas: Fila[] = [];

  for (let p = 1; p <= 3; p++) {
    const params = new URLSearchParams({
      publicado_desde: desde,
      publicado_hasta: hasta,
      region,
      tamano_pagina: '50',
      numero_pagina: String(p),
    });

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const r = await fetch(`${API_BASE}/v2/compra-agil?${params}`, {
        headers: { ticket },
        signal: controller.signal,
      });
      clearTimeout(timer);

      const text = await r.text();
      let json: Record<string, unknown> | null = null;
      try { json = JSON.parse(text); } catch (_) { /* no-op */ }

      if (r.status !== 200) {
        paginas.push({ num: p, items: [], error: `HTTP ${r.status}: ${text.slice(0, 100)}` });
        continue;
      }

      const items = (json as { payload?: { items?: Record<string, unknown>[] } })?.payload?.items ?? [];
      const filas: Fila[] = items.map((it, i) => ({
        pagina: p,
        idx: i,
        codigo:       String((it as Record<string, unknown>).codigo ?? '—'),
        fecha_pub:    String(((it as Record<string, unknown>).fechas as Record<string, unknown>)?.fecha_publicacion ?? '—'),
        fecha_cierre: String(((it as Record<string, unknown>).fechas as Record<string, unknown>)?.fecha_cierre ?? '—'),
      }));

      paginas.push({ num: p, items: filas });
      todas.push(...filas);
    } catch (err) {
      paginas.push({ num: p, items: [], error: String(err) });
    }

    if (p < 3) await new Promise(r => setTimeout(r, 2000));
  }

  // Verificar orden
  const quebrantos: { pos: number; anterior: Fila; actual: Fila }[] = [];
  for (let i = 1; i < todas.length; i++) {
    const ant = todas[i - 1];
    const act = todas[i];
    if (!ant.fecha_pub || !act.fecha_pub || ant.fecha_pub === '—' || act.fecha_pub === '—') continue;
    if (new Date(ant.fecha_pub).getTime() < new Date(act.fecha_pub).getTime()) {
      quebrantos.push({ pos: i, anterior: ant, actual: act });
    }
  }

  const ordenConfirmado = quebrantos.length === 0 && todas.length > 0;

  return NextResponse.json({
    veredicto: ordenConfirmado
      ? 'ORDEN CRONOLÓGICO DESCENDENTE CONFIRMADO'
      : todas.length === 0
        ? 'SIN DATOS'
        : 'ORDEN NO CRONOLÓGICO',
    total_items: todas.length,
    quebrantos_encontrados: quebrantos.length,
    primeros_quebrantos: quebrantos.slice(0, 5).map(q => ({
      anterior: `pág ${q.anterior.pagina} #${q.anterior.idx + 1} ${q.anterior.codigo} → ${q.anterior.fecha_pub}`,
      actual:   `pág ${q.actual.pagina}   #${q.actual.idx + 1} ${q.actual.codigo} → ${q.actual.fecha_pub}`,
    })),
    paginas,
  });
}
