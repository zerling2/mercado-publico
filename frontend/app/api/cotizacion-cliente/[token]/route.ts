import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  const { data: cot } = await sb()
    .from('cotizaciones')
    .select('id, user_id, compra_agil_id, estado, notas, enviada_at, respondida_at, respuesta_cliente, comentario_rechazo')
    .eq('token', token)
    .maybeSingle();

  if (!cot) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });

  // Mark as vista on first open
  if (cot.estado === 'enviada') {
    await sb().from('cotizaciones').update({
      estado:   'vista',
      vista_at: new Date().toISOString(),
    }).eq('id', cot.id);
    cot.estado = 'vista';
  }

  const [{ data: compra }, { data: usuario }, { data: items }] = await Promise.all([
    sb().from('compras_agiles')
      .select('codigo, nombre, organismo_nombre, monto, region, fecha_cierre')
      .eq('id', cot.compra_agil_id).maybeSingle(),
    sb().from('users')
      .select('empresa_nombre, rut')
      .eq('id', cot.user_id).maybeSingle(),
    sb().from('cotizacion_items')
      .select('id, nombre, descripcion, cantidad, unidad_medida, costo, margen, precio, requiere_cliente, costo_cliente, margen_cliente, precio_cliente')
      .eq('user_id', cot.user_id)
      .eq('compra_agil_id', cot.compra_agil_id)
      .order('created_at'),
  ]);

  return NextResponse.json({ cot, compra, usuario, items: items ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;
  const body = await req.json().catch(() => ({}));

  const { data: cot } = await sb()
    .from('cotizaciones')
    .select('id, user_id, compra_agil_id, estado')
    .eq('token', token)
    .maybeSingle();

  if (!cot) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  // Prevent double-response
  if (['aprobada', 'rechazada'].includes(cot.estado)) {
    return NextResponse.json({ error: 'Ya respondida' }, { status: 409 });
  }

  // Save _cliente columns for items where requiere_cliente=true
  const { items } = body as {
    items?: Array<{ id: string; costo_cliente?: number; margen_cliente?: number; precio_cliente?: number }>;
  };

  if (items?.length) {
    for (const it of items) {
      await sb().from('cotizacion_items').update({
        costo_cliente:  it.costo_cliente  ?? null,
        margen_cliente: it.margen_cliente ?? null,
        precio_cliente: it.precio_cliente ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', it.id);
    }
  }

  const now = new Date().toISOString();

  if (body.aprobar || body.completar) {
    await sb().from('cotizaciones').update({
      estado:            'aprobada',
      respuesta_cliente: 'aprobada',
      respondida_at:     now,
    }).eq('id', cot.id);
  } else if (body.rechazar) {
    await sb().from('cotizaciones').update({
      estado:             'rechazada',
      respuesta_cliente:  'rechazada',
      comentario_rechazo: body.comentario ?? null,
      respondida_at:      now,
    }).eq('id', cot.id);
  }

  return NextResponse.json({ ok: true });
}
