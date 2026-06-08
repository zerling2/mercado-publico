import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIAS, normalizar } from '@/app/lib/categorias';

export const dynamic = 'force-dynamic';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// Palabras funcionales que no aportan al matching
const STOPWORDS = new Set([
  'para', 'como', 'este', 'esta', 'esto', 'esos', 'esas', 'ellos', 'ellas',
  'algo', 'nada', 'todo', 'todos', 'toda', 'todas', 'unos', 'unas', 'otros',
  'otras', 'cual', 'cuyo', 'cuya', 'donde', 'cuando', 'desde', 'hasta',
  'entre', 'bajo', 'cada', 'solo', 'bien', 'hace', 'años', 'tipo',
]);

function catalogoKeywords(nombres: string[]): string[] {
  const kws = new Set<string>();
  for (const nombre of nombres) {
    for (const word of normalizar(nombre).split(/\s+/)) {
      if (word.length > 3 && !STOPWORDS.has(word)) kws.add(word);
    }
  }
  return [...kws];
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
    // Obtener productos del catálogo de las empresas seleccionadas
    const { data: productos } = await sb()
      .from('catalogo_empresas')
      .select('nombre')
      .in('user_id', empresaIds);

    const kws = catalogoKeywords((productos ?? []).map(p => p.nombre ?? ''));

    const annotated = filtradas.map(c => ({
      ...c,
      relevante: kws.length > 0 && kws.some(kw => normalizar(c.nombre ?? '').includes(kw)),
    }));

    // Relevantes primero, manteniendo orden por fecha dentro de cada grupo
    annotated.sort((a, b) => {
      if (a.relevante === b.relevante) return 0;
      return a.relevante ? -1 : 1;
    });

    return NextResponse.json(annotated);
  }

  return NextResponse.json(filtradas);
}
