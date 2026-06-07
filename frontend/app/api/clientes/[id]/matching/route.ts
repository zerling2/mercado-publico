import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

interface CompraProducto { id: string; nombre: string; descripcion: string | null; cantidad: number | null; unidad_medida: string | null }
interface MatchResult { index: number; estado: 'cotizable' | 'calculado' | 'fuera'; catalogo_nombre: string | null; precio_sugerido: number | null; confianza: number; nota: string }

// POST /api/clientes/[id]/matching
// Body: { limite?: number }  — process up to N compras (default 10)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 });

  const { limite = 10 } = await req.json().catch(() => ({}));
  const client = new OpenAI({ apiKey });

  // 1. Get client catalog
  const { data: catalogo } = await sb()
    .from('catalogo_empresas')
    .select('id, nombre, categoria, unidad, precio_base')
    .eq('user_id', params.id)
    .order('categoria').order('nombre');

  if (!catalogo?.length) return NextResponse.json({ error: 'Sin catálogo. Carga productos en Perfil.' }, { status: 400 });

  // 2. Get compras to process (those already in relevancia list, highest score first)
  const { data: relevantes } = await sb()
    .from('relevancia_compras')
    .select('id, compra_agil_id, relevancia_score')
    .eq('user_id', params.id)
    .order('relevancia_score', { ascending: false })
    .limit(limite);

  if (!relevantes?.length) return NextResponse.json({ procesadas: 0, actualizadas: 0 });

  const catalogStr = catalogo
    .map(c => `[${c.categoria}] ${c.nombre} — $${(c.precio_base ?? 0).toLocaleString('es-CL')}/${c.unidad}`)
    .join('\n');

  let procesadas = 0;
  let actualizadas = 0;

  for (const rel of relevantes) {
    const { data: productos } = await sb()
      .from('compra_productos')
      .select('id, nombre, descripcion, cantidad, unidad_medida')
      .eq('compra_agil_id', rel.compra_agil_id);

    let items: CompraProducto[] = productos ?? [];
    if (!items.length) {
      const { data: compra } = await sb()
        .from('compras_agiles')
        .select('nombre')
        .eq('id', rel.compra_agil_id)
        .single();
      if (!compra) continue;
      items = [{ id: 'fallback', nombre: compra.nombre, descripcion: null, cantidad: 1, unidad_medida: 'u' }];
    }

    try {
      const results = await matchWithGPT(client, catalogStr, items);

      let scoreSum = 0;
      let cotizables = 0;
      let calculados = 0;

      for (let i = 0; i < items.length; i++) {
        const m = results[i];
        if (!m) continue;

        const catalogoItem = catalogo.find(c => c.nombre === m.catalogo_nombre);
        scoreSum += m.estado === 'cotizable' ? m.confianza : m.estado === 'calculado' ? m.confianza * 0.4 : 0;
        if (m.estado === 'cotizable') cotizables++;
        if (m.estado === 'calculado') calculados++;

        if (items[i].id !== 'fallback') {
          await sb().from('compra_matchings').upsert({
            compra_agil_id: rel.compra_agil_id,
            user_id: params.id,
            compra_producto_id: items[i].id,
            catalogo_producto_id: catalogoItem?.id ?? null,
            estado: m.estado,
            precio_sugerido: m.precio_sugerido ?? catalogoItem?.precio_base ?? null,
            confianza: m.confianza,
            notas_ia: m.nota,
          }, { onConflict: 'compra_agil_id,user_id,compra_producto_id' });
        }
      }

      const nuevoScore = Math.round((scoreSum / items.length) * 100);
      const razon = `IA: ${cotizables} cotizables, ${calculados} calculados de ${items.length}`;
      await sb().from('relevancia_compras')
        .update({ relevancia_score: nuevoScore, razon_match: razon })
        .eq('id', rel.id);

      actualizadas++;
    } catch { /* skip this compra on error */ }

    procesadas++;
  }

  return NextResponse.json({ procesadas, actualizadas });
}

async function matchWithGPT(
  client: OpenAI,
  catalogStr: string,
  items: CompraProducto[]
): Promise<MatchResult[]> {
  const itemsStr = items
    .map((it, i) =>
      `${i + 1}. ${it.nombre}${it.descripcion ? `\n   "${it.descripcion}"` : ''} (cant: ${it.cantidad ?? 1} ${it.unidad_medida ?? 'u'})`
    )
    .join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Clasifica cada ítem solicitado contra el catálogo del proveedor. Responde SOLO JSON válido.

CATÁLOGO:
${catalogStr}

ÍTEMS SOLICITADOS:
${itemsStr}

JSON de respuesta:
{"items":[{"index":1,"estado":"cotizable|calculado|fuera","catalogo_nombre":"nombre exacto o null","precio_sugerido":55000,"confianza":0.95,"nota":"razón breve"}]}

Reglas:
- cotizable: coincidencia directa, se puede cotizar con precio del catálogo
- calculado: proveedor puede hacerlo pero dimensiones/specs son custom
- fuera: completamente fuera del catálogo`,
    }],
  });

  const text = response.choices[0]?.message?.content ?? '';
  const parsed = JSON.parse(text);
  return parsed.items as MatchResult[];
}
