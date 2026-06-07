import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET() {
  const { data, error } = await supabase()
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

  const sb = supabase();

  // Check if RUT already exists
  const { data: existing } = await sb
    .from('users')
    .select('id')
    .eq('rut', rut)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, id: existing.id });
  }

  const { data, error } = await sb
    .from('users')
    .insert({ empresa_nombre, rut, email, rubros_json, region })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
