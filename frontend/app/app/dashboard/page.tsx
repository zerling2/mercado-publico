'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const NAVY  = '#001A4D';
const BLUE  = '#0047CC';
const WHITE = '#FFFFFF';
const TEXT  = '#0A0F1E';
const MUTED = '#5A6480';
const BORDER= '#D6E0F5';
const RED   = '#C01048';

interface Usuario {
  id: string;
  empresa_nombre: string;
  rut: string;
  email?: string;
  rubros_json?: string[];
  region?: string;
}

export default function EntradaPage() {
  const router = useRouter();
  const [todos, setTodos]     = useState<Usuario[]>([]);
  const [query, setQuery]     = useState('');
  const [resultado, setResultado] = useState<Usuario | null | 'notfound'>(null);
  const [showReg, setShowReg] = useState(false);
  const [form, setForm]       = useState({ empresa_nombre: '', rut: '', email: '', rubros: '', region: '' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch('/api/usuarios').then(r => r.json()).then(d => setTodos(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    const q = query.trim().replace(/[.\-]/g, '');
    if (q.length < 3) { setResultado(null); return; }
    const match = todos.find(u =>
      u.rut.replace(/[.\-]/g, '').toLowerCase().includes(q.toLowerCase()) ||
      u.empresa_nombre.toLowerCase().includes(q.toLowerCase())
    );
    setResultado(match ?? 'notfound');
  }, [query, todos]);

  const guardar = async () => {
    if (!form.empresa_nombre || !form.rut) { setError('Nombre y RUT son obligatorios'); return; }
    setSaving(true); setError('');
    const rubros_json = form.rubros.split(',').map(r => r.trim()).filter(Boolean);
    const res = await fetch('/api/usuarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rubros_json }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.error) { setError(json.error); return; }
    router.push(`/app/seleccion/${json.id}`);
  };

  const found = resultado !== null && resultado !== 'notfound' ? resultado : null;
  const notFound = resultado === 'notfound';

  return (
    <div style={{
      minHeight: '100vh', background: NAVY,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 16px 40px',
    }}>
      {/* Logo / brand */}
      <div style={{ width: '100%', maxWidth: 480, paddingTop: 56, marginBottom: 40, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', color: WHITE, fontWeight: 900 }}>
            M
          </div>
          <span style={{ color: WHITE, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
            Mercado Público
          </span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', margin: 0 }}>
          Inteligencia de licitaciones
        </p>
      </div>

      {/* Search card */}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.1)', padding: '24px 20px' }}>

          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            display: 'block', marginBottom: 8 }}>
            RUT o nombre de empresa
          </label>

          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ej: 12.345.678-9 o Imprenta..."
            style={{
              width: '100%', boxSizing: 'border-box',
              height: 52, borderRadius: 12,
              border: '1.5px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.09)',
              color: WHITE, fontSize: '1rem', padding: '0 16px',
              outline: 'none', caretColor: BLUE,
            }}
          />

          {found && (
            <div style={{ marginTop: 14 }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.12)', padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: WHITE, fontWeight: 700, fontSize: '0.95rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {found.empresa_nombre}
                  </p>
                  <p style={{ margin: '3px 0 8px', color: 'rgba(255,255,255,0.45)',
                    fontSize: '0.76rem' }}>
                    RUT {found.rut}
                  </p>
                  {found.rubros_json?.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {found.rubros_json.slice(0, 5).map(r => (
                        <span key={r} style={{ background: 'rgba(0,71,204,0.4)',
                          color: '#90B8FF', fontSize: '0.7rem', fontWeight: 600,
                          padding: '2px 8px', borderRadius: 99 }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,200,0,0.8)' }}>
                      Sin rubros configurados
                    </span>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/app/seleccion/${found.id}`)}
                  style={{
                    flexShrink: 0, height: 40, borderRadius: 10, border: 'none',
                    background: BLUE, color: WHITE, fontSize: '0.85rem', fontWeight: 700,
                    padding: '0 16px', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Entrar →
                </button>
              </div>
            </div>
          )}

          {notFound && (
            <div style={{ marginTop: 14 }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', margin: '0 0 10px' }}>
                No encontrado en la base de datos
              </p>
              <button
                onClick={() => { setShowReg(v => !v); setForm(f => ({ ...f, rut: query })); }}
                style={{ height: 38, borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.2)',
                  background: 'transparent', color: WHITE, fontSize: '0.82rem', fontWeight: 600,
                  padding: '0 14px', cursor: 'pointer' }}
              >
                {showReg ? 'Cancelar' : '+ Registrar empresa'}
              </button>
            </div>
          )}
        </div>

        {showReg && (
          <div style={{ background: WHITE, borderRadius: 20, border: `1px solid ${BORDER}`,
            padding: '20px', marginTop: 12 }}>
            <p style={{ margin: '0 0 14px', fontWeight: 800, color: NAVY, fontSize: '0.95rem' }}>
              Nueva empresa
            </p>
            {[
              { key: 'empresa_nombre', label: 'Nombre empresa', placeholder: 'Imprenta Ejemplo Ltda.' },
              { key: 'rut',            label: 'RUT',             placeholder: '12.345.678-9' },
              { key: 'email',          label: 'Email',           placeholder: 'opcional' },
              { key: 'rubros',         label: 'Rubros (coma)',   placeholder: 'impresión, vestuario' },
              { key: 'region',         label: 'Región',          placeholder: 'opcional' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: MUTED,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  display: 'block', marginBottom: 4 }}>
                  {label}
                </label>
                <input
                  style={{ width: '100%', boxSizing: 'border-box', height: 42, borderRadius: 10,
                    border: `1.5px solid ${BORDER}`, padding: '0 12px',
                    fontSize: '0.9rem', color: TEXT, outline: 'none' }}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            {error && (
              <p style={{ fontSize: '0.82rem', color: RED, margin: '4px 0 8px', fontWeight: 600 }}>
                {error}
              </p>
            )}
            <button
              style={{ width: '100%', height: 46, borderRadius: 12, border: 'none',
                background: BLUE, color: WHITE, fontSize: '0.92rem', fontWeight: 700,
                cursor: 'pointer', marginTop: 4 }}
              onClick={guardar} disabled={saving}
            >
              {saving ? 'Guardando…' : 'Crear y abrir dashboard'}
            </button>
          </div>
        )}

        {!query && todos.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              margin: '0 0 8px 4px' }}>
              Empresas registradas
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {todos.slice(0, 6).map(u => (
                <button key={u.id} onClick={() => router.push(`/app/seleccion/${u.id}`)}
                  style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)', padding: '11px 14px',
                    cursor: 'pointer', textAlign: 'left', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, color: WHITE, fontSize: '0.88rem', fontWeight: 600 }}>
                      {u.empresa_nombre}
                    </p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>
                      {u.rut}
                    </p>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
