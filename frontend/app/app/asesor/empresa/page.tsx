'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const NAVY  = '#001A4D';
const BLUE  = '#0047CC';
const WHITE = '#FFFFFF';

interface Usuario {
  id: string;
  empresa_nombre: string;
  rut: string;
  rubros_json?: string[];
  region?: string;
}

export default function EmpresaCarteraPage() {
  const router = useRouter();
  const [todos, setTodos]   = useState<Usuario[]>([]);
  const [query, setQuery]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usuarios')
      .then(r => r.json())
      .then(d => { setTodos(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const filtrados = query.trim().length < 1
    ? todos
    : todos.filter(u => {
        const q = query.toLowerCase();
        return (
          u.empresa_nombre.toLowerCase().includes(q) ||
          u.rut.replace(/[.\-]/g, '').includes(q.replace(/[.\-]/g, ''))
        );
      });

  return (
    <div style={{
      minHeight: '100vh', background: NAVY,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 16px 40px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, paddingTop: 40 }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem', cursor: 'pointer', padding: 0, marginBottom: 20 }}>
          ← Volver
        </button>

        <h1 style={{ color: WHITE, fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px' }}>
          Empresa de mi cartera
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0 0 20px' }}>
          {loading ? '…' : `${todos.length} empresa${todos.length !== 1 ? 's' : ''} registradas`}
        </p>

        {/* Search */}
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre o RUT…"
          style={{
            width: '100%', boxSizing: 'border-box', height: 50, borderRadius: 12,
            border: '1.5px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.08)', color: WHITE,
            fontSize: '0.95rem', padding: '0 16px', outline: 'none',
            marginBottom: 14,
          }}
        />

        {/* Results */}
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 32 }}>Cargando…</p>
        ) : filtrados.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: 32, fontSize: '0.85rem' }}>
            No se encontraron empresas
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtrados.map(u => (
              <button key={u.id}
                onClick={() => router.push(`/app/seleccion/${u.id}`)}
                style={{
                  background: 'rgba(255,255,255,0.06)', borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.09)', padding: '13px 16px',
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: WHITE, fontWeight: 700, fontSize: '0.9rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.empresa_nombre}
                  </p>
                  <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: '0.73rem' }}>
                    {u.rut}
                    {u.region ? ` · ${u.region}` : ''}
                  </p>
                  {u.rubros_json?.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {u.rubros_json.slice(0, 4).map(r => (
                        <span key={r} style={{
                          background: 'rgba(0,71,204,0.35)', color: '#90B8FF',
                          fontSize: '0.67rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                        }}>{r}</span>
                      ))}
                      {(u.rubros_json.length > 4) && (
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.67rem' }}>
                          +{u.rubros_json.length - 4}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'rgba(255,200,0,0.6)', marginTop: 4, display: 'block' }}>
                      Sin rubros configurados
                    </span>
                  )}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1rem', flexShrink: 0, paddingLeft: 8 }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
