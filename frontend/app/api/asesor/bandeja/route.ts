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

  const asesorId = getUserIdFromToken(token);
  if (!asesorId) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data, error } = await sb().rpc('get_bandeja_asesor', { p_asesor_id: asesorId });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cotizaciones: data ?? [] });
}
