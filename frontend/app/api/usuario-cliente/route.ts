import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get('empresa_id');
  if (!empresa_id) return NextResponse.json({ error: 'empresa_id requerido' }, { status: 400 });

  const { data, error } = await sb()
    .from('usuarios_cliente')
    .select('id, nombre, activo, created_at')
    .eq('empresa_id', empresa_id)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with email from auth.users
  const ids = (data ?? []).map(u => u.id);
  const emails: Record<string, string> = {};
  for (const id of ids) {
    const { data: au } = await sb().auth.admin.getUserById(id);
    if (au?.user?.email) emails[id] = au.user.email;
  }

  return NextResponse.json((data ?? []).map(u => ({ ...u, email: emails[u.id] ?? null })));
}

export async function POST(req: NextRequest) {
  const { email, nombre, empresa_id } = await req.json().catch(() => ({}));
  if (!email || !empresa_id) {
    return NextResponse.json({ error: 'email y empresa_id requeridos' }, { status: 400 });
  }

  // Invite via Supabase Auth (sends magic-link email)
  const { data: inv, error: invErr } = await sb().auth.admin.inviteUserByEmail(email);
  if (invErr) {
    // Surface the reason clearly
    const msg = invErr.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return NextResponse.json({ error: 'Este email ya tiene cuenta. Vincúlalo manualmente.' }, { status: 409 });
    }
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }

  const userId = inv.user.id;

  // Check if already linked to this empresa
  const { data: existing } = await sb()
    .from('usuarios_cliente')
    .select('id')
    .eq('id', userId)
    .eq('empresa_id', empresa_id)
    .maybeSingle();

  if (!existing) {
    const { error: insErr } = await sb()
      .from('usuarios_cliente')
      .insert({ id: userId, empresa_id, nombre: nombre ?? null });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  await sb().from('usuarios_cliente').update({ activo: false }).eq('id', id);
  return NextResponse.json({ ok: true });
}
