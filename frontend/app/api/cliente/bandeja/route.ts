import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

  if (!contacto) return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 });

  const { empresa_id } = contacto;

  const { data: empresa } = await sb()
    .from('users')
    .select('empresa_nombre, rut')
    .eq('id', empresa_id)
    .maybeSingle();

  const { data: cotizaciones, error: cotError } = await sb()
    .rpc('get_cotizaciones_empresa', { p_empresa_id: empresa_id });

  if (cotError) return NextResponse.json({ error: cotError.message }, { status: 500 });

  if (!cotizaciones?.length) {
    return NextResponse.json({ empresa, cotizaciones: [] });
  }

  type CotRow = { id: string; token: string; estado: string; enviada_at: string; respondida_at: string | null; postulada_at: string | null; notas: string | null; compra_agil_id: string };
  const rows = cotizaciones as CotRow[];

  const compraIds = [...new Set(rows.map(c => c.compra_agil_id))];
  const { data: compras } = await sb()
    .from('compras_agiles')
    .select('id, codigo, nombre, organismo_nombre, fecha_cierre')
    .in('id', compraIds);

  const compraMap = new Map((compras ?? []).map((c: { id: string }) => [c.id, c]));

  const enriched = rows.map(cot => ({
    ...cot,
    compra: compraMap.get(cot.compra_agil_id) ?? null,
  }));

  return NextResponse.json({ empresa, cotizaciones: enriched });
}
