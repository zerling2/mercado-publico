import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service key for DB queries (bypasses RLS)
function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}
// Anon key for JWT verification (correct flow)
function sbAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: { user }, error: authErr } = await sbAnon().auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  // Find empresa for this auth user
  const { data: contacto } = await sb()
    .from('usuarios_cliente')
    .select('empresa_id')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle();

  if (!contacto) return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 });

  const { empresa_id } = contacto;

  // Get empresa info
  const { data: empresa } = await sb()
    .from('users')
    .select('empresa_nombre, rut')
    .eq('id', empresa_id)
    .maybeSingle();

  // Get cotizaciones for this empresa (not borrador)
  const { data: cotizaciones } = await sb()
    .from('cotizaciones')
    .select('id, token, estado, enviada_at, respondida_at, postulada_at, notas, compra_agil_id')
    .eq('user_id', empresa_id)
    .neq('estado', 'borrador')
    .order('enviada_at', { ascending: false });

  if (!cotizaciones?.length) {
    return NextResponse.json({ empresa, cotizaciones: [] });
  }

  // Enrich with compra info
  const compraIds = [...new Set(cotizaciones.map(c => c.compra_agil_id))];
  const { data: compras } = await sb()
    .from('compras_agiles')
    .select('id, codigo, nombre, organismo_nombre, fecha_cierre')
    .in('id', compraIds);

  const compraMap = new Map((compras ?? []).map(c => [c.id, c]));

  const enriched = cotizaciones.map(cot => ({
    ...cot,
    compra: compraMap.get(cot.compra_agil_id) ?? null,
  }));

  return NextResponse.json({ empresa, cotizaciones: enriched });
}
