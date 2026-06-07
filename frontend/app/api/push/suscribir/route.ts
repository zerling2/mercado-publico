import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: { user }, error: authErr } = await sb().auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { endpoint, keys, tipo, empresa_id } = body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    tipo: 'cliente' | 'asesor';
    empresa_id?: string;
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
  }

  // Upsert by endpoint to avoid duplicates
  await sb().from('push_subscriptions').upsert({
    auth_user_id: user.id,
    endpoint,
    keys_p256dh: keys.p256dh,
    keys_auth:   keys.auth,
    tipo:        tipo ?? 'cliente',
    empresa_id:  empresa_id ?? null,
    updated_at:  new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { data: { user } } = await sb().auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { endpoint } = await req.json().catch(() => ({}));
  if (endpoint) {
    await sb().from('push_subscriptions').delete()
      .eq('auth_user_id', user.id).eq('endpoint', endpoint);
  } else {
    await sb().from('push_subscriptions').delete().eq('auth_user_id', user.id);
  }
  return NextResponse.json({ ok: true });
}
