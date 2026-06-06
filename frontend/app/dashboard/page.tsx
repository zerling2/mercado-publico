import Link from 'next/link';
import type { CSSProperties } from 'react';
import { supabaseServer as supabase } from '../../lib/supabase-server';

const EMAIL_GUIDO = 'guido@imprentayvestuario.cl';

interface Relevancia {
  compra_agil_id: string;
  relevancia_score: number;
  razon_match: string | null;
}

interface CompraAgil {
  id: string;
  codigo: string;
  nombre: string;
  estado: string | null;
  monto: number | null;
  fecha_cierre: string | null;
}

interface Fila extends Relevancia {
  compra: CompraAgil;
}

async function getUsuarioId(): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', EMAIL_GUIDO)
    .single();
  return data?.id ?? null;
}

async function getFilas(userId: string): Promise<Fila[]> {
  const { data: relevancia, error: r1 } = await supabase
    .from('relevancia_compras')
    .select('compra_agil_id, relevancia_score, razon_match')
    .eq('user_id', userId)
    .order('relevancia_score', { ascending: false })
    .limit(100);

  if (r1 || !relevancia?.length) {
    if (r1) console.error('Error relevancia:', r1.message);
    return [];
  }

  const ids = relevancia.map(r => r.compra_agil_id);

  const { data: compras, error: r2 } = await supabase
    .from('compras_agiles')
    .select('id, codigo, nombre, estado, monto, fecha_cierre')
    .in('id', ids);

  if (r2 || !compras) {
    console.error('Error compras:', r2?.message);
    return [];
  }

  const comprasById = Object.fromEntries(compras.map(c => [c.id, c]));

  return relevancia
    .map(r => ({ ...r, compra: comprasById[r.compra_agil_id] }))
    .filter(r => r.compra != null) as Fila[];
}

function colorScore(score: number): string {
  if (score >= 60) return '#15803d';
  if (score >= 30) return '#b45309';
  return '#6b7280';
}

export default async function DashboardPage() {
  const userId = await getUsuarioId();

  if (!userId) {
    return (
      <main style={main}>
        <p style={{ color: '#999' }}>Usuario GUIDO no encontrado en la base de datos.</p>
      </main>
    );
  }

  const filas = await getFilas(userId);

  return (
    <main style={main}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ fontSize: '0.85rem', color: '#666', textDecoration: 'none' }}>
          ← Todas las compras
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>
          Oportunidades para GUIDO
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          {filas.length} compras ágiles relevantes · ordenadas por relevancia
        </p>
      </div>

      {filas.length === 0 ? (
        <p style={{ color: '#999' }}>
          Sin resultados aún. Visitá{' '}
          <Link href="/api/buscar-relevancia" style={{ color: '#1d4ed8' }}>
            /api/buscar-relevancia
          </Link>{' '}
          para analizar las compras.
        </p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#1d1d1f', color: '#fff' }}>
              <th style={th}>Score</th>
              <th style={th}>Código</th>
              <th style={th}>Nombre</th>
              <th style={th}>Estado</th>
              <th style={{ ...th, textAlign: 'right' }}>Monto</th>
              <th style={th}>Cierre</th>
              <th style={th}>Palabras clave</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.compra_agil_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: colorScore(f.relevancia_score) + '20',
                    color: colorScore(f.relevancia_score),
                    fontWeight: 700,
                    fontSize: '0.8rem',
                  }}>
                    {f.relevancia_score}
                  </span>
                </td>
                <td style={td}>
                  <Link href={`/dashboard/compra/${encodeURIComponent(f.compra.codigo)}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                    {f.compra.codigo}
                  </Link>
                </td>
                <td style={{ ...td, maxWidth: 280 }}>{f.compra.nombre}</td>
                <td style={td}>{f.compra.estado ?? '—'}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {f.compra.monto != null ? `$${f.compra.monto.toLocaleString('es-CL')}` : '—'}
                </td>
                <td style={td}>
                  {f.compra.fecha_cierre
                    ? new Date(f.compra.fecha_cierre).toLocaleDateString('es-CL')
                    : '—'}
                </td>
                <td style={{ ...td, color: '#666', fontSize: '0.78rem', maxWidth: 200 }}>
                  {f.razon_match ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const main: CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' };

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
};

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
