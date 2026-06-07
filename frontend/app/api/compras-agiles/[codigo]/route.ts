import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const API_V2 = 'https://api2.mercadopublico.cl';

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  const codigo = params.codigo;

  // Always try to get base data from our DB first
  const { data: dbRow } = await supabase()
    .from('compras_agiles')
    .select('codigo, nombre, estado, monto, region, fecha_publicacion, fecha_cierre')
    .eq('codigo', codigo)
    .maybeSingle();

  // If no ticket, return what we have from DB with a note
  if (!ticket) {
    return NextResponse.json({
      ...fromDB(dbRow),
      _fuente: 'base_de_datos',
      _aviso: 'MERCADO_PUBLICO_TICKET no configurado en Vercel — datos parciales desde base de datos local',
    });
  }

  // Try to get full data from MP API
  try {
    const raw = await buscarEnAPI(ticket, codigo);
    if (raw) {
      return NextResponse.json({ ...normalizar(raw), _fuente: 'api_mp' });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // API failed — return DB data with error note
    return NextResponse.json({
      ...fromDB(dbRow),
      _fuente: 'base_de_datos',
      _aviso: `API respondió con error: ${msg}`,
    });
  }

  // API returned no results — return DB data
  return NextResponse.json({
    ...fromDB(dbRow),
    _fuente: 'base_de_datos',
    _aviso: 'Compra no encontrada en la API — mostrando datos desde base de datos local',
  });
}

// Try multiple endpoint patterns against the MP API
async function buscarEnAPI(ticket: string, codigo: string): Promise<Record<string, unknown> | null> {
  const headers = { ticket };

  // Pattern 1: detail by codigo as path param
  const r1 = await fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}`, { headers });
  if (r1.ok) {
    const j = await r1.json();
    const item = j?.payload ?? j;
    if (item?.codigo || item?.nombre) return item;
  }

  // Pattern 2: list search — codigo_externo param
  const r2 = await fetch(
    `${API_V2}/v2/compra-agil?codigo_externo=${encodeURIComponent(codigo)}&tamano_pagina=5`,
    { headers }
  );
  if (r2.ok) {
    const j = await r2.json();
    const items: Record<string, unknown>[] = j?.payload?.items ?? [];
    const match = items.find((i) => i.codigo === codigo);
    if (match) return match;
    if (items.length === 1) return items[0];
  }

  // Pattern 3: list search — nombre contains codigo (sometimes the code is embedded)
  const r3 = await fetch(
    `${API_V2}/v2/compra-agil?nombre=${encodeURIComponent(codigo)}&tamano_pagina=5`,
    { headers }
  );
  if (r3.ok) {
    const j = await r3.json();
    const items: Record<string, unknown>[] = j?.payload?.items ?? [];
    const match = items.find((i) => i.codigo === codigo);
    if (match) return match;
  }

  // All patterns failed — throw last status
  throw new Error(`API no encontró la compra (intenté 3 endpoints). Último estado: ${r2.status}`);
}

// Build a response from what we have in our Supabase table
function fromDB(row: Record<string, unknown> | null | undefined) {
  if (!row) return { codigo: '—', nombre: '—', descripcion: null, estado: '—', organismo: { nombre: null, rut: null, region: null, comuna: null }, monto: null, moneda: 'CLP', fechas: { publicacion: '—', cierre: '—', fin_preguntas: '—' }, items: [], condiciones: { plazo_entrega: null, forma_pago: null, garantia: null, lugar_entrega: null }, contacto: null };
  return {
    codigo: row.codigo ?? '—',
    nombre: row.nombre ?? '—',
    descripcion: null,
    estado: row.estado ?? '—',
    organismo: { nombre: null, rut: null, region: String(row.region ?? '—'), comuna: null },
    monto: row.monto ?? null,
    moneda: 'CLP',
    fechas: {
      publicacion: fmtFecha(row.fecha_publicacion as string | undefined),
      cierre: fmtFecha(row.fecha_cierre as string | undefined),
      fin_preguntas: '—',
    },
    items: [],
    condiciones: { plazo_entrega: null, forma_pago: null, garantia: null, lugar_entrega: null },
    contacto: null,
  };
}

function fmtFecha(s?: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
}

interface RawItem {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  estado?: { codigo?: string; nombre?: string } | string;
  montos?: { monto_disponible_clp?: number; moneda?: string };
  institucion?: { nombre?: string; rut?: string; region?: string; comuna?: string };
  fechas?: { fecha_publicacion?: string; fecha_cierre?: string; fecha_fin_preguntas?: string };
  items?: Array<{ descripcion?: string; cantidad?: number; unidad?: string; especificaciones?: string }>;
  condiciones?: { plazo_entrega?: string | number; forma_pago?: string; garantia?: string; lugar_entrega?: string };
  contacto?: { nombre?: string; email?: string; fono?: string };
  [key: string]: unknown;
}

function normalizar(raw: RawItem) {
  const estado = typeof raw.estado === 'object'
    ? (raw.estado?.nombre ?? raw.estado?.codigo ?? '—')
    : (raw.estado ?? '—');

  return {
    codigo: raw.codigo ?? '—',
    nombre: raw.nombre ?? '—',
    descripcion: raw.descripcion ?? null,
    estado,
    organismo: {
      nombre: raw.institucion?.nombre ?? null,
      rut: raw.institucion?.rut ?? null,
      region: raw.institucion?.region ?? null,
      comuna: raw.institucion?.comuna ?? null,
    },
    monto: raw.montos?.monto_disponible_clp ?? null,
    moneda: raw.montos?.moneda ?? 'CLP',
    fechas: {
      publicacion: fmtFecha(raw.fechas?.fecha_publicacion),
      cierre: fmtFecha(raw.fechas?.fecha_cierre),
      fin_preguntas: fmtFecha(raw.fechas?.fecha_fin_preguntas),
    },
    items: (raw.items ?? []).map(it => ({
      descripcion: it.descripcion ?? '—',
      cantidad: it.cantidad ?? null,
      unidad: it.unidad ?? null,
      especificaciones: it.especificaciones ?? null,
    })),
    condiciones: {
      plazo_entrega: raw.condiciones?.plazo_entrega ? `${raw.condiciones.plazo_entrega} días` : null,
      forma_pago: raw.condiciones?.forma_pago ?? null,
      garantia: raw.condiciones?.garantia ?? null,
      lugar_entrega: raw.condiciones?.lugar_entrega ?? null,
    },
    contacto: raw.contacto ?? null,
  };
}
