'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Usuario {
  id: string;
  empresa_nombre: string;
  rut: string;
  email?: string;
  rubros_json?: string[];
  region?: string;
}

interface Licitacion {
  compra_agil_id: string;
  relevancia_score: number;
  razon_match: string | null;
  compra?: {
    id: string;
    codigo: string;
    nombre: string;
    estado: string | null;
    monto: number | null;
    region: string | null;
    fecha_cierre: string | null;
  };
}

interface Propuesta {
  id: string;
  compra_agil_id: string;
  estado: string;
  monto_total: number | null;
  fecha: string | null;
  compra?: { id: string; codigo: string; nombre: string };
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

const BLUE = '#003DA5';
const BLUE_LIGHT = '#E8EEFA';
const TEXT = '#0A0A0A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pesos(n: number | null) {
  if (n == null) return '—';
  return `$${n.toLocaleString('es-CL')}`;
}

function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function badge(estado: string) {
  const map: Record<string, { bg: string; color: string }> = {
    postulada:   { bg: '#D1FAE5', color: '#065F46' },
    completa:    { bg: '#DBEAFE', color: '#1E40AF' },
    incompleta:  { bg: '#FEF3C7', color: '#92400E' },
  };
  const s = map[estado] ?? { bg: '#F3F4F6', color: MUTED };
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: s.bg, color: s.color }}>
      {estado}
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`,
  padding: '16px 20px', marginBottom: 12,
};

const btn = (primary = true): React.CSSProperties => ({
  height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 600, padding: '0 20px',
  background: primary ? BLUE : WHITE, color: primary ? WHITE : BLUE,
  ...(primary ? {} : { border: `1.5px solid ${BLUE}` }),
});

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: `1.5px solid ${BORDER}`,
  padding: '0 14px', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit', outline: 'none', color: TEXT,
};

// ─── TabBar ───────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: number; onChange: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: WHITE }}>
      {['Perfil', 'Licitaciones', 'Propuestas'].map((t, i) => (
        <button key={t} onClick={() => onChange(i)} style={{
          flex: 1, height: 48, border: 'none', background: 'none', cursor: 'pointer',
          fontSize: '0.9rem', fontWeight: active === i ? 700 : 400,
          color: active === i ? BLUE : MUTED,
          borderBottom: active === i ? `2px solid ${BLUE}` : '2px solid transparent',
          transition: 'all 0.2s', fontFamily: 'inherit',
        }}>{t}</button>
      ))}
    </div>
  );
}

// ─── Tab 1: Perfil ────────────────────────────────────────────────────────────

function PerfilTab({ userId }: { userId: string }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ empresa_nombre: '', rut: '', email: '', rubros: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`/api/usuarios/${userId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setUsuario(d);
          setForm({
            empresa_nombre: d.empresa_nombre ?? '',
            rut: d.rut ?? '',
            email: d.email ?? '',
            rubros: (d.rubros_json ?? []).join(', '),
            region: d.region ?? '',
          });
        }
      });
  }, [userId]);

  const guardar = async () => {
    setSaving(true); setMsg('');
    const rubros_json = form.rubros.split(',').map(r => r.trim()).filter(Boolean);
    const res = await fetch(`/api/usuarios/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rubros_json }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.error) { setMsg(json.error); return; }
    setUsuario(u => u ? { ...u, ...form, rubros_json } : u);
    setEditando(false);
    setMsg('Guardado');
  };

  if (!usuario) return <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>;

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ ...card, background: BLUE_LIGHT, border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: BLUE }}>{usuario.empresa_nombre}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: MUTED }}>RUT {usuario.rut}</p>
          </div>
          <button style={btn(false)} onClick={() => setEditando(v => !v)}>
            {editando ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {!editando ? (
          <>
            {usuario.email && <p style={{ margin: '4px 0', fontSize: '0.85rem', color: TEXT }}>{usuario.email}</p>}
            {usuario.region && <p style={{ margin: '4px 0', fontSize: '0.85rem', color: TEXT }}>Región {usuario.region}</p>}
            {usuario.rubros_json?.length ? (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {usuario.rubros_json.map(r => (
                  <span key={r} style={{ background: BLUE, color: WHITE, fontSize: '0.75rem',
                    fontWeight: 600, padding: '4px 12px', borderRadius: 99 }}>{r}</span>
                ))}
              </div>
            ) : (
              <p style={{ margin: '10px 0 0', fontSize: '0.85rem', color: '#EF4444' }}>
                Sin rubros configurados — agrégalos para calcular relevancia.
              </p>
            )}
          </>
        ) : (
          <>
            {[
              { key: 'empresa_nombre', label: 'Nombre empresa' },
              { key: 'rut', label: 'RUT' },
              { key: 'email', label: 'Email' },
              { key: 'rubros', label: 'Rubros (separados por coma)' },
              { key: 'region', label: 'Región' },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.8rem', color: MUTED, display: 'block', marginBottom: 4 }}>{label}</label>
                <input style={inputStyle} value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            {msg && <p style={{ fontSize: '0.85rem', color: msg === 'Guardado' ? '#065F46' : 'red', margin: '6px 0' }}>{msg}</p>}
            <button style={{ ...btn(), marginTop: 8 }} onClick={guardar} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        )}
      </div>

      <div style={{ ...card, marginTop: 8 }}>
        <p style={{ margin: '0 0 4px', fontWeight: 600, color: TEXT }}>Catálogo de productos</p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: MUTED }}>
          Los productos de esta empresa se usan para generar propuestas.
        </p>
        <a
          href={`/dashboard`}
          style={{ display: 'inline-block', marginTop: 12, fontSize: '0.85rem', color: BLUE, fontWeight: 600 }}
        >
          Ver oportunidades en dashboard clásico →
        </a>
      </div>
    </div>
  );
}

// ─── Tab 2: Licitaciones ──────────────────────────────────────────────────────

function LicitacionesTab({ userId }: { userId: string }) {
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [msg, setMsg] = useState('');
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    fetch(`/api/clientes/${userId}/licitaciones`)
      .then(r => r.json())
      .then(d => { setLicitaciones(Array.isArray(d) ? d : []); setLoading(false); });
  }, [userId]);

  useEffect(() => {
    fetch(`/api/usuarios/${userId}`).then(r => r.json()).then(d => { if (!d.error) setUsuario(d); });
    cargar();
  }, [userId, cargar]);

  const calcular = async () => {
    setCalculando(true); setMsg('');
    const res = await fetch(`/api/clientes/${userId}/relevancia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rubros: usuario?.rubros_json ?? [] }),
    });
    const json = await res.json();
    setCalculando(false);
    setMsg(`✓ ${json.guardadas ?? 0} oportunidades encontradas`);
    cargar();
  };

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <button style={{ ...btn(false), flex: 1 }} onClick={calcular} disabled={calculando}>
          {calculando ? 'Buscando…' : 'Recalcular oportunidades'}
        </button>
      </div>
      {msg && <p style={{ fontSize: '0.85rem', color: BLUE, marginBottom: 12 }}>{msg}</p>}

      {loading ? (
        <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>
      ) : licitaciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: MUTED }}>Sin oportunidades todavía.</p>
          <p style={{ color: MUTED, fontSize: '0.85rem' }}>Presiona "Recalcular oportunidades" para buscar licitaciones relevantes.</p>
        </div>
      ) : (
        <>
          <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: MUTED }}>{licitaciones.length} oportunidades</p>
          {licitaciones.map(l => (
            <div key={l.compra_agil_id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: TEXT,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.compra?.nombre ?? l.compra_agil_id}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: MUTED }}>
                    {l.compra?.codigo} · cierre {fechaCorta(l.compra?.fecha_cierre ?? null)}
                  </p>
                  {l.razon_match && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: BLUE }}>{l.razon_match}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: BLUE, fontSize: '1.1rem' }}>{l.relevancia_score}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: MUTED }}>score</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: TEXT }}>{pesos(l.compra?.monto ?? null)}</p>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Tab 3: Propuestas ────────────────────────────────────────────────────────

