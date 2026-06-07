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
      _aviso: 'MERCADO_PUBLICO_TICKET no configurado — datos parciales desde base de datos local',
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
    _aviso: 'Compra no encontrada en la API',
  });
}

async function buscarEnAPI(ticket: string, codigo: string): Promise<Record<string, unknown> | null> {
  const headers = { ticket };

  // Primary: direct detail endpoint (returns full payload including documentos)
  const r = await fetch(`${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}`, { headers });
  if (r.ok) {
    const j = await r.json();
    if (j?.success === 'NOK') {
      const errMsg = (j?.errors?.[0]?.mensaje as string) ?? 'API devolvió error';
      throw new Error(errMsg);
    }
    const item = j?.payload ?? j;
    if (item?.codigo || item?.nombre) return item as Record<string, unknown>;
  }

  throw new Error(`API no encontró la compra (estado HTTP: ${r.status})`);
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

function fmtFecha(s?: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Interfaces for the actual MP API v2 response shape ──────────────────────

interface RawDoc {
  id?: number | string;
  nombre?: string;
  nombre_archivo?: string;
  url?: string;
  url_descarga?: string;
  link?: string;
  tipo?: string;
  descripcion?: string;
  [key: string]: unknown;
}

interface RawInstitucion {
  organismo_comprador?: string;
  nombre?: string;
  rut?: string;
  unidad_compra?: string;
  region?: number | string;
  nombre_region?: string;
  comuna?: string;
}

interface RawProducto {
  codigo_producto?: number;
  nombre?: string;
  descripcion?: string;
  cantidad?: number;
  unidad_medida?: string;
  unidad?: string;
  especificaciones?: string;
}

interface RawPresupuesto {
  monto_disponible_clp?: number;
  monto_disponible?: number;
  presupuesto_estimado?: number;
  moneda?: string;
}

interface RawEntrega {
  direccion_entrega?: string;
  plazo_entrega_dias?: number;
}

interface RawEstado {
  glosa?: string;
  nombre?: string;
  codigo?: string;
}

interface RawItem {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  estado?: RawEstado | string;
  institucion?: RawInstitucion;
  presupuesto?: RawPresupuesto;
  montos?: RawPresupuesto;
  fechas?: { fecha_publicacion?: string; fecha_cierre?: string; fecha_fin_preguntas?: string };
  productos_solicitados?: RawProducto[];
  items?: RawProducto[];
  entrega?: RawEntrega;
  condiciones?: { plazo_entrega?: string | number; forma_pago?: string; garantia?: string; lugar_entrega?: string };
  contacto?: { nombre?: string; email?: string; fono?: string } | null;
  documentos?: RawDoc[];
  archivos?: RawDoc[];
  bases_tecnicas?: RawDoc[];
  adjuntos?: RawDoc[];
  [key: string]: unknown;
}

// ── Document extraction ─────────────────────────────────────────────────────

function extractDocs(raw: RawItem, codigo?: string): Array<{ nombre: string; url: string; tipo: string }> {
  const candidates: RawDoc[] = [
    ...(raw.documentos ?? []),
    ...(raw.archivos ?? []),
    ...(raw.bases_tecnicas ?? []),
    ...(raw.adjuntos ?? []),
  ];

  // Scan unknown top-level array keys that look like document lists
  const knownKeys = new Set(['documentos', 'archivos', 'bases_tecnicas', 'adjuntos', 'items', 'productos_solicitados']);
  for (const [key, val] of Object.entries(raw)) {
    if (!knownKeys.has(key) && Array.isArray(val) && val.length > 0) {
      const first = val[0] as Record<string, unknown>;
      if (typeof first === 'object' && first !== null &&
        ('url' in first || 'url_descarga' in first || 'link' in first || 'nombre_archivo' in first || 'id' in first)) {
        candidates.push(...(val as RawDoc[]));
      }
    }
  }

  return candidates
    .map(d => {
      const nombre = d.nombre ?? d.nombre_archivo ?? d.descripcion ?? 'Documento';
      let url = d.url ?? d.url_descarga ?? d.link ?? '';
      // API v2 returns docs with {id, nombre} only — route through our proxy
      if (!url && d.id !== undefined && codigo) {
        url = `/api/mp-doc/${encodeURIComponent(codigo)}/${d.id}`;
      }
      const tipo = d.tipo ?? (nombre.toLowerCase().endsWith('.pdf') ? 'pdf' : 'archivo');
      return { nombre, url, tipo };
    })
    .filter(d => d.url);
}

// ── Normalise API response to our canonical shape ───────────────────────────

function normalizar(raw: RawItem) {
  const estado = typeof raw.estado === 'object'
    ? (raw.estado?.glosa ?? raw.estado?.nombre ?? raw.estado?.codigo ?? '—')
    : (raw.estado ?? '—');

  const inst = raw.institucion;
  const pres = raw.presupuesto ?? raw.montos;
  const ent = raw.entrega;
  const prods = raw.productos_solicitados ?? raw.items ?? [];

  return {
    codigo: raw.codigo ?? '—',
    nombre: raw.nombre ?? '—',
    descripcion: raw.descripcion ?? null,
    estado,
    organismo: {
      nombre: inst?.organismo_comprador ?? inst?.nombre ?? null,
      rut: inst?.rut ?? null,
      region: inst?.nombre_region ?? (inst?.region != null ? String(inst.region) : null),
      comuna: inst?.unidad_compra ?? null,
    },
    monto: pres?.monto_disponible_clp ?? pres?.monto_disponible ?? pres?.presupuesto_estimado ?? null,
    moneda: pres?.moneda ?? 'CLP',
    fechas: {
      publicacion: fmtFecha(raw.fechas?.fecha_publicacion),
      cierre: fmtFecha(raw.fechas?.fecha_cierre),
      fin_preguntas: fmtFecha(raw.fechas?.fecha_fin_preguntas),
    },
    items: prods.map(it => ({
      descripcion: it.nombre ?? it.descripcion ?? '—',
      cantidad: it.cantidad ?? null,
      unidad: it.unidad_medida ?? it.unidad ?? null,
      // Show full description as specs when it differs from the short name
      especificaciones: (it.nombre && it.descripcion && it.nombre !== it.descripcion)
        ? it.descripcion
        : (it.especificaciones ?? null),
    })),
    condiciones: {
      plazo_entrega: ent?.plazo_entrega_dias
        ? `${ent.plazo_entrega_dias} días`
        : (raw.condiciones?.plazo_entrega ? `${raw.condiciones.plazo_entrega} días` : null),
      forma_pago: raw.condiciones?.forma_pago ?? null,
      garantia: raw.condiciones?.garantia ?? null,
      lugar_entrega: ent?.direccion_entrega ?? raw.condiciones?.lugar_entrega ?? null,
    },
    contacto: raw.contacto ?? null,
    documentos: extractDocs(raw, raw.codigo),
  };
}
