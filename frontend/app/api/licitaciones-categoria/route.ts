import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim();
}

export async function GET(req: NextRequest) {
  const keywords = (req.nextUrl.searchParams.get('keywords') ?? '')
    .split(',').map(k => k.trim()).filter(Boolean);
  const limite = Math.min(Number(req.nextUrl.searchParams.get('limite') ?? 80), 200);

  if (!keywords.length) return NextResponse.json([]);

  const { data: compras, error } = await sb()
    .from('compras_agiles')
    .select('id, codigo, nombre, organismo_nombre, monto, region, fecha_cierre, estado')
    .order('fecha_cierre', { ascending: true })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const normKw = keywords.map(normalizar);

  const filtradas = (compras ?? [])
    .filter(c => {
      const n = normalizar(c.nombre ?? '');
      return normKw.some(kw => n.includes(kw));
    })
    .slice(0, limite);

  return NextResponse.json(filtradas);
}
