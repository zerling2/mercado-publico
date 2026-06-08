import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIAS, normalizar } from '@/app/lib/categorias';

export const dynamic = 'force-dynamic';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(req: NextRequest) {
  const limite  = Math.min(Number(req.nextUrl.searchParams.get('limite') ?? 200), 500);
  const esOtros = req.nextUrl.searchParams.get('otros') === 'true';

  const { data: compras, error } = await sb()
    .from('compras_agiles')
    .select('id, codigo, nombre, organismo_nombre, monto, region, fecha_cierre, estado')
    .order('fecha_cierre', { ascending: true })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (esOtros) {
    // Devuelve las licitaciones que NO matchean ninguna categoría conocida
    const allNormKws = CATEGORIAS.flatMap(cat => cat.keywords.map(normalizar));
    const otros = (compras ?? []).filter(c => {
      const n = normalizar(c.nombre ?? '');
      return !allNormKws.some(kw => n.includes(kw));
    });
    return NextResponse.json(otros.slice(0, limite));
  }

  const keywords = (req.nextUrl.searchParams.get('keywords') ?? '')
    .split(',').map(k => k.trim()).filter(Boolean);

  if (!keywords.length) return NextResponse.json([]);

  const normKw = keywords.map(normalizar);

  const filtradas = (compras ?? [])
    .filter(c => {
      const n = normalizar(c.nombre ?? '');
      return normKw.some(kw => n.includes(kw));
    })
    .slice(0, limite);

  return NextResponse.json(filtradas);
}
