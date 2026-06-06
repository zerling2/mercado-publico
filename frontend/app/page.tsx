import type { CSSProperties } from 'react';
import { supabase } from '../lib/supabase-client';

interface CompraAgil {
  id: string;
  codigo: string;
  nombre: string;
  estado: string;
  monto: number | null;
  fecha_publicacion: string | null;
  fecha_cierre: string | null;
}

async function getComprasAgiles(): Promise<CompraAgil[]> {
  const { data, error } = await supabase
    .from('compras_agiles')
    .select('id, codigo, nombre, estado, monto, fecha_publicacion, fecha_cierre')
    .order('fecha_publicacion', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error cargando compras ágiles:', error.message);
    return [];
  }

  return data ?? [];
}

export default async function Page() {
  const compras = await getComprasAgiles();

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Mercado Público Dashboard
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        {compras.length} compras ágiles — últimas 50
      </p>

      {compras.length === 0 ? (
        <p style={{ color: '#999' }}>Sin datos aún. Ejecuta el sync para cargar compras.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#1d1d1f', color: '#fff' }}>
              <th style={th}>Código</th>
              <th style={th}>Nombre</th>
              <th style={th}>Estado</th>
              <th style={th}>Monto</th>
              <th style={th}>Cierre</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={td}>{c.codigo}</td>
                <td style={{ ...td, maxWidth: 320 }}>{c.nombre}</td>
                <td style={td}>{c.estado ?? '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {c.monto != null ? `$${c.monto.toLocaleString('es-CL')}` : '—'}
                </td>
                <td style={td}>
                  {c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleDateString('es-CL') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const th: CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '0.85rem',
};

const td: CSSProperties = {
  padding: '0.65rem 1rem',
  fontSize: '0.875rem',
  borderBottom: '1px solid #f0f0f0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
