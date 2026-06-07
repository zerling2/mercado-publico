import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

function decodeKeyRole(key: string | undefined): string {
  if (!key) return 'NOT SET';
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
    return payload.role ?? 'unknown';
  } catch {
    return 'decode error';
  }
}

export async function GET() {
  const keyRole = decodeKeyRole(process.env.SUPABASE_SERVICE_KEY);

  // Try reading cotizaciones with NO filters
  const { data: allCots, error: allErr } = await sb()
    .from('cotizaciones')
    .select('id, user_id, estado')
    .limit(5);

  // Try reading cotizacion_items with NO filters
  const { data: allItems, error: itemsErr } = await sb()
    .from('cotizacion_items')
    .select('id')
    .limit(3);

  return NextResponse.json({
    key_role:          keyRole,           // DEBE ser "service_role", no "anon"
    cotizaciones:      allCots ?? [],
    cotizaciones_err:  allErr?.message ?? null,
    items_count:       allItems?.length ?? 0,
    items_err:         itemsErr?.message ?? null,
  });
}
