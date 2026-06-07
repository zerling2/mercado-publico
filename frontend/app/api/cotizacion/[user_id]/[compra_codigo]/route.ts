import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const API_V2 = 'https://api2.mercadopublico.cl';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

type Params = { user_id: string; compra_codigo: string };

async function fetchAndSaveProductos(compraId: string, compraCode: string): Promise<void> {
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  if (!ticket) return;

  const r = await fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(compraCode)}`, {
    headers: { ticket },
  });
  if (!r.ok) return;

  const j = await r.json();
  if (j?.success === 'NOK') return;

  const raw = j?.payload ?? j;
  const inst = raw?.institucion;
  const ent  = raw?.entrega;
  const prods: Array<{
    codigo_producto?: number;
    nombre?: string;
    descripcion?: string;
    cantidad?: number;
    unidad_medida?: string;
  }> = raw?.productos_solicitados ?? raw?.items ?? [];

  // Enrich compras_agiles row
  await sb().from('compras_agiles').update({
    organismo_rut:      inst?.rut ?? null,
    organismo_nombre:   inst?.organismo_comprador ?? inst?.nombre ?? null,
    descripcion:        raw?.descripcion ?? null,
    lugar_entrega:      ent?.direccion_entrega ?? null,
    plazo_entrega_dias: ent?.plazo_entrega_dias ?? null,
    productos_extraidos: true,
  }).eq('id', compraId);

  if (prods.length > 0) {
    await sb().from('compra_productos').delete().eq('compra_agil_id', compraId);
    await sb().from('compra_productos').insert(
      prods.map(p => ({
        compra_agil_id: compraId,
        codigo_mp:      p.codigo_producto ?? null,
        nombre:         p.nombre ?? '—',
        descripcion:    (p.nombre && p.descripcion && p.nombre !== p.descripcion) ? p.descripcion : null,
        cantidad:       p.cantidad ?? null,
        unidad_medida:  p.unidad_medida ?? null,
      }))
    );
  }

  // Upsert organismo
  if (inst?.rut) {
    await sb().from('organismos').upsert({
      rut:              inst.rut,
      nombre:           inst.organismo_comprador ?? inst.nombre ?? inst.rut,
      unidad_compra:    inst.unidad_compra ?? null,
      region_num:       typeof inst.region === 'number' ? inst.region : null,
      nombre_region:    inst.nombre_region ?? null,
      ultima_compra_at: raw?.fechas?.fecha_publicacion?.split(' ')[0] ?? null,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'rut', ignoreDuplicates: false });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { user_id, compra_codigo } = params;

  // Load compra
  const { data: compra } = await sb()
    .from('compras_agiles')
    .select('id, codigo, nombre, organismo_nombre, organismo_rut, monto, region, fecha_cierre, descripcion, lugar_entrega, plazo_entrega_dias, productos_extraidos')
    .eq('codigo', compra_codigo)
    .maybeSingle();

  if (!compra) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });

  // If products haven't been fetched yet, do it now (on demand)
  if (!compra.productos_extraidos) {
    await fetchAndSaveProductos(compra.id, compra.codigo);
    // Reload updated compra data
    const { data: updated } = await sb()
      .from('compras_agiles')
      .select('organismo_nombre, descripcion, lugar_entrega, plazo_entrega_dias')
      .eq('id', compra.id)
      .maybeSingle();
    if (updated) {
      compra.organismo_nombre   = updated.organismo_nombre;
      compra.descripcion        = updated.descripcion;
      compra.lugar_entrega      = updated.lugar_entrega;
      compra.plazo_entrega_dias = updated.plazo_entrega_dias;
    }
  }

  // Load products
  const { data: productos } = await sb()
    .from('compra_productos')
    .select('id, nombre, descripcion, cantidad, unidad_medida')
    .eq('compra_agil_id', compra.id)
    .order('id');

  // AI matchings for this user × compra
  const { data: matchings } = await sb()
    .from('compra_matchings')
    .select('compra_producto_id, estado, precio_sugerido, confianza, notas_ia, catalogo_producto_id')
    .eq('compra_agil_id', compra.id)
    .eq('user_id', user_id);

  // Catalog items referenced
  const catalogoIds = matchings?.map(m => m.catalogo_producto_id).filter(Boolean) ?? [];
  const { data: catalogoItems } = catalogoIds.length
    ? await sb().from('catalogo_empresas').select('id, nombre, precio_base, unidad').in('id', catalogoIds)
    : { data: [] };
  const catalogoMap = new Map((catalogoItems ?? []).map(c => [c.id, c]));
  const matchMap    = new Map((matchings ?? []).map(m => [m.compra_producto_id, m]));

  // Relevancia record (comment, visto, score)
  const { data: rel } = await sb()
    .from('relevancia_compras')
    .select('id, comentario, visto, cotizacion_descargada, relevancia_score')
    .eq('user_id', user_id)
    .eq('compra_agil_id', compra.id)
    .maybeSingle();

  const items = (productos ?? []).map(p => {
    const m   = matchMap.get(p.id);
    const cat = m?.catalogo_producto_id ? catalogoMap.get(m.catalogo_producto_id) : null;
    return {
      id:             p.id,
      nombre:         p.nombre,
      descripcion:    p.descripcion,
      cantidad:       p.cantidad ?? 1,
      unidad_medida:  p.unidad_medida ?? 'u',
      estado:         m?.estado ?? 'sin_analisis',
      catalogo_nombre: cat?.nombre ?? null,
      precio_unitario: m?.precio_sugerido ?? cat?.precio_base ?? null,
      confianza:      m?.confianza ?? null,
      nota_ia:        m?.notas_ia ?? null,
    };
  });

  return NextResponse.json({
    compra: {
      id:               compra.id,
      codigo:           compra.codigo,
      nombre:           compra.nombre,
      organismo:        compra.organismo_nombre,
      monto_referencial: compra.monto,
      region:           compra.region,
      fecha_cierre:     compra.fecha_cierre,
      descripcion:      compra.descripcion,
      lugar_entrega:    compra.lugar_entrega,
      plazo_entrega_dias: compra.plazo_entrega_dias,
    },
    items,
    relevancia: rel ?? null,
  });
}

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
  if ('comentario'             in body) updates.comentario             = body.comentario;
  if ('cotizacion_descargada'  in body) updates.cotizacion_descargada  = body.cotizacion_descargada;
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
