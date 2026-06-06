import Link from 'next/link';
import type { CSSProperties } from 'react';
import { supabase } from '../../lib/supabase-client';

const EMAIL_GUIDO = 'guido@imprentayvestuario.cl';

interface CompraRelevante {
  relevancia_score: number;
  razon_match: string | null;
  fecha_descubierta: string;
  compra_agil_id: string;
  compras_agiles: {
    id: string;
    codigo: string;
    nombre: string;
    estado: string | null;
    monto: number | null;
    fecha_cierre: string | null;
  } | null;
}

async function getUsuarioId(): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', EMAIL_GUIDO)
    .single();
  return data?.id ?? null;
}

async function getComprasRelevantes(userId: string): Promise<CompraRelevante[]> {
  const { data, error } = await supabase
    .from('relevancia_compras')
    .select(`
      relevancia_score,
      razon_match,
      fecha_descubierta,
      compra_agil_id,
      compras_agiles (
        id, codigo, nombre, estado, monto, fecha_cierre
      )
    `)
    .eq('user_id', userId)
    .order('relevancia_score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error cargando relevancia:', error.message);
    return [];
  }
  return (data ?? []) as CompraRelevante[];
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

  const compras = await getComprasRelevantes(userId);

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
          {compras.length} compras ágiles relevantes · ordenadas por relevancia
        </p>
      </div>

      {compras.length === 0 ? (
        <p style={{ color: '#999' }}>
          Sin resultados aún. Ejecuta <code>node scripts/buscar-relevancia.js</code> para analizar las compras.
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
            {compras.map((c, i) => {
              const ca = c.compras_agiles;
              if (!ca) return null;
              return (
                <tr key={c.compra_agil_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: colorScore(c.relevancia_score) + '20',
                      color: colorScore(c.relevancia_score),
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}>
                      {c.relevancia_score}
                    </span>
                  </td>
                  <td style={td}>
                    <Link href={`/dashboard/${ca.id}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                      {ca.codigo}
                    </Link>
                  </td>
                  <td style={{ ...td, maxWidth: 280 }}>{ca.nombre}</td>
                  <td style={td}>{ca.estado ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {ca.monto != null ? `$${ca.monto.toLocaleString('es-CL')}` : '—'}
                  </td>
                  <td style={td}>
                    {ca.fecha_cierre ? new Date(ca.fecha_cierre).toLocaleDateString('es-CL') : '—'}
                  </td>
                  <td style={{ ...td, color: '#666', fontSize: '0.78rem', maxWidth: 200 }}>
                    {c.razon_match ?? '—'}
                  </td>
                </tr>
              );
            })}
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
