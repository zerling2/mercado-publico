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

  const [{ data: compra }, { data: usuario }, { data: items }] = await Promise.all([
    sb().from('compras_agiles')
      .select('codigo, nombre, organismo_nombre, monto, region, fecha_cierre')
      .eq('id', cot.compra_agil_id).maybeSingle(),
    sb().from('users')
      .select('empresa_nombre, rut')
      .eq('id', cot.user_id).maybeSingle(),
    sb().from('cotizacion_items')
      .select('*')
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

  // Client updates individual items
  const { items } = body as {
    items?: Array<{ id: string; costo?: number; margen?: number; precio?: number }>;
  };

  if (items?.length) {
    for (const it of items) {
      await sb().from('cotizacion_items').update({
        costo:  it.costo  ?? null,
        margen: it.margen ?? null,
        precio: it.precio ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', it.id);
    }
  }

  // Mark as completada if body says so
  if (body.completar) {
    await sb().from('cotizaciones').update({
      estado: 'completada',
      completada_at: new Date().toISOString(),
    }).eq('id', cot.id);
  }

  return NextResponse.json({ ok: true });
}
