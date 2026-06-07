import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: { user }, error: authError } = await sb().auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { data: uc } = await sb()
    .from('usuarios_cliente')
    .select('empresa_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!uc) return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 });

  const { data: cotizaciones } = await sb()
    .from('cotizaciones')
    .select('id, token, estado, notas, enviada_at, vista_at, respondida_at, respuesta_cliente, compra_agil_id')
    .eq('user_id', uc.empresa_id)
    .not('estado', 'eq', 'borrador')
    .order('enviada_at', { ascending: false });

  if (!cotizaciones?.length) return NextResponse.json([]);

  const compraIds = [...new Set(cotizaciones.map(c => c.compra_agil_id))];
  const { data: compras } = await sb()
    .from('compras_agiles')
    .select('id, codigo, nombre, organismo_nombre, fecha_cierre, monto')
    .in('id', compraIds);

  const compraMap = new Map((compras ?? []).map(c => [c.id, c]));

  return NextResponse.json(cotizaciones.map(c => ({
    ...c,
    compra: compraMap.get(c.compra_agil_id) ?? null,
  })));
}
