import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// GET /api/catalogo/[user_id] — list all products for a client
export async function GET(
  _req: NextRequest,
  { params }: { params: { user_id: string } }
) {
  const { data, error } = await supabase()
    .from('catalogo_empresas')
    .select('id, categoria, nombre, unidad, precio_base, margen_default')
    .eq('user_id', params.user_id)
    .order('categoria')
    .order('nombre');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/catalogo/[user_id] — add one product
export async function POST(
  req: NextRequest,
  { params }: { params: { user_id: string } }
) {
  const body = await req.json();
  const { nombre, categoria, unidad, precio_base, margen_default } = body;
  if (!nombre) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 });

  const { data, error } = await supabase()
    .from('catalogo_empresas')
    .insert({
      user_id: params.user_id,
      codigo_producto: String(Date.now()), // temp unique id
      nombre: String(nombre).toUpperCase().trim(),
      categoria: categoria ?? 'VARIOS',
      unidad: unidad ?? '1',
      precio_base: precio_base ? Number(precio_base) : null,
      margen_default: margen_default ? Number(margen_default) : 20,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/catalogo/[user_id]?id=XXX — remove a product
export async function DELETE(
  req: NextRequest,
  { params }: { params: { user_id: string } }
) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const { error } = await supabase()
    .from('catalogo_empresas')
    .delete()
    .eq('id', id)
    .eq('user_id', params.user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
