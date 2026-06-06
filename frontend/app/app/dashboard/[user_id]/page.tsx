'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: string;
  nombre: string;
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

// ─── Colours & tokens ─────────────────────────────────────────────────────────

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
    <span style={{ ...badgeBase, background: s.bg, color: s.color }}>
      {estado}
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const badgeBase: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const card: React.CSSProperties = {
  background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`,
  padding: '16px 20px', marginBottom: 12,
};

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: number; onChange: (i: number) => void }) {
  const tabs = ['Ingreso', 'Licitaciones', 'Propuestas'];
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: WHITE }}>
      {tabs.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          style={{
            flex: 1, height: 48, border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: active === i ? 700 : 400,
            color: active === i ? BLUE : MUTED,
            borderBottom: active === i ? `2px solid ${BLUE}` : '2px solid transparent',
            transition: 'all 0.2s', fontFamily: 'inherit',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ─── Tab 1: Ingreso ───────────────────────────────────────────────────────────

function IngresoTab({ userId }: { userId: string }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', rut: '', email: '', rubros: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clientes?user_id=${userId}`);
    const data = await res.json();
    setClientes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!form.nombre || !form.rut) { setMsg('Nombre y RUT son obligatorios'); return; }
    setSaving(true);
    setMsg('');
    const rubros_json = form.rubros.split(',').map(r => r.trim()).filter(Boolean);
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, nombre: form.nombre, rut: form.rut, email: form.email, rubros_json, region: form.region }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.error) { setMsg(json.error); return; }
    setShowForm(false);
    setForm({ nombre: '', rut: '', email: '', rubros: '', region: '' });
    cargar();
  };

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    cargar();
  };

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: TEXT }}>Mis Clientes</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: MUTED }}>{clientes.length} empresa{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={btn()} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : '+ Agregar'}
        </button>
      </div>

      {showForm && (
        <div style={{ ...card, background: BLUE_LIGHT, border: 'none', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: BLUE }}>Nueva empresa cliente</h3>
          {(['nombre', 'rut', 'email', 'rubros', 'region'] as const).map(field => (
            <div key={field} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: '0.8rem', color: MUTED, display: 'block', marginBottom: 4 }}>
                {field === 'rubros' ? 'Rubros (separados por coma)' : field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <input
                style={input}
                placeholder={field === 'rubros' ? 'impresión, vestuario, grabados' : field === 'rut' ? '12.345.678-9' : ''}
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
          {msg && <p style={{ color: 'red', fontSize: '0.85rem', margin: '8px 0' }}>{msg}</p>}
          <button style={{ ...btn(), marginTop: 8 }} onClick={guardar} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cliente'}
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>
      ) : clientes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: MUTED, marginBottom: 16 }}>Aún no tienes clientes registrados.</p>
          <button style={btn()} onClick={() => setShowForm(true)}>Agregar primer cliente</button>
        </div>
      ) : (
        clientes.map(c => (
          <div key={c.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: TEXT }}>{c.nombre}</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: MUTED }}>RUT {c.rut}</p>
                {c.rubros_json?.length ? (
                  <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: BLUE }}>
                    {c.rubros_json.join(' · ')}
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => eliminar(c.id, c.nombre)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '0.8rem' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Tab 2: Licitaciones ──────────────────────────────────────────────────────

