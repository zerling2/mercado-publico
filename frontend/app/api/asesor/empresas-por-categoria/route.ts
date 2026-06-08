import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIAS, normalizar } from '@/app/lib/categorias';

export const dynamic = 'force-dynamic';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

function asesorIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch { return null; }
}

const normCategorias = CATEGORIAS.map(cat => ({
  id: cat.id,
  normKeywords: cat.keywords.map(normalizar),
}));

function categoriasDesdeNombres(nombres: string[]): string[] {
  const found = new Set<string>();
  for (const nombre of nombres) {
    const n = normalizar(nombre);
    for (const cat of normCategorias) {
      if (cat.normKeywords.some(kw => n.includes(kw))) found.add(cat.id);
    }
  }
  return [...found];
}

// GET /api/asesor/empresas-por-categoria
// Authorization: Bearer <asesor_token>
// Sincroniza empresa_categorias y devuelve conteo de empresas por categoría
export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const asesorId = asesorIdFromToken(token);
  if (!asesorId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Obtener empresas de la cartera del asesor
  const { data: links } = await sb()
    .from('asesor_empresa')
    .select('empresa_id')
    .eq('asesor_id', asesorId)
    .eq('activo', true);

  if (!links?.length) return NextResponse.json({});

  const empresaIds = links.map(l => l.empresa_id as string);

  // Sincronizar empresa_categorias para estas empresas
  await sincronizar(empresaIds);

  // Devolver el detalle completo empresa × categoría para filtrado client-side
  const { data: rows } = await sb()
    .from('empresa_categorias')
    .select('empresa_id, categoria_id')
    .in('empresa_id', empresaIds);

  return NextResponse.json(rows ?? []);
}

async function sincronizar(empresaIds: string[]) {
  // Cargar datos de todas las empresas en paralelo
  const [catalogoRes, usuariosRes] = await Promise.all([
    sb()
      .from('catalogo_empresas')
      .select('user_id, nombre')
      .in('user_id', empresaIds),
    sb()
      .from('users')
      .select('id, rubros_json')
      .in('id', empresaIds),
  ]);

  const catIds = new Set(CATEGORIAS.map(c => c.id));

  // Agrupar productos por empresa
  const productosPorEmpresa = new Map<string, string[]>();
  for (const p of catalogoRes.data ?? []) {
    const list = productosPorEmpresa.get(p.user_id) ?? [];
    list.push(p.nombre ?? '');
    productosPorEmpresa.set(p.user_id, list);
  }

  // Construir filas a upsert
  const filas: Array<{ empresa_id: string; categoria_id: string; fuente: string; updated_at: string }> = [];
  const now = new Date().toISOString();

  for (const usuario of usuariosRes.data ?? []) {
    const eid = usuario.id;

    // Desde catálogo: matchear nombres de productos contra keywords
    const nombres = productosPorEmpresa.get(eid) ?? [];
    for (const catId of categoriasDesdeNombres(nombres)) {
      filas.push({ empresa_id: eid, categoria_id: catId, fuente: 'catalogo', updated_at: now });
    }

    // Desde rubros_json: IDs de categoría guardados manualmente por el asesor
    const rubros: string[] = Array.isArray(usuario.rubros_json) ? usuario.rubros_json : [];
    for (const r of rubros) {
      if (catIds.has(r)) {
        // Solo insertar si no viene ya del catálogo (el catálogo tiene prioridad)
        const yaTiene = filas.some(f => f.empresa_id === eid && f.categoria_id === r);
        if (!yaTiene) {
          filas.push({ empresa_id: eid, categoria_id: r, fuente: 'manual', updated_at: now });
        }
      }
    }
  }

  if (filas.length > 0) {
    await sb()
      .from('empresa_categorias')
      .upsert(filas, { onConflict: 'empresa_id,categoria_id' });
  }
}
