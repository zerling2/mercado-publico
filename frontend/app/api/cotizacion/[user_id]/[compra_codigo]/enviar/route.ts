import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyClientes } from '@/lib/push';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

type Params = { user_id: string; compra_codigo: string };

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { user_id, compra_codigo } = params;
  const body = await req.json().catch(() => ({}));

  const { data: compra } = await sb()
    .from('compras_agiles').select('id, nombre').eq('codigo', compra_codigo).maybeSingle();
  if (!compra) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });

  const { data: existing } = await sb()
    .from('cotizaciones')
    .select('id, token')
    .eq('user_id', user_id)
    .eq('compra_agil_id', compra.id)
    .maybeSingle();

  let token: string;

  if (existing) {
    await sb().from('cotizaciones').update({
      estado:     'enviada',
      enviada_at: new Date().toISOString(),
      notas:      body.notas ?? null,
    }).eq('id', existing.id);
    token = existing.token;
  } else {
    const { data: cot, error } = await sb()
      .from('cotizaciones')
      .insert({
        user_id,
        compra_agil_id: compra.id,
        estado:     'enviada',
        notas:      body.notas ?? null,
        enviada_at: new Date().toISOString(),
      })
      .select('token')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    token = cot.token;
  }

  // Get empresa nombre for notification
  const { data: empresa } = await sb()
    .from('users')
    .select('empresa_nombre')
    .eq('id', user_id)
    .maybeSingle();

  // Notify client contacts (fire and forget)
  notifyClientes(user_id, {
    title: 'Nueva cotización recibida',
    body:  `${empresa?.empresa_nombre ?? 'Tu asesor'} envió una cotización para "${compra.nombre}"`,
    url:   `/app/cliente/bandeja`,
  }).catch(() => {});

  return NextResponse.json({ token });
}
