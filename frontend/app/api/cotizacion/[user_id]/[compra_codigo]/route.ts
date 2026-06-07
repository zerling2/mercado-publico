import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

type Params = { user_id: string; compra_codigo: string };

// GET — load all data needed for the quote builder
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { user_id, compra_codigo } = params;

  // Compra base data
  const { data: compra } = await sb()
    .from('compras_agiles')
    .select('id, codigo, nombre, organismo_nombre, organismo_rut, monto, region, fecha_cierre, descripcion, lugar_entrega, plazo_entrega_dias')
    .eq('codigo', compra_codigo)
    .maybeSingle();

  if (!compra) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });

  // Items (compra_productos)
  const { data: productos } = await sb()
    .from('compra_productos')
    .select('id, nombre, descripcion, cantidad, unidad_medida')
    .eq('compra_agil_id', compra.id);

  // AI matching results for this user × compra
  const { data: matchings } = await sb()
    .from('compra_matchings')
    .select('compra_producto_id, estado, precio_sugerido, confianza, notas_ia, catalogo_producto_id')
    .eq('compra_agil_id', compra.id)
    .eq('user_id', user_id);

  // Catalog items referenced in matchings
  const catalogoIds = matchings?.map(m => m.catalogo_producto_id).filter(Boolean) ?? [];
  const { data: catalogoItems } = catalogoIds.length
    ? await sb().from('catalogo_empresas').select('id, nombre, precio_base, unidad').in('id', catalogoIds)
    : { data: [] };
  const catalogoMap = new Map((catalogoItems ?? []).map(c => [c.id, c]));

  // Relevancia record (for comment, visto)
  const { data: rel } = await sb()
    .from('relevancia_compras')
    .select('id, comentario, visto, cotizacion_descargada, relevancia_score')
    .eq('user_id', user_id)
    .eq('compra_agil_id', compra.id)
    .maybeSingle();

  // Build items list with matching data
  const matchMap = new Map((matchings ?? []).map(m => [m.compra_producto_id, m]));

  const items = (productos ?? []).map(p => {
    const m = matchMap.get(p.id);
    const cat = m?.catalogo_producto_id ? catalogoMap.get(m.catalogo_producto_id) : null;
    return {
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      cantidad: p.cantidad ?? 1,
      unidad_medida: p.unidad_medida ?? 'u',
      estado: m?.estado ?? 'sin_analisis',
      catalogo_nombre: cat?.nombre ?? null,
      precio_unitario: m?.precio_sugerido ?? cat?.precio_base ?? null,
      confianza: m?.confianza ?? null,
      nota_ia: m?.notas_ia ?? null,
    };
  });

  return NextResponse.json({
    compra: {
      id: compra.id,
      codigo: compra.codigo,
      nombre: compra.nombre,
      organismo: compra.organismo_nombre,
      monto_referencial: compra.monto,
      region: compra.region,
      fecha_cierre: compra.fecha_cierre,
      descripcion: compra.descripcion,
      lugar_entrega: compra.lugar_entrega,
      plazo_entrega_dias: compra.plazo_entrega_dias,
    },
    items,
    relevancia: rel ?? null,
  });
}

// PATCH — save comment and/or mark cotizacion_descargada
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { user_id, compra_codigo } = params;
  const body = await req.json().catch(() => ({}));

  const { data: compra } = await sb()
    .from('compras_agiles')
    .select('id')
    .eq('codigo', compra_codigo)
    .maybeSingle();

  if (!compra) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if ('comentario' in body) updates.comentario = body.comentario;
  if ('cotizacion_descargada' in body) updates.cotizacion_descargada = body.cotizacion_descargada;
  if ('visto' in body) {
    updates.visto = body.visto;
    if (body.visto) updates.fecha_visto = new Date().toISOString();
  }

  const { error } = await sb()
    .from('relevancia_compras')
    .update(updates)
    .eq('user_id', user_id)
    .eq('compra_agil_id', compra.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
