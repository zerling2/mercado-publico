'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BLUE = '#003DA5';
const BLUE_LIGHT = '#E8EEFA';
const TEXT = '#0A0A0A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';

const btn = (primary = true): React.CSSProperties => ({
  height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 600,
  padding: '0 20px',
  background: primary ? BLUE : WHITE,
  color: primary ? WHITE : BLUE,
  ...(primary ? {} : { border: `1.5px solid ${BLUE}` }),
});

const input: React.CSSProperties = {
  height: 44, borderRadius: 10, border: `1.5px solid ${BORDER}`,
  padding: '0 14px', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit', outline: 'none', color: TEXT,
};

interface Usuario {
  id: string;
  empresa_nombre: string;
  rut: string;
  email?: string;
  rubros_json?: string[];
  region?: string;
}

export default function DashboardIndexPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ empresa_nombre: '', rut: '', email: '', rubros: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/usuarios')
      .then(r => r.json())
      .then(d => { setUsuarios(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const guardar = async () => {
    if (!form.empresa_nombre || !form.rut) { setError('Nombre y RUT son obligatorios'); return; }
    setSaving(true); setError('');
    const rubros_json = form.rubros.split(',').map(r => r.trim()).filter(Boolean);
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rubros_json }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.error) { setError(json.error); return; }
    router.push(`/app/dashboard/${json.id}`);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#F9FAFB',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      maxWidth: 600, margin: '0 auto',
    }}>
      <header style={{ background: BLUE, color: WHITE, padding: '20px 20px 16px' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Mercado Público</h1>
        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.7 }}>Selecciona o agrega un cliente</p>
      </header>

      <div style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: TEXT }}>Empresas</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: MUTED }}>{usuarios.length} registrada{usuarios.length !== 1 ? 's' : ''}</p>
          </div>
          <button style={btn()} onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancelar' : '+ Nuevo RUT'}
          </button>
        </div>

        {showForm && (
          <div style={{ background: BLUE_LIGHT, borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: BLUE }}>Agregar empresa</h3>
            {[
              { key: 'empresa_nombre', label: 'Nombre empresa' },
              { key: 'rut', label: 'RUT', placeholder: '12.345.678-9' },
              { key: 'email', label: 'Email' },
              { key: 'rubros', label: 'Rubros (separados por coma)', placeholder: 'impresión, vestuario, grabados' },
              { key: 'region', label: 'Región' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.8rem', color: MUTED, display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  style={input}
                  placeholder={placeholder ?? ''}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            {error && <p style={{ color: 'red', fontSize: '0.85rem', margin: '8px 0' }}>{error}</p>}
            <button style={{ ...btn(), marginTop: 8 }} onClick={guardar} disabled={saving}>
              {saving ? 'Guardando…' : 'Agregar empresa'}
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>
        ) : usuarios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: MUTED }}>No hay empresas aún.</p>
            <button style={{ ...btn(), marginTop: 12 }} onClick={() => setShowForm(true)}>Agregar primera empresa</button>
          </div>
        ) : (
          usuarios.map(u => (
            <button
              key={u.id}
              onClick={() => router.push(`/app/dashboard/${u.id}`)}
              style={{
                width: '100%', textAlign: 'left', background: WHITE,
                borderRadius: 16, border: `1px solid ${BORDER}`, padding: '16px 20px',
                marginBottom: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: TEXT }}>{u.empresa_nombre}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: MUTED }}>RUT {u.rut}</p>
                  {u.rubros_json?.length ? (
                    <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: BLUE }}>
                      {u.rubros_json.join(' · ')}
                    </p>
                  ) : null}
                </div>
                <span style={{ color: BLUE, fontSize: '1.2rem' }}>›</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
