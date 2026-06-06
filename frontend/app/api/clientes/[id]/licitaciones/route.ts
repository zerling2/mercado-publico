import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const limite = Number(req.nextUrl.searchParams.get('limite') ?? '50');

  const { data: relevancia, error: r1 } = await supabase
    .from('relevancia_compras')
    .select('compra_agil_id, relevancia_score, razon_match')
    .eq('user_id', params.id)
    .order('relevancia_score', { ascending: false })
    .limit(limite);

  if (r1) return NextResponse.json({ error: r1.message }, { status: 500 });
  if (!relevancia?.length) return NextResponse.json([]);

  const ids = relevancia.map(r => r.compra_agil_id);
  const { data: compras, error: r2 } = await supabase
    .from('compras_agiles')
    .select('id, codigo, nombre, estado, monto, region, fecha_cierre')
    .in('id', ids);

  if (r2) return NextResponse.json({ error: r2.message }, { status: 500 });

  const compraMap = new Map((compras ?? []).map(c => [c.id, c]));

  const resultado = relevancia
    .map(r => ({ ...r, compra: compraMap.get(r.compra_agil_id) }))
    .filter(r => r.compra);

  return NextResponse.json(resultado);
}
