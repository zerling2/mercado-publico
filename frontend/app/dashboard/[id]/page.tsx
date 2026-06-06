import Link from 'next/link';
import type { CSSProperties } from 'react';
import { supabase } from '../../../lib/supabase-client';

interface CompraAgil {
  id: string;
  codigo: string;
  nombre: string;
  estado: string | null;
  monto: number | null;
  region: string | null;
  fecha_publicacion: string | null;
  fecha_cierre: string | null;
}

async function getCompra(id: string): Promise<CompraAgil | null> {
  const { data, error } = await supabase
    .from('compras_agiles')
    .select('id, codigo, nombre, estado, monto, region, fecha_publicacion, fecha_cierre')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

function Fila({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div style={fila}>
      <span style={labelStyle}>{label}</span>
      <span style={valorStyle}>{valor ?? '—'}</span>
    </div>
  );
}

export default async function CompraDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const compra = await getCompra(params.id);

  if (!compra) {
    return (
      <main style={main}>
        <Link href="/dashboard" style={backLink}>← Volver al dashboard</Link>
        <p style={{ color: '#999', marginTop: '2rem' }}>Compra no encontrada.</p>
      </main>
    );
  }

  return (
    <main style={main}>
      <Link href="/dashboard" style={backLink}>← Volver al dashboard</Link>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0 0.25rem' }}>
        {compra.codigo}
      </h1>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Detalle de la compra ágil
      </p>

      <div style={card}>
        <Fila label="Nombre" valor={compra.nombre} />
        <Fila label="Estado" valor={compra.estado} />
        <Fila
          label="Monto"
          valor={compra.monto != null ? `$${compra.monto.toLocaleString('es-CL')}` : null}
        />
        <Fila label="Región" valor={compra.region} />
        <Fila
          label="Fecha publicación"
          valor={
            compra.fecha_publicacion
              ? new Date(compra.fecha_publicacion).toLocaleDateString('es-CL', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })
              : null
          }
        />
        <Fila
          label="Fecha cierre"
          valor={
            compra.fecha_cierre
              ? new Date(compra.fecha_cierre).toLocaleDateString('es-CL', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })
              : null
          }
        />
      </div>

      <a
        href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?codigoOC=${compra.codigo}`}
        target="_blank"
        rel="noopener noreferrer"
        style={btnExterno}
      >
        Ver en Mercado Público →
      </a>
    </main>
  );
}

const main: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' };

const backLink: CSSProperties = {
  fontSize: '0.85rem',
  color: '#666',
  textDecoration: 'none',
};

const card: CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
  marginBottom: '1.5rem',
};

const fila: CSSProperties = {
  display: 'flex',
  padding: '0.75rem 1.25rem',
  borderBottom: '1px solid #f0f0f0',
  gap: '1rem',
};

const labelStyle: CSSProperties = {
  width: 160,
  flexShrink: 0,
  color: '#666',
  fontSize: '0.875rem',
  fontWeight: 500,
};

const valorStyle: CSSProperties = {
  fontSize: '0.875rem',
  color: '#1d1d1f',
};

const btnExterno: CSSProperties = {
  display: 'inline-block',
  padding: '0.6rem 1.25rem',
  background: '#1d1d1f',
  color: '#fff',
  borderRadius: 8,
  fontSize: '0.875rem',
  textDecoration: 'none',
};
