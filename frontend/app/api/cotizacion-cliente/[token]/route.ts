import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  const { data: cot } = await sb()
    .from('cotizaciones')
    .select('id, user_id, compra_agil_id, estado, notas, enviada_at')
    .eq('token', token)
    .maybeSingle();

  if (!cot) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });

  // Auto-mark as 'vista' the first time the client opens it
  if (cot.estado === 'enviada') {
    await sb().from('cotizaciones').update({
      estado: 'vista',
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
      .select('id, nombre, descripcion, cantidad, unidad_medida, costo, margen, precio, costo_cliente, margen_cliente, precio_cliente, requiere_cliente')
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
    .select('id, user_id, compra_agil_id')
    .eq('token', token)
    .maybeSingle();

  if (!cot) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  // Save client's item prices to _cliente columns
  const items = body.items as Array<{ id: string; costo?: number | null; margen?: number | null; precio?: number | null }> | undefined;
  if (items?.length) {
    for (const it of items) {
      await sb().from('cotizacion_items').update({
        costo_cliente:  it.costo  ?? null,
        margen_cliente: it.margen ?? null,
        precio_cliente: it.precio ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', it.id);
    }
  }

  const now = new Date().toISOString();

  // aprobar (también acepta legacy completar:true)
  if (body.aprobar || body.completar) {
    await sb().from('cotizaciones').update({
      estado: 'aprobada',
      respuesta_cliente: 'aprobada',
      respondida_at: now,
    }).eq('id', cot.id);
  } else if (body.rechazar) {
    await sb().from('cotizaciones').update({
      estado: 'rechazada',
      respuesta_cliente: 'rechazada',
      comentario_rechazo: body.comentario ?? null,
      respondida_at: now,
    }).eq('id', cot.id);
  }

  return NextResponse.json({ ok: true });
}
