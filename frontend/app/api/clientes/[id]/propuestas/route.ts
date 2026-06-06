import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await supabase
    .from('propuestas')
    .select('id, compra_agil_id, estado, monto_total, fecha, productos_propuestos_json')
    .eq('user_id', params.id)
    .order('fecha', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data?.length) return NextResponse.json([]);

  const ids = [...new Set(data.map(p => p.compra_agil_id))];
  const supabase2 = supabase;
  const { data: compras } = await supabase2
    .from('compras_agiles')
    .select('id, codigo, nombre')
    .in('id', ids);

  const compraMap = new Map((compras ?? []).map(c => [c.id, c]));
  const resultado = data.map(p => ({ ...p, compra: compraMap.get(p.compra_agil_id) }));

  return NextResponse.json(resultado);
}
