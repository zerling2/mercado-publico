import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LIMITE_COMPRAS = 500;

const PALABRAS_CLAVE: { term: string; peso: number }[] = [
  { term: 'impresion',      peso: 15 },
  { term: 'imprimir',       peso: 12 },
  { term: 'impreso',        peso: 10 },
  { term: 'folleteria',     peso: 15 },
  { term: 'folleto',        peso: 12 },
  { term: 'estampado',      peso: 15 },
  { term: 'grabado',        peso: 15 },
  { term: 'indumentaria',   peso: 20 },
  { term: 'vestuario',      peso: 18 },
  { term: 'prenda',         peso: 15 },
  { term: 'uniforme',       peso: 15 },
  { term: 'polera',         peso: 15 },
  { term: 'camiseta',       peso: 12 },
  { term: 'jockey',         peso: 12 },
  { term: 'pechera',        peso: 12 },
  { term: 'ropa',           peso:  8 },
  { term: 'difusion',       peso: 20 },
  { term: 'publicidad',     peso: 15 },
  { term: 'bandera',        peso: 15 },
  { term: 'estandarte',     peso: 15 },
  { term: 'pendon',         peso: 15 },
  { term: 'banner',         peso: 12 },
  { term: 'afiche',         peso: 12 },
  { term: 'diptico',        peso: 12 },
  { term: 'triptico',       peso: 12 },
  { term: 'reconocimiento', peso: 20 },
  { term: 'medalla',        peso: 15 },
  { term: 'trofeo',         peso: 15 },
  { term: 'galvano',        peso: 15 },
  { term: 'placa',          peso: 10 },
  { term: 'souvenir',       peso: 18 },
  { term: 'promocional',    peso: 15 },
  { term: 'taza',           peso: 12 },
  { term: 'mug',            peso: 12 },
  { term: 'agenda',         peso: 12 },
  { term: 'credencial',     peso: 12 },
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcularRelevancia(nombre: string, rubros: string[]): { score: number; matches: string[] } {
  const texto = normalizar(nombre);
  let score = 0;
  const matches: string[] = [];

  for (const { term, peso } of PALABRAS_CLAVE) {
    if (texto.includes(term)) {
      score += peso;
      matches.push(term);
    }
  }

  for (const rubro of rubros) {
    const rubroNorm = normalizar(rubro);
    if (texto.includes(rubroNorm) && !matches.includes(rubroNorm)) {
      score += 10;
      matches.push(rubroNorm);
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
  const rubros: string[] = body.rubros ?? [];

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
      const { score, matches } = calcularRelevancia(c.nombre, rubros);
      return { compra_agil_id: c.id, score, matches };
    })
    .filter(r => r.score > 0);

  let guardadas = 0;
  const errores: string[] = [];

  for (const r of relevantes) {
    const { error } = await supabase.from('relevancia_compras').upsert(
      {
        user_id: params.id,
        compra_agil_id: r.compra_agil_id,
        relevancia_score: r.score,
        razon_match: r.matches.join(', '),
        fecha_descubierta: new Date().toISOString(),
      },
      { onConflict: 'user_id,compra_agil_id' }
    );
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