function PropuestasTab({ userId }: { userId: string }) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clientes/${userId}/propuestas`)
      .then(r => r.json())
      .then(d => { setPropuestas(Array.isArray(d) ? d : []); setLoading(false); });
  }, [userId]);

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta propuesta?')) return;
    await fetch(`/api/propuestas/${id}`, { method: 'DELETE' });
    setPropuestas(prev => prev.filter(p => p.id !== id));
  };

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch(`/api/propuestas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    setPropuestas(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
  };

  return (
    <div style={{ padding: '20px 16px' }}>
      {loading ? (
        <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>
      ) : propuestas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: MUTED }}>Sin propuestas todavía.</p>
          <p style={{ color: MUTED, fontSize: '0.85rem' }}>Genera una desde el dashboard de licitaciones.</p>
          <a href="/dashboard" style={{ display: 'inline-block', marginTop: 12, color: BLUE, fontWeight: 600, fontSize: '0.9rem' }}>
            Ir al generador de propuestas →
          </a>
        </div>
      ) : (
        <>
          <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: MUTED }}>{propuestas.length} propuesta{propuestas.length !== 1 ? 's' : ''}</p>
          {propuestas.map(p => (
            <div key={p.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: TEXT,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.compra?.nombre ?? p.compra_agil_id}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: MUTED }}>
                    {p.compra?.codigo} · {p.fecha ? fechaCorta(p.fecha) : '—'}
                  </p>
                  <div style={{ marginTop: 6 }}>{badge(p.estado)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: TEXT }}>{pesos(p.monto_total)}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                    {p.estado !== 'postulada' && (
                      <button
                        style={{ height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: BLUE, color: WHITE, fontSize: '0.75rem', fontWeight: 600, padding: '0 12px', fontFamily: 'inherit' }}
                        onClick={() => cambiarEstado(p.id, 'postulada')}
                      >
                        Postular
                      </button>
                    )}
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '0.8rem' }}
                      onClick={() => eliminar(p.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage({ params }: { params: { user_id: string } }) {
  const [tab, setTab] = useState(0);

  return (
    <div style={{
      minHeight: '100vh', background: '#F9FAFB',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      color: TEXT, maxWidth: 600, margin: '0 auto',
    }}>
      <header style={{ background: BLUE, color: WHITE, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/app/dashboard" style={{ color: WHITE, textDecoration: 'none', fontSize: '1.2rem', lineHeight: 1 }}>←</Link>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Panel de empresa</h1>
          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7 }}>Mercado Público</p>
        </div>
      </header>

      <div style={{ background: WHITE, position: 'sticky', top: 0, zIndex: 9 }}>
        <TabBar active={tab} onChange={setTab} />
      </div>

      <div style={{ background: '#F9FAFB', minHeight: 'calc(100vh - 108px)' }}>
        {tab === 0 && <PerfilTab userId={params.user_id} />}
        {tab === 1 && <LicitacionesTab userId={params.user_id} />}
        {tab === 2 && <PropuestasTab userId={params.user_id} />}
      </div>
    </div>
  );
}
