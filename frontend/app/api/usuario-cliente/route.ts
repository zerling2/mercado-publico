import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// GET /api/usuario-cliente?empresa_id=xxx  — list contacts
export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get('empresa_id');
  if (!empresa_id) return NextResponse.json({ error: 'empresa_id requerido' }, { status: 400 });

  const { data: contactos } = await sb()
    .from('usuarios_cliente')
    .select('id, auth_user_id, nombre, activo, created_at')
    .eq('empresa_id', empresa_id)
    .order('created_at');

  // Enrich with email from auth
  const enriched = await Promise.all(
    (contactos ?? []).map(async c => {
      const { data: { user } } = await sb().auth.admin.getUserById(c.auth_user_id);
      return { ...c, email: user?.email ?? '—' };
    })
  );

  return NextResponse.json(enriched);
}

// POST /api/usuario-cliente  — invite new contact
export async function POST(req: NextRequest) {
  const { empresa_id, email, nombre } = await req.json().catch(() => ({}));
  if (!empresa_id || !email) {
    return NextResponse.json({ error: 'empresa_id y email requeridos' }, { status: 400 });
  }

  // Check if user already exists in auth
  const { data: { users } } = await sb().auth.admin.listUsers();
  const existing = users?.find(u => u.email === email);

  let auth_user_id: string;

  if (existing) {
    auth_user_id = existing.id;
  } else {
    // Invite via Supabase Auth (sends email with magic link)
    const { data, error } = await sb().auth.admin.inviteUserByEmail(email, {
      data: { nombre, empresa_id },
    });
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('already') ? 409 : 500 }
      );
    }
    auth_user_id = data.user.id;
  }

  // Check if already linked to this empresa
  const { data: existing_link } = await sb()
    .from('usuarios_cliente')
    .select('id')
    .eq('auth_user_id', auth_user_id)
    .eq('empresa_id', empresa_id)
    .maybeSingle();

  if (existing_link) {
    // Reactivate if was soft-deleted
    await sb().from('usuarios_cliente')
      .update({ activo: true, nombre: nombre ?? null })
      .eq('id', existing_link.id);
    return NextResponse.json({ ok: true, reactivated: true });
  }

  const { error: insErr } = await sb().from('usuarios_cliente').insert({
    auth_user_id,
    empresa_id,
    nombre: nombre ?? null,
    activo: true,
  });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/usuario-cliente  — revoke access
export async function DELETE(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  await sb().from('usuarios_cliente').update({ activo: false }).eq('id', id);
  return NextResponse.json({ ok: true });
}