function LicitacionesTab({ userId }: { userId: string }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`/api/clientes?user_id=${userId}`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setClientes(list);
        if (list.length > 0) setSelectedCliente(list[0].id);
      });
  }, [userId]);

  useEffect(() => {
    if (!selectedCliente) return;
    setLoading(true);
    setLicitaciones([]);
    fetch(`/api/clientes/${selectedCliente}/licitaciones`)
      .then(r => r.json())
      .then(d => { setLicitaciones(Array.isArray(d) ? d : []); setLoading(false); });
  }, [selectedCliente]);

  const calcular = async () => {
    if (!selectedCliente) return;
    setCalculando(true);
    setMsg('');
    const cliente = clientes.find(c => c.id === selectedCliente);
    const res = await fetch(`/api/clientes/${selectedCliente}/relevancia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rubros: cliente?.rubros_json ?? [] }),
    });
    const json = await res.json();
    setCalculando(false);
    setMsg(`Guardadas ${json.guardadas ?? 0} de ${json.relevantes_encontradas ?? 0} relevantes`);
    fetch(`/api/clientes/${selectedCliente}/licitaciones`)
      .then(r => r.json())
      .then(d => setLicitaciones(Array.isArray(d) ? d : []));
  };

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.8rem', color: MUTED, display: 'block', marginBottom: 6 }}>Cliente</label>
        <select
          style={{ ...input, height: 44 }}
          value={selectedCliente}
          onChange={e => setSelectedCliente(e.target.value)}
        >
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button style={{ ...btn(false), flex: 1 }} onClick={calcular} disabled={calculando || !selectedCliente}>
          {calculando ? 'Calculando…' : 'Recalcular relevancia'}
        </button>
      </div>

      {msg && <p style={{ fontSize: '0.85rem', color: BLUE, marginBottom: 12 }}>{msg}</p>}

      {loading ? (
        <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>
      ) : licitaciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: MUTED }}>Sin oportunidades. Presiona "Recalcular relevancia".</p>
        </div>
      ) : (
        licitaciones.map(l => (
          <div key={l.compra_agil_id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.compra?.nombre ?? l.compra_agil_id}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: MUTED }}>
                  {l.compra?.codigo} · {l.compra?.region ?? '—'} · cierre {fechaCorta(l.compra?.fecha_cierre ?? null)}
                </p>
                {l.razon_match && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: BLUE }}>
                    {l.razon_match}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: BLUE, fontSize: '1.1rem' }}>{l.relevancia_score}</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: MUTED }}>score</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: TEXT }}>{pesos(l.compra?.monto ?? null)}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Tab 3: Propuestas ────────────────────────────────────────────────────────

function PropuestasTab({ userId }: { userId: string }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/clientes?user_id=${userId}`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setClientes(list);
        if (list.length > 0) setSelectedCliente(list[0].id);
      });
  }, [userId]);

  useEffect(() => {
    if (!selectedCliente) return;
    setLoading(true);
    setPropuestas([]);
    fetch(`/api/clientes/${selectedCliente}/propuestas`)
      .then(r => r.json())
      .then(d => { setPropuestas(Array.isArray(d) ? d : []); setLoading(false); });
  }, [selectedCliente]);

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
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '0.8rem', color: MUTED, display: 'block', marginBottom: 6 }}>Cliente</label>
        <select
          style={{ ...input, height: 44 }}
          value={selectedCliente}
          onChange={e => setSelectedCliente(e.target.value)}
        >
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>
      ) : propuestas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: MUTED }}>Sin propuestas para este cliente.</p>
          <p style={{ color: MUTED, fontSize: '0.85rem' }}>Ve a Licitaciones para generar una.</p>
        </div>
      ) : (
        propuestas.map(p => (
          <div key={p.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                      style={{ ...btn(true), height: 32, fontSize: '0.75rem', padding: '0 12px', borderRadius: 8 }}
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
        ))
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
      {/* Header */}
      <header style={{
        background: BLUE, color: WHITE,
        padding: '20px 20px 16px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Mercado Público
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
          Panel de oportunidades
        </p>
      </header>

      {/* Tabs */}
      <div style={{ background: WHITE, position: 'sticky', top: 72, zIndex: 9 }}>
        <TabBar active={tab} onChange={setTab} />
      </div>

      {/* Content */}
      <div style={{ background: '#F9FAFB', minHeight: 'calc(100vh - 120px)' }}>
        {tab === 0 && <IngresoTab userId={params.user_id} />}
        {tab === 1 && <LicitacionesTab userId={params.user_id} />}
        {tab === 2 && <PropuestasTab userId={params.user_id} />}
      </div>
    </div>
  );
}
