import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// maxDuration máximo en Hobby plan es 10s — no declarar más alto o falla

const API_BASE = 'https://api2.mercadopublico.cl';

// Protección mínima: requiere el mismo ticket como Bearer token
// GET /api/admin/medir-cuota?pagina_inicio=1&limite=15&espera_ms=1100
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const ticket = process.env.MERCADO_PUBLICO_TICKET;

  if (!ticket) {
    return NextResponse.json({ error: 'MERCADO_PUBLICO_TICKET no configurado' }, { status: 500 });
  }
  if (auth !== `Bearer ${ticket}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const paginaInicio = Math.max(1, Number(req.nextUrl.searchParams.get('pagina_inicio') ?? 1));
  const limite       = Math.min(Number(req.nextUrl.searchParams.get('limite') ?? 6), 8); // 6×1.1s ≈ 7s < 10s timeout
  const esperaMs     = Math.min(Number(req.nextUrl.searchParams.get('espera_ms') ?? 1100), 5000);
  const tamano       = Math.min(Number(req.nextUrl.searchParams.get('tamano_pagina') ?? 50), 100);

  const startTime = Date.now();
  const resultados: Array<{
    ts: string; req: number; pagina: number;
    status: number | string; items: number; detalle?: string;
  }> = [];

  let exitosos      = 0;
  let consec429     = 0;
  let primer429     : string | null = null;
  let paginaActual  = paginaInicio;

  for (let i = 0; i < limite; i++) {
    // numero_pagina es el param correcto (no 'pagina') — ver backend/lib/mercado-publico-api.js
    // La API también requiere rango de fechas; sin él devuelve 400 {"success":"NOK"}
    const desde = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const hasta = new Date().toISOString();
    const params = new URLSearchParams({
      tamano_pagina: String(tamano),
      numero_pagina: String(paginaActual),
      publicado_desde: desde,
      publicado_hasta: hasta,
    });
    const url = `${API_BASE}/v2/compra-agil?${params}`;
    const ts  = new Date().toISOString();

    let status: number | string = 0;
    let items  = 0;
    let detalle: string | undefined;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const r = await fetch(url, { headers: { ticket }, signal: controller.signal });
      clearTimeout(timer);
      status = r.status;
      const text = await r.text();
      let json: Record<string, unknown> | null = null;
      try { json = JSON.parse(text); } catch (_) { /* no-op */ }

      if (status === 200) {
        items = (json as { payload?: { items?: unknown[] } })?.payload?.items?.length ?? 0;
        consec429 = 0;
        exitosos++;
        if (items > 0) paginaActual++;
      } else if (status === 429) {
        consec429++;
        if (!primer429) primer429 = ts;
        detalle = text.slice(0, 200);
        if (consec429 >= 3) {
          resultados.push({ ts, req: i + 1, pagina: paginaActual, status, items, detalle });
          break;
        }
      } else {
        detalle = text.slice(0, 200);
      }
    } catch (err) {
      status = 'ERR';
      detalle = String(err);
    }

    resultados.push({ ts, req: i + 1, pagina: paginaActual, status, items, ...(detalle ? { detalle } : {}) });

    // No esperar en el último request
    if (i < limite - 1 && status !== 429) {
      await new Promise(r => setTimeout(r, esperaMs));
    }
  }

  const duracionSeg = ((Date.now() - startTime) / 1000).toFixed(1);
  const rpm = exitosos > 0
    ? ((exitosos / ((Date.now() - startTime) / 1000)) * 60).toFixed(1)
    : '0';

  return NextResponse.json({
    resumen: {
      exitosos,
      total_requests: resultados.length,
      primer_429: primer429 ?? 'ninguno',
      duracion_seg: duracionSeg,
      rpm_sostenido: rpm,
      pagina_inicio: paginaInicio,
      pagina_fin: paginaActual,
      tamano_pagina: tamano,
      espera_ms: esperaMs,
    },
    resultados,
  });
}
