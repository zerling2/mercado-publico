import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIAS } from '@/app/lib/categorias';

export const dynamic = 'force-dynamic';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET() {
  const { data: compras, error } = await sb()
    .from('compras_agiles')
    .select('nombre, fecha_cierre')
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();

  const items = (compras ?? []).map((c, idx) => ({
    idx,
    nombre: normalizar(c.nombre ?? ''),
    activa: !c.fecha_cierre || new Date(c.fecha_cierre) > now,
  }));

  const totals = {
    total: items.length,
    activas: items.filter(i => i.activa).length,
    cerradas: items.filter(i => !i.activa).length,
  };

  const normCategorias = CATEGORIAS.map(cat => ({
    ...cat,
    normKeywords: cat.keywords.map(normalizar),
  }));

  const matchedIndexes = new Set<number>();

  const categorias = normCategorias.map(cat => {
    const matching = items.filter(i => {
      const hit = cat.normKeywords.some(kw => i.nombre.includes(kw));
      if (hit) matchedIndexes.add(i.idx);
      return hit;
    });
    return {
      id: cat.id,
      nombre: cat.nombre,
      keywords: cat.keywords,
      count: matching.length,
      activas: matching.filter(i => i.activa).length,
      cerradas: matching.filter(i => !i.activa).length,
    };
  })
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const sinCategoria = items.filter(i => !matchedIndexes.has(i.idx));
  if (sinCategoria.length > 0) {
    categorias.push({
      id: 'otros',
      nombre: 'Otros',
      keywords: [],
      count: sinCategoria.length,
      activas: sinCategoria.filter(i => i.activa).length,
      cerradas: sinCategoria.filter(i => !i.activa).length,
    });
  }

  return NextResponse.json({ totals, categorias });
}
