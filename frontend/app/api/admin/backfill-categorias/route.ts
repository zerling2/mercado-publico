import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIAS, normalizar } from '@/app/lib/categorias';

export const dynamic = 'force-dynamic';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

const normCategorias = CATEGORIAS.map(cat => ({
  id: cat.id,
  normKeywords: cat.keywords.map(normalizar),
}));

function calcularCategorias(nombre: string): string[] {
  const n = normalizar(nombre);
  return normCategorias
    .filter(cat => cat.normKeywords.some(kw => n.includes(kw)))
    .map(cat => cat.id);
}

export async function GET() {
  const { data: compras, error } = await sb()
    .from('compras_agiles')
    .select('id, nombre')
    .is('categorias', null)
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let actualizadas = 0;
  let errores = 0;

  for (const c of compras ?? []) {
    const categorias = calcularCategorias(c.nombre ?? '');
    const { error: upErr } = await sb()
      .from('compras_agiles')
      .update({ categorias: categorias.length > 0 ? categorias : ['otros'] })
      .eq('id', c.id);
    if (upErr) errores++;
    else actualizadas++;
  }

  return NextResponse.json({
    total: compras?.length ?? 0,
    actualizadas,
    errores,
  });
}
