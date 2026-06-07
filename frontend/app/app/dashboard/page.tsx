'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BLUE = '#003DA5';
const BLUE_DARK = '#00297A';
const TEXT = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';
const BG = '#F9FAFB';
const GREEN = '#059669';

interface Usuario {
  id: string;
  empresa_nombre: string;
  rut: string;
  email?: string;
  rubros_json?: string[];
  region?: string;
}

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: `1.5px solid ${BORDER}`,
  padding: '0 14px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit', color: TEXT,
};

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
      body: JSON.stringify({ empresa_nombre: form.empresa_nombre, rut: form.rut, email: form.email, rubros_json, region: form.region }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.error) { setError(json.error); return; }
    router.push(`/app/dashboard/${json.id}`);
  };

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      maxWidth: 600, margin: '0 auto',
    }}>
      {/* Header */}
      <header style={{
        background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`,
        color: WHITE, padding: '24px 20px 20px',
      }}>
        <h1 style={{ margin: '0 0 2px', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Mercado Público
        </h1>
        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>
          Gestión de licitaciones para tus clientes
        </p>
      </header>

      <div style={{ padding: '20px 16px' }}>
        {/* Add button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: TEXT }}>
              {loading ? '…' : `${usuarios.length} empresa${usuarios.length !== 1 ? 's' : ''}`}
            </h2>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: BLUE, color: WHITE, fontFamily: 'inherit',
              fontSize: '0.875rem', fontWeight: 600, padding: '0 16px',
            }}
          >
            {showForm ? 'Cancelar' : '+ Nuevo RUT'}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{
            background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`,
            padding: '16px', marginBottom: 16,
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700, color: TEXT }}>
              Agregar empresa cliente
            </h3>
            {[
              { key: 'empresa_nombre', label: 'Nombre empresa', placeholder: 'Imprenta Ejemplo Ltda.' },
              { key: 'rut', label: 'RUT', placeholder: '12.345.678-9' },
              { key: 'email', label: 'Email (opcional)', placeholder: '' },
              { key: 'rubros', label: 'Rubros (separados por coma)', placeholder: 'impresión, vestuario, grabados' },
              { key: 'region', label: 'Región (opcional)', placeholder: 'Región de Los Ríos' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.78rem', color: MUTED, display: 'block', marginBottom: 3 }}>
                  {label}
                </label>
                <input
                  style={inputStyle}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', margin: '6px 0' }}>{error}</p>}
            <button
              style={{ height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: BLUE, color: WHITE, fontFamily: 'inherit', fontSize: '0.9rem',
                fontWeight: 600, width: '100%', marginTop: 4 }}
              onClick={guardar}
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Agregar y abrir dashboard'}
            </button>
          </div>
        )}

        {/* Empresa list */}
        {loading ? (
          <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>
        ) : usuarios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>🏢</p>
            <p style={{ color: TEXT, fontWeight: 600, margin: '0 0 6px' }}>Sin empresas registradas</p>
            <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 16px' }}>
              Agrega tu primer cliente con el botón "+ Nuevo RUT".
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {usuarios.map(u => (
              <button
                key={u.id}
                onClick={() => router.push(`/app/dashboard/${u.id}`)}
                style={{
                  background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
                  padding: '14px 16px', cursor: 'pointer', fontFamily: 'inherit',
                  textAlign: 'left', width: '100%',
                  transition: 'box-shadow 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: TEXT }}>
                      {u.empresa_nombre}
                    </p>
                    <p style={{ margin: '2px 0 8px', fontSize: '0.78rem', color: MUTED }}>
                      RUT {u.rut}
                    </p>
                    {u.rubros_json?.length ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {u.rubros_json.slice(0, 4).map(r => (
                          <span key={r} style={{
                            background: BLUE + '12', color: BLUE,
                            fontSize: '0.72rem', fontWeight: 600,
                            padding: '2px 8px', borderRadius: 99,
                          }}>
                            {r}
                          </span>
                        ))}
                        {(u.rubros_json.length ?? 0) > 4 && (
                          <span style={{ fontSize: '0.72rem', color: MUTED, padding: '2px 0' }}>
                            +{u.rubros_json.length - 4} más
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#F59E0B' }}>
                        ⚠ Sin rubros configurados
                      </span>
                    )}
                  </div>
                  <span style={{ color: MUTED, fontSize: '1rem', flexShrink: 0, paddingLeft: 8 }}>›</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div style={{ marginTop: 24, padding: '14px 16px', background: WHITE,
          borderRadius: 14, border: `1px solid ${BORDER}` }}>
          <p style={{ margin: '0 0 10px', fontSize: '0.8rem', fontWeight: 700, color: MUTED }}>
            ACCESOS RÁPIDOS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { href: '/dashboard', label: 'Dashboard clásico GUIDO' },
              { href: '/api/buscar-relevancia', label: 'Recalcular relevancia (API)' },
            ].map(l => (
              <a key={l.href} href={l.href} style={{
                fontSize: '0.85rem', color: BLUE, fontWeight: 500, textDecoration: 'none',
                padding: '4px 0',
              }}>
                {l.label} →
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
