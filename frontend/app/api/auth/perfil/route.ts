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
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const userId = getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: contacto } = await sb()
    .from('usuarios_cliente')
    .select('empresa_id')
    .eq('auth_user_id', userId)
    .eq('activo', true)
    .maybeSingle();

  if (contacto) {
    return NextResponse.json({ role: 'cliente', empresa_id: contacto.empresa_id });
  }

  return NextResponse.json({ role: 'asesor', user_id: userId });
}
