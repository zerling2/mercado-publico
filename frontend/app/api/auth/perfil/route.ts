import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: { user }, error } = await sb().auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  // Check if this auth user is a client contact
  const { data: contacto } = await sb()
    .from('usuarios_cliente')
    .select('empresa_id')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle();

  if (contacto) {
    return NextResponse.json({ role: 'cliente', empresa_id: contacto.empresa_id });
  }

  return NextResponse.json({ role: 'asesor' });
}
