import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LIMITE_COMPRAS = 1000;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcularRelevancia(
  nombre: string,
  keywords: string[]
): { score: number; matches: string[] } {
  const texto = normalizar(nombre);
  let score = 0;
  const matches: string[] = [];

  for (const kw of keywords) {
    const kwNorm = normalizar(kw);
    if (kwNorm && texto.includes(kwNorm) && !matches.includes(kwNorm)) {
      score += 15;
      matches.push(kwNorm);
    }
  }

  return { score: Math.min(score, 100), matches };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const body = await req.json().catch(() => ({}));
  // keywords: flat list from selected categories + user rubros
  const keywords: string[] = body.keywords ?? body.rubros ?? [];

  if (keywords.length === 0) {
    return NextResponse.json({ error: 'Debes seleccionar al menos una categoría' }, { status: 400 });
  }

  const { data: compras, error: comprasError } = await supabase
    .from('compras_agiles')
    .select('id, nombre')
    .order('fecha_publicacion', { ascending: false })
    .limit(LIMITE_COMPRAS);

  if (comprasError) {
    return NextResponse.json({ error: comprasError.message }, { status: 500 });
  }

  const relevantes = (compras ?? [])
    .map(c => {
      const { score, matches } = calcularRelevancia(c.nombre, keywords);
      return { compra_agil_id: c.id, score, matches };
    })
    .filter(r => r.score > 0);

  // Delete old relevancia for this user so stale results don't persist
  await supabase.from('relevancia_compras').delete().eq('user_id', params.id);

  let guardadas = 0;
  const errores: string[] = [];

  for (const r of relevantes) {
    const { error } = await supabase.from('relevancia_compras').insert({
      user_id: params.id,
      compra_agil_id: r.compra_agil_id,
      relevancia_score: r.score,
      razon_match: r.matches.join(', '),
      fecha_descubierta: new Date().toISOString(),
    });
    if (!error) guardadas++;
    else errores.push(error.message);
  }

  return NextResponse.json({
    success: true,
    compras_analizadas: compras?.length ?? 0,
    relevantes_encontradas: relevantes.length,
    guardadas,
    ...(errores.length > 0 && { errores: errores.slice(0, 5) }),
  });
}
