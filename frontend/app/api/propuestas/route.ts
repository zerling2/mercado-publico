import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_KEY no configurada' }, { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const body = await req.json();
  const { user_id, compra_agil_id, estado, productos_propuestos_json, monto_total } = body;

  if (!user_id || !compra_agil_id || !estado) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('propuestas')
    .upsert(
      { user_id, compra_agil_id, estado, productos_propuestos_json, monto_total, fecha: new Date().toISOString() },
      { onConflict: 'user_id,compra_agil_id' }
    )
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id });
}
