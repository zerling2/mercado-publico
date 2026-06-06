import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id');
  if (!user_id) {
    return NextResponse.json({ error: 'user_id requerido' }, { status: 400 });
  }

  const { data, error } = await supabase()
    .from('clientes')
    .select('*')
    .eq('user_id', user_id)
    .order('nombre');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, nombre, rut, email, rubros_json, region } = body;

  if (!user_id || !nombre || !rut) {
    return NextResponse.json({ error: 'user_id, nombre y rut son requeridos' }, { status: 400 });
  }

  const { data, error } = await supabase()
    .from('clientes')
    .insert({ user_id, nombre, rut, email, rubros_json, region })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
