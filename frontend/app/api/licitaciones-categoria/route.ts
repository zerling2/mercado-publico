import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIAS, normalizar } from '@/app/lib/categorias';

export const dynamic = 'force-dynamic';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(req: NextRequest) {
  const limite     = Math.min(Number(req.nextUrl.searchParams.get('limite') ?? 200), 500);
  const esOtros    = req.nextUrl.searchParams.get('otros') === 'true';
  const empresaIds = (req.nextUrl.searchParams.get('empresa_ids') ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);

  const { data: compras, error } = await sb()
    .from('compras_agiles')
    .select('id, codigo, nombre, organismo_nombre, monto, region, fecha_cierre, estado')
    .order('fecha_cierre', { ascending: true })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let filtradas: Array<{
    id: string; codigo: string; nombre: string;
    organismo_nombre: string | null; monto: number | null;
    region: string | null; fecha_cierre: string | null; estado: string | null;
  }>;

  if (esOtros) {
    const allNormKws = CATEGORIAS.flatMap(cat => cat.keywords.map(normalizar));
    filtradas = (compras ?? []).filter(c => {
      const n = normalizar(c.nombre ?? '');
      return !allNormKws.some(kw => n.includes(kw));
    }).slice(0, limite);
  } else {
    const keywords = (req.nextUrl.searchParams.get('keywords') ?? '')
      .split(',').map(k => k.trim()).filter(Boolean);
    if (!keywords.length) return NextResponse.json([]);
    const normKw = keywords.map(normalizar);
    filtradas = (compras ?? []).filter(c => {
      const n = normalizar(c.nombre ?? '');
      return normKw.some(kw => n.includes(kw));
    }).slice(0, limite);
  }

  if (empresaIds.length > 0 && filtradas.length > 0) {
    const compraIds = filtradas.map(c => c.id);
    const { data: rels } = await sb()
      .from('relevancia_compras')
      .select('compra_agil_id')
      .in('user_id', empresaIds)
      .in('compra_agil_id', compraIds)
      .gt('relevancia_score', 0);

    const relevantIds = new Set((rels ?? []).map(r => r.compra_agil_id as string));
    const annotated = filtradas.map(c => ({ ...c, relevante: relevantIds.has(c.id) }));
    annotated.sort((a, b) => {
      if (a.relevante === b.relevante) return 0;
      return a.relevante ? -1 : 1;
    });
    return NextResponse.json(annotated);
  }

  return NextResponse.json(filtradas);
}
