import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

type Params = { user_id: string; compra_codigo: string };

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { user_id, compra_codigo } = params;
  const { items } = await req.json().catch(() => ({ items: [] }));

  const { data: compra } = await sb()
    .from('compras_agiles').select('id').eq('codigo', compra_codigo).maybeSingle();
  if (!compra) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });

  const rows = (items as Array<{
    compra_producto_id?: string;
    nombre: string;
    cantidad: number;
    unidad_medida: string;
    costo?: number | null;
    margen?: number | null;
    precio?: number | null;
    requiere_cliente?: boolean;
  }>).map(it => ({
    user_id,
    compra_agil_id: compra.id,
    compra_producto_id: it.compra_producto_id ?? null,
    nombre: it.nombre,
    cantidad: it.cantidad,
    unidad_medida: it.unidad_medida,
    costo:  it.costo  ?? null,
    margen: it.margen ?? null,
    precio: it.precio ?? null,
    requiere_cliente: it.requiere_cliente ?? false,
    updated_at: new Date().toISOString(),
  }));

  // Delete existing items and re-insert (simpler than per-row upsert)
  await sb().from('cotizacion_items')
    .delete()
    .eq('user_id', user_id)
    .eq('compra_agil_id', compra.id);

  if (rows.length > 0) {
    const { error } = await sb().from('cotizacion_items').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { user_id, compra_codigo } = params;

  const { data: compra } = await sb()
    .from('compras_agiles').select('id').eq('codigo', compra_codigo).maybeSingle();
  if (!compra) return NextResponse.json([]);

  const { data } = await sb()
    .from('cotizacion_items')
    .select('*')
    .eq('user_id', user_id)
    .eq('compra_agil_id', compra.id)
    .order('created_at');

  return NextResponse.json(data ?? []);
}
