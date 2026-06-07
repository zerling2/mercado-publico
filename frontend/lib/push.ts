import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

interface PushSubscription {
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
}

async function sendWebPush(sub: PushSubscription, payload: object): Promise<boolean> {
  const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail   = process.env.VAPID_EMAIL ?? 'mailto:admin@example.com';
  if (!vapidPublic || !vapidPrivate) return false;

  try {
    // Dynamic import so server doesn't crash if web-push isn't installed yet
    const webpush = await import('web-push');
    webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch {
    return false;
  }
}

export async function notifyClientes(empresaId: string, payload: object) {
  // Find all active client contacts for this empresa
  const { data: contactos } = await sb()
    .from('usuarios_cliente')
    .select('auth_user_id')
    .eq('empresa_id', empresaId)
    .eq('activo', true);

  if (!contactos?.length) return;

  const authIds = contactos.map(c => c.auth_user_id);

  // Find their push subscriptions
  const { data: subs } = await sb()
    .from('push_subscriptions')
    .select('endpoint, keys_p256dh, keys_auth')
    .in('auth_user_id', authIds)
    .eq('tipo', 'cliente');

  if (!subs?.length) return;

  await Promise.all(subs.map(s => sendWebPush(s, payload)));
}

export async function notifyAsesores(empresaId: string, payload: object) {
  const { data: subs } = await sb()
    .from('push_subscriptions')
    .select('endpoint, keys_p256dh, keys_auth')
    .eq('empresa_id', empresaId)
    .eq('tipo', 'asesor');

  if (!subs?.length) return;

  await Promise.all(subs.map(s => sendWebPush(s, payload)));
}
