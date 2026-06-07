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

  const { data: dbRow } = await supabase()
    .from('compras_agiles')
    .select('codigo, nombre, estado, monto, region, fecha_publicacion, fecha_cierre')
    .eq('codigo', codigo)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({
      ...fromDB(dbRow),
      _fuente: 'base_de_datos',
      _aviso: 'MERCADO_PUBLICO_TICKET no configurado en Vercel — datos parciales desde base de datos local',
    });
  }

  try {
    const raw = await buscarEnAPI(ticket, codigo);
    if (raw) {
      return NextResponse.json({ ...normalizar(raw), _fuente: 'api_mp' });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ...fromDB(dbRow),
      _fuente: 'base_de_datos',
      _aviso: `API respondió con error: ${msg}`,
    });
  }

  return NextResponse.json({
    ...fromDB(dbRow),
    _fuente: 'base_de_datos',
    _aviso: 'Compra no encontrada en la API — mostrando datos desde base de datos local',
  });
}

async function buscarEnAPI(ticket: string, codigo: string): Promise<Record<string, unknown> | null> {
  const headers = { ticket };
  let foundItem: Record<string, unknown> | null = null;

  // Pattern 1: detail by codigo as path param
  try {
    const r1 = await fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}`, { headers });
    if (r1.ok) {
      const j = await r1.json();
      const item = j?.payload ?? j;
      if (item?.codigo || item?.nombre) foundItem = { ...item };
    }
  } catch { /* fall through */ }

  // Pattern 2: list search — codigo_externo param
  if (!foundItem) {
    try {
      const r2 = await fetch(
        `${API_V2}/v2/compra-agil?codigo_externo=${encodeURIComponent(codigo)}&tamano_pagina=5`,
        { headers }
      );
      if (r2.ok) {
        const j = await r2.json();
        const items: Record<string, unknown>[] = j?.payload?.items ?? [];
        const match = items.find((i) => i.codigo === codigo);
        if (match) foundItem = { ...match };
        else if (items.length === 1) foundItem = { ...items[0] };
      }
    } catch { /* fall through */ }
  }

  // Pattern 3: nombre search
  if (!foundItem) {
    try {
      const r3 = await fetch(
        `${API_V2}/v2/compra-agil?nombre=${encodeURIComponent(codigo)}&tamano_pagina=5`,
        { headers }
      );
      if (r3.ok) {
        const j = await r3.json();
        const items: Record<string, unknown>[] = j?.payload?.items ?? [];
        const match = items.find((i) => i.codigo === codigo);
        if (match) foundItem = { ...match };
      }
    } catch { /* fall through */ }
  }

  if (!foundItem) {
    throw new Error(`API no encontró la compra (intenté 3 endpoints).`);
  }

  // Augment with documents from dedicated sub-endpoints
  const [docsResult, archivosResult] = await Promise.allSettled([
    fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}/documentos`, { headers })
      .then(r => r.ok ? r.json() : null),
    fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}/archivos`, { headers })
      .then(r => r.ok ? r.json() : null),
  ]);

  const docsRaw = docsResult.status === 'fulfilled' ? docsResult.value : null;
  const archivosRaw = archivosResult.status === 'fulfilled' ? archivosResult.value : null;

  const docsList = extractArrayFromResponse(docsRaw);
  const archivosList = extractArrayFromResponse(archivosRaw);

  if (docsList?.length) foundItem._sub_documentos = docsList;
  if (archivosList?.length) foundItem._sub_archivos = archivosList;

  return foundItem;
}

// Unwrap various response shapes to get the actual array
function extractArrayFromResponse(data: unknown): unknown[] | null {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.payload)) return d.payload;
    if (d.payload && typeof d.payload === 'object') {
      const p = d.payload as Record<string, unknown>;
      for (const val of Object.values(p)) {
        if (Array.isArray(val) && val.length > 0) return val;
      }
    }
    // Check known wrapper keys
    for (const key of ['documentos', 'archivos', 'items', 'data', 'result', 'results']) {
      if (Array.isArray(d[key])) return d[key] as unknown[];
    }
    // Any array value
    for (const val of Object.values(d)) {
      if (Array.isArray(val) && val.length > 0) return val;
    }
  }
  return null;
}

function fromDB(row: Record<string, unknown> | null | undefined) {
  if (!row) return { codigo: '—', nombre: '—', descripcion: null, estado: '—', organismo: { nombre: null, rut: null, region: null, comuna: null }, monto: null, moneda: 'CLP', fechas: { publicacion: '—', cierre: '—', fin_preguntas: '—' }, items: [], condiciones: { plazo_entrega: null, forma_pago: null, garantia: null, lugar_entrega: null }, contacto: null, documentos: [] };
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
    documentos: [],
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
  documentos?: RawDoc[];
  archivos?: RawDoc[];
  bases_tecnicas?: RawDoc[];
  adjuntos?: RawDoc[];
  _sub_documentos?: unknown[];
  _sub_archivos?: unknown[];
  [key: string]: unknown;
}

interface RawDoc {
  nombre?: string;
  nombre_archivo?: string;
  url?: string;
  url_descarga?: string;
  link?: string;
  tipo?: string;
  descripcion?: string;
  fecha?: string;
  [key: string]: unknown;
}

function extractDocs(raw: RawItem): Array<{ nombre: string; url: string; tipo: string }> {
  const candidates: RawDoc[] = [
    ...(raw.documentos ?? []),
    ...(raw.archivos ?? []),
    ...(raw.bases_tecnicas ?? []),
    ...(raw.adjuntos ?? []),
    ...((raw._sub_documentos as RawDoc[] | undefined) ?? []),
    ...((raw._sub_archivos as RawDoc[] | undefined) ?? []),
  ];

  // Scan all top-level keys for arrays that look like doc lists
  const knownKeys = new Set(['documentos','archivos','bases_tecnicas','adjuntos','items','_sub_documentos','_sub_archivos']);
  for (const [key, val] of Object.entries(raw)) {
    if (!knownKeys.has(key) && Array.isArray(val) && val.length > 0) {
      const first = val[0];
      if (typeof first === 'object' && first !== null) {
        const f = first as Record<string, unknown>;
        if ('url' in f || 'url_descarga' in f || 'link' in f || 'nombre_archivo' in f) {
          candidates.push(...(val as RawDoc[]));
        }
      }
    }
  }

  return candidates
    .map(d => ({
      nombre: d.nombre ?? d.nombre_archivo ?? d.descripcion ?? 'Documento',
      url: d.url ?? d.url_descarga ?? d.link ?? '',
      tipo: d.tipo ?? 'archivo',
    }))
    .filter(d => d.url);
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
    documentos: extractDocs(raw),
  };
}
