import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  const asesorId = token ? getUserIdFromToken(token) : null;

  if (asesorId) {
    // Return only empresas linked to this asesor
    const { data: links } = await sb()
      .from('asesor_empresa')
      .select('empresa_id')
      .eq('asesor_id', asesorId)
      .eq('activo', true);

    if (!links?.length) return NextResponse.json([]);

    const empresaIds = links.map(l => l.empresa_id);
    const { data, error } = await sb()
      .from('users')
      .select('id, empresa_nombre, rut, email, rubros_json, region')
      .in('id', empresaIds)
      .order('empresa_nombre');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // No token — return all (backwards compat for unauthenticated access)
  const { data, error } = await sb()
    .from('users')
    .select('id, empresa_nombre, rut, email, rubros_json, region')
    .order('empresa_nombre');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { empresa_nombre, rut, email, rubros_json, region } = body;

  if (!empresa_nombre || !rut) {
    return NextResponse.json({ error: 'empresa_nombre y rut son requeridos' }, { status: 400 });
  }

  const { data: existing } = await sb()
    .from('users')
    .select('id')
    .eq('rut', rut)
    .maybeSingle();

  if (existing) return NextResponse.json({ success: true, id: existing.id });

  const { data, error } = await sb()
    .from('users')
    .insert({ empresa_nombre, rut, email, rubros_json, region })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
