import { NextRequest, NextResponse } from 'next/server';

const API_V2 = 'https://api2.mercadopublico.cl';

export async function GET(
  _req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  if (!ticket) {
    return NextResponse.json({ error: 'MERCADO_PUBLICO_TICKET no configurado' }, { status: 500 });
  }

  const codigo = params.codigo;

  try {
    // Try detail endpoint first
    const res = await fetch(
      `${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}`,
      { headers: { ticket }, next: { revalidate: 300 } }
    );

    if (!res.ok) {
      // Fallback: search by codigo in list
      const search = await fetch(
        `${API_V2}/v2/compra-agil?codigo=${encodeURIComponent(codigo)}&tamano_pagina=1`,
        { headers: { ticket }, next: { revalidate: 300 } }
      );
      if (!search.ok) {
        return NextResponse.json({ error: `API error ${search.status}` }, { status: 502 });
      }
      const searchJson = await search.json();
      const item = searchJson?.payload?.items?.[0];
      if (!item) {
        return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });
      }
      return NextResponse.json(normalizar(item));
    }

    const json = await res.json();
    // Detail endpoint may return the item directly or in payload
    const item = json?.payload ?? json;
    return NextResponse.json(normalizar(item));

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface RawCompra {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  estado?: { codigo?: string; nombre?: string } | string;
  montos?: {
    monto_disponible_clp?: number;
    moneda?: string;
  };
  institucion?: {
    nombre?: string;
    rut?: string;
    region?: string;
    comuna?: string;
  };
  fechas?: {
    fecha_publicacion?: string;
    fecha_cierre?: string;
    fecha_inicio_preguntas?: string;
    fecha_fin_preguntas?: string;
  };
  items?: Array<{
    descripcion?: string;
    cantidad?: number;
    unidad?: string;
    codigo_producto?: string;
    especificaciones?: string;
  }>;
  condiciones?: {
    plazo_entrega?: string | number;
    forma_pago?: string;
    garantia?: string;
    lugar_entrega?: string;
  };
  contacto?: {
    nombre?: string;
    email?: string;
    fono?: string;
  };
  preguntas_respuestas?: Array<{
    pregunta?: string;
    respuesta?: string;
    fecha?: string;
  }>;
  // Sometimes fields come at top level
  [key: string]: unknown;
}

function fecha(s?: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function normalizar(raw: RawCompra) {
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
      publicacion: fecha(raw.fechas?.fecha_publicacion),
      cierre: fecha(raw.fechas?.fecha_cierre),
      fin_preguntas: fecha(raw.fechas?.fecha_fin_preguntas),
    },
    items: (raw.items ?? []).map((it) => ({
      descripcion: it.descripcion ?? '—',
      cantidad: it.cantidad ?? null,
      unidad: it.unidad ?? null,
      codigo_producto: it.codigo_producto ?? null,
      especificaciones: it.especificaciones ?? null,
    })),
    condiciones: {
      plazo_entrega: raw.condiciones?.plazo_entrega
        ? `${raw.condiciones.plazo_entrega} días`
        : null,
      forma_pago: raw.condiciones?.forma_pago ?? null,
      garantia: raw.condiciones?.garantia ?? null,
      lugar_entrega: raw.condiciones?.lugar_entrega ?? null,
    },
    contacto: raw.contacto ?? null,
    preguntas: (raw.preguntas_respuestas ?? []).slice(0, 5),
    _raw: raw,
  };
}
