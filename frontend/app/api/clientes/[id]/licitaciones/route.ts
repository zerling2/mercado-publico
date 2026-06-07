import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limite = Number(req.nextUrl.searchParams.get('limite') ?? '100');

  const { data: relevancia, error } = await sb()
    .from('relevancia_compras')
    .select('id, compra_agil_id, relevancia_score, razon_match, visto, cotizacion_descargada, comentario')
    .eq('user_id', params.id)
    .order('relevancia_score', { ascending: false })
    .limit(limite);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!relevancia?.length) return NextResponse.json([]);

  const ids = relevancia.map(r => r.compra_agil_id);
  const { data: compras, error: e2 } = await sb()
    .from('compras_agiles')
    .select('id, codigo, nombre, estado, monto, region, fecha_cierre, organismo_nombre')
    .in('id', ids);

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const compraMap = new Map((compras ?? []).map(c => [c.id, c]));

  return NextResponse.json(
    relevancia
      .map(r => ({
        relevancia_id: r.id,
        compra_agil_id: r.compra_agil_id,
        relevancia_score: r.relevancia_score,
        razon_match: r.razon_match,
        visto: r.visto ?? false,
        cotizacion_descargada: r.cotizacion_descargada ?? false,
        comentario: r.comentario ?? null,
        compra: compraMap.get(r.compra_agil_id),
      }))
      .filter(r => r.compra)
  );
}
