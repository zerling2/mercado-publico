import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const API_V2 = 'https://api2.mercadopublico.cl';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// GET /api/enriquecer-compras?limite=20
// Fetch full product data from MP API for compras not yet enriched
export async function GET(req: NextRequest) {
  const limite = Math.min(Number(req.nextUrl.searchParams.get('limite') ?? 20), 50);
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  if (!ticket) return NextResponse.json({ error: 'sin ticket' }, { status: 500 });

  const { data: compras } = await sb()
    .from('compras_agiles')
    .select('id, codigo')
    .eq('productos_extraidos', false)
    .order('fecha_publicacion', { ascending: false })
    .limit(limite);

  if (!compras?.length) return NextResponse.json({ pendientes: 0, procesadas: 0 });

  let procesadas = 0;
  let con_productos = 0;
  const errores: string[] = [];

  for (const compra of compras) {
    try {
      const r = await fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(compra.codigo)}`, {
        headers: { ticket },
      });
      if (!r.ok) { errores.push(`${compra.codigo}: HTTP ${r.status}`); continue; }

      const j = await r.json();
      if (j?.success === 'NOK') { errores.push(`${compra.codigo}: ${j?.errors?.[0]?.mensaje}`); continue; }

      const raw = j?.payload ?? j;
      const inst = raw?.institucion;
      const ent = raw?.entrega;
      const prods: Array<{ codigo_producto?: number; nombre?: string; descripcion?: string; cantidad?: number; unidad_medida?: string }> =
        raw?.productos_solicitados ?? raw?.items ?? [];

      // Enrich compras_agiles
      await sb().from('compras_agiles').update({
        organismo_rut: inst?.rut ?? null,
        organismo_nombre: inst?.organismo_comprador ?? inst?.nombre ?? null,
        descripcion: raw?.descripcion ?? null,
        lugar_entrega: ent?.direccion_entrega ?? null,
        plazo_entrega_dias: ent?.plazo_entrega_dias ?? null,
        productos_extraidos: true,
      }).eq('id', compra.id);

      // Save productos
      if (prods.length > 0) {
        await sb().from('compra_productos').delete().eq('compra_agil_id', compra.id);
        await sb().from('compra_productos').insert(
          prods.map(p => ({
            compra_agil_id: compra.id,
            codigo_mp: p.codigo_producto ?? null,
            nombre: p.nombre ?? '—',
            descripcion: (p.nombre && p.descripcion && p.nombre !== p.descripcion) ? p.descripcion : null,
            cantidad: p.cantidad ?? null,
            unidad_medida: p.unidad_medida ?? null,
          }))
        );
        con_productos++;
      }

      // Upsert organismo
      if (inst?.rut) {
        await sb().from('organismos').upsert({
          rut: inst.rut,
          nombre: inst.organismo_comprador ?? inst.nombre ?? inst.rut,
          unidad_compra: inst.unidad_compra ?? null,
          region_num: typeof inst.region === 'number' ? inst.region : null,
          nombre_region: inst.nombre_region ?? null,
          ultima_compra_at: raw?.fechas?.fecha_publicacion?.split(' ')[0] ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'rut', ignoreDuplicates: false });
      }

      procesadas++;
      // Rate limit: 1 req/sec
      await new Promise(r => setTimeout(r, 1100));
    } catch (e) {
      errores.push(`${compra.codigo}: ${String(e)}`);
    }
  }

  // Count remaining
  const { count } = await sb()
    .from('compras_agiles')
    .select('id', { count: 'exact', head: true })
    .eq('productos_extraidos', false);

  return NextResponse.json({
    procesadas,
    con_productos,
    pendientes_restantes: count ?? 0,
    ...(errores.length && { errores: errores.slice(0, 10) }),
  });
}
