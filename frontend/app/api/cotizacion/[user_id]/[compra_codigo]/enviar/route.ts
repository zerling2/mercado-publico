import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

type Params = { user_id: string; compra_codigo: string };

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { user_id, compra_codigo } = params;
  const body = await req.json().catch(() => ({}));

  const { data: compra } = await sb()
    .from('compras_agiles').select('id').eq('codigo', compra_codigo).maybeSingle();
  if (!compra) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });

  // Check if a cotizacion already exists for this user×compra
  const { data: existing } = await sb()
    .from('cotizaciones')
    .select('id, token')
    .eq('user_id', user_id)
    .eq('compra_agil_id', compra.id)
    .maybeSingle();

  if (existing) {
    // Re-send: update estado and enviada_at
    await sb().from('cotizaciones').update({
      estado: 'enviada',
      enviada_at: new Date().toISOString(),
      notas: body.notas ?? null,
    }).eq('id', existing.id);
    return NextResponse.json({ token: existing.token });
  }

  // Create new cotizacion
  const { data: cot, error } = await sb()
    .from('cotizaciones')
    .insert({
      user_id,
      compra_agil_id: compra.id,
      estado: 'enviada',
      notas: body.notas ?? null,
      enviada_at: new Date().toISOString(),
    })
    .select('token')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token: cot.token });
}
