import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  const { data, error } = await sb().rpc('get_cotizacion_by_token', { p_token: token });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });

  const { cot, compra, usuario, items } = data as {
    cot:     Record<string, unknown>;
    compra:  Record<string, unknown> | null;
    usuario: Record<string, unknown> | null;
    items:   unknown[];
  };

  return NextResponse.json({ cot, compra, usuario, items: items ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;
  const body = await req.json().catch(() => ({}));

  const { items, aprobar, rechazar, completar, comentario } = body as {
    items?:    Array<{ id: string; costo_cliente?: number; margen_cliente?: number; precio_cliente?: number }>;
    aprobar?:  boolean;
    rechazar?: boolean;
    completar?: boolean;
    comentario?: string;
  };

  const { data, error } = await sb().rpc('respond_cotizacion', {
    p_token:     token,
    p_aprobar:   (aprobar || completar) ? true : null,
    p_rechazar:  rechazar ? true : null,
    p_comentario: comentario ?? null,
    p_items:     items?.length ? JSON.stringify(items) : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = data as { ok?: boolean; error?: string };
  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
