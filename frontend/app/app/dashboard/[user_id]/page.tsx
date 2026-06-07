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

interface CompraDetalle {
  id: string;
  codigo: string;
  nombre: string;
  estado: string | null;
  monto: number | null;
  region: string | null;
  fecha_cierre: string | null;
}

interface Oportunidad {
  compra_agil_id: string;
  relevancia_score: number;
  razon_match: string | null;
  compra?: CompraDetalle;
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
const BLUE_DARK = '#00297A';
const GREEN = '#059669';
const AMBER = '#D97706';
const RED = '#DC2626';
const TEXT = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const BG = '#F9FAFB';
const WHITE = '#FFFFFF';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pesos(n: number | null) {
  if (n == null) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString('es-CL')}`;
}

function diasParaCierre(fechaCierre: string | null): number | null {
  if (!fechaCierre) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const cierre = new Date(fechaCierre);
  cierre.setHours(0, 0, 0, 0);
  return Math.ceil((cierre.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function portalUrl(codigo: string) {
  return `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(codigo)}`;
}

function scoreColor(score: number) {
  if (score >= 60) return GREEN;
  if (score >= 30) return AMBER;
  return MUTED;
}

function scoreLabel(score: number) {
  if (score >= 60) return 'ALTA';
  if (score >= 30) return 'MEDIA';
  return 'BAJA';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
  background: BLUE, color: WHITE, fontFamily: 'inherit',
  fontSize: '0.875rem', fontWeight: 600, padding: '0 16px',
};

const btnSecondary: React.CSSProperties = {
  height: 44, borderRadius: 10, cursor: 'pointer', background: WHITE,
  color: BLUE, fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600,
  padding: '0 16px', border: `1.5px solid ${BLUE}`,
};

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: `1.5px solid ${BORDER}`,
  padding: '0 14px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit', color: TEXT,
};

// ─── TabBar ───────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, counts }: {
  active: number;
  onChange: (i: number) => void;
  counts: [number, number];
}) {
  const tabs = [
    { label: 'Oportunidades', count: counts[0] },
    { label: 'Propuestas', count: counts[1] },
    { label: 'Perfil', count: 0 },
  ];
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: WHITE }}>
      {tabs.map((t, i) => (
        <button key={t.label} onClick={() => onChange(i)} style={{
          flex: 1, height: 48, border: 'none', background: 'none', cursor: 'pointer',
          fontSize: '0.85rem', fontWeight: active === i ? 700 : 400,
          color: active === i ? BLUE : MUTED,
          borderBottom: active === i ? `2px solid ${BLUE}` : '2px solid transparent',
          fontFamily: 'inherit', position: 'relative',
        }}>
          {t.label}
          {t.count > 0 && (
            <span style={{
              marginLeft: 4, background: active === i ? BLUE : BORDER,
              color: active === i ? WHITE : MUTED,
              fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px',
              borderRadius: 99, verticalAlign: 'middle',
            }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Detalle Compra (fetched from MP API) ────────────────────────────────────

interface DetalleCompra {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  organismo: { nombre: string | null; rut: string | null; region: string | null; comuna: string | null };
  monto: number | null;
  fechas: { publicacion: string; cierre: string; fin_preguntas: string };
  items: Array<{ descripcion: string; cantidad: number | null; unidad: string | null; especificaciones: string | null }>;
  condiciones: { plazo_entrega: string | null; forma_pago: string | null; garantia: string | null; lugar_entrega: string | null };
  contacto: { nombre?: string; email?: string; fono?: string } | null;
  documentos: Array<{ nombre: string; url: string; tipo: string }>;
  _fuente?: string;
  _aviso?: string;
}

function DetallePanel({ codigo }: { codigo: string }) {
  const [detalle, setDetalle] = useState<DetalleCompra | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    fetch(`/api/compras-agiles/${encodeURIComponent(codigo)}`)
      .then(r => r.json())
      .then(d => {
        if (d._aviso) setAviso(d._aviso);
        setDetalle(d);
        setCargando(false);
      })
      .catch(e => { setAviso(e.message); setCargando(false); });
  }, [codigo]);

  if (cargando) return (
    <p style={{ color: MUTED, fontSize: '0.82rem', margin: '8px 0' }}>Cargando detalle…</p>
  );

  const s = (v: string | null | undefined) => v || '—';
  const desdeBD = detalle?._fuente === 'base_de_datos';

  return (
    <div style={{ fontSize: '0.83rem', lineHeight: 1.6 }}>
      {/* Aviso de fuente / error */}
      {aviso && (
        <div style={{ background: desdeBD ? '#FEF9C3' : '#FEE2E2', borderRadius: 8,
          padding: '8px 10px', marginBottom: 12, fontSize: '0.75rem', color: '#92400E' }}>
          {desdeBD ? '⚠ ' : '✕ '}{aviso}
        </div>
      )}

      {detalle && (
        <>
          {/* Nombre completo */}
          <Section title="Solicitud">
            <p style={{ margin: 0, color: TEXT, fontWeight: 600, lineHeight: 1.4 }}>{detalle.nombre}</p>
            <Field label="Código" value={detalle.codigo} />
            <Field label="Estado" value={detalle.estado} />
          </Section>

          {/* Organismo */}
          {(detalle.organismo.nombre || detalle.organismo.region) && (
            <Section title="Organismo comprador">
              {detalle.organismo.nombre && <Field label="Entidad" value={detalle.organismo.nombre} bold />}
              {detalle.organismo.rut && <Field label="RUT" value={detalle.organismo.rut} />}
              {detalle.organismo.region && <Field label="Región" value={detalle.organismo.region} />}
              {detalle.organismo.comuna && <Field label="Comuna" value={detalle.organismo.comuna} />}
            </Section>
          )}

          {/* Descripción */}
          {detalle.descripcion && (
            <Section title="Descripción">
              <p style={{ margin: 0, color: TEXT, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                {detalle.descripcion}
              </p>
            </Section>
          )}

          {/* Items */}
          {detalle.items.length > 0 && (
            <Section title={`Ítems solicitados (${detalle.items.length})`}>
              {detalle.items.map((it, i) => (
                <div key={i} style={{ background: WHITE, borderRadius: 8, padding: '8px 10px',
                  marginBottom: 6, border: `1px solid ${BORDER}` }}>
                  <p style={{ margin: 0, fontWeight: 600, color: TEXT }}>{it.descripcion}</p>
                  {it.cantidad && (
                    <p style={{ margin: '2px 0 0', color: MUTED, fontSize: '0.78rem' }}>
                      Cantidad: {it.cantidad} {it.unidad ?? ''}
                    </p>
                  )}
                  {it.especificaciones && (
                    <p style={{ margin: '2px 0 0', color: MUTED, fontSize: '0.78rem' }}>
                      {it.especificaciones}
                    </p>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Fechas */}
          <Section title="Fechas">
            {detalle.fechas.publicacion !== '—' && <Field label="Publicación" value={detalle.fechas.publicacion} />}
            <Field label="Cierre" value={detalle.fechas.cierre} bold />
            {detalle.fechas.fin_preguntas !== '—' && <Field label="Fin preguntas" value={detalle.fechas.fin_preguntas} />}
          </Section>

          {/* Monto */}
          {detalle.monto && (
            <Section title="Presupuesto">
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: BLUE }}>
                {pesos(detalle.monto)} CLP
              </p>
            </Section>
          )}

          {/* Documentos / Bases técnicas */}
          {detalle.documentos?.length > 0 && (
            <Section title={`Bases técnicas y adjuntos (${detalle.documentos.length})`}>
              {detalle.documentos.map((doc, i) => (
                <a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: WHITE, borderRadius: 10, padding: '10px 12px',
                    marginBottom: 6, border: `1px solid ${BORDER}`,
                    textDecoration: 'none', color: TEXT,
                  }}
                >
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                    {doc.tipo?.includes('pdf') || doc.nombre?.toLowerCase().includes('.pdf') ? '📄' : '📎'}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.83rem', fontWeight: 500, color: BLUE,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.nombre}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: '0.75rem', color: MUTED }}>↓</span>
                </a>
              ))}
            </Section>
          )}

          {/* Condiciones */}
          {Object.values(detalle.condiciones).some(Boolean) && (
            <Section title="Condiciones">
              {detalle.condiciones.plazo_entrega && <Field label="Plazo" value={detalle.condiciones.plazo_entrega} />}
              {detalle.condiciones.forma_pago && <Field label="Pago" value={detalle.condiciones.forma_pago} />}
              {detalle.condiciones.lugar_entrega && <Field label="Entrega" value={detalle.condiciones.lugar_entrega} />}
              {detalle.condiciones.garantia && <Field label="Garantía" value={detalle.condiciones.garantia} />}
            </Section>
          )}

          {/* Contacto */}
          {detalle.contacto && (detalle.contacto.nombre || detalle.contacto.email) && (
            <Section title="Contacto">
              {detalle.contacto.nombre && <Field label="Nombre" value={detalle.contacto.nombre} />}
              {detalle.contacto.email && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: MUTED, minWidth: 72 }}>Email</span>
                  <a href={`mailto:${detalle.contacto.email}`} style={{ color: BLUE, fontWeight: 500 }}>
                    {detalle.contacto.email}
                  </a>
                </div>
              )}
              {detalle.contacto.fono && <Field label="Fono" value={detalle.contacto.fono} />}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: MUTED,
        textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
      <span style={{ color: MUTED, minWidth: 72, flexShrink: 0 }}>{label}</span>
      <span style={{ color: TEXT, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}

// ─── Oportunidad Card ─────────────────────────────────────────────────────────

function OportunidadCard({ o }: { o: Oportunidad }) {
  const [expandido, setExpandido] = useState(false);
  const c = o.compra;
  if (!c) return null;

  const dias = diasParaCierre(c.fecha_cierre);
  const urgente = dias !== null && dias <= 3;
  const pasado = dias !== null && dias < 0;
  const color = scoreColor(o.relevancia_score);

  return (
    <div style={{
      background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
      marginBottom: 10, overflow: 'hidden',
    }}>
      {/* Main row — tap to expand */}
      <button
        onClick={() => setExpandido(v => !v)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          cursor: 'pointer', padding: '14px 16px', fontFamily: 'inherit',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}
      >
        {/* Score badge */}
        <div style={{
          flexShrink: 0, background: color + '15', border: `1px solid ${color}30`,
          borderRadius: 8, padding: '4px 8px', textAlign: 'center', minWidth: 48,
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color, lineHeight: 1 }}>{o.relevancia_score}</div>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color, textTransform: 'uppercase', marginTop: 1 }}>
            {scoreLabel(o.relevancia_score)}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: TEXT,
            lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {c.nombre}
          </p>
          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {c.monto && (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: TEXT }}>
                {pesos(c.monto)}
              </span>
            )}
            {dias !== null && !pasado && (
              <span style={{
                fontSize: '0.78rem', fontWeight: 600,
                color: urgente ? RED : dias <= 7 ? AMBER : MUTED,
              }}>
                {urgente ? `⚡ ${dias}d` : `${fechaCorta(c.fecha_cierre)}`}
              </span>
            )}
            {pasado && <span style={{ fontSize: '0.78rem', color: MUTED }}>Vencida</span>}
            {c.region && <span style={{ fontSize: '0.75rem', color: MUTED }}>{c.region}</span>}
          </div>
          {o.razon_match && (
            <p style={{ margin: '5px 0 0', fontSize: '0.72rem', color: BLUE }}>
              {o.razon_match}
            </p>
          )}
        </div>

        {/* Chevron */}
        <span style={{ flexShrink: 0, color: MUTED, fontSize: '0.85rem', paddingTop: 2,
          transform: expandido ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
          ▾
        </span>
      </button>

      {/* Expanded detail panel */}
      {expandido && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '14px 16px 16px', background: BG }}>
          {/* Action button */}
          <div style={{ marginBottom: 16 }}>
            <Link
              href={`/dashboard/compra/${encodeURIComponent(c.codigo)}`}
              style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center',
                height: 44, textDecoration: 'none', fontSize: '0.9rem', width: '100%',
                justifyContent: 'center' }}
            >
              Generar propuesta →
            </Link>
          </div>

          {/* Full detail from MP API */}
          <DetallePanel codigo={c.codigo} />
        </div>
      )}
    </div>
  );
}

// ─── Tab 1: Oportunidades ─────────────────────────────────────────────────────

function OportunidadesTab({
  userId,
  usuario,
  onCount,
}: {
  userId: string;
  usuario: Usuario | null;
  onCount: (n: number) => void;
}) {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [msg, setMsg] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'alta' | 'urgente'>('todas');

  const cargar = useCallback(() => {
    setLoading(true);
    fetch(`/api/clientes/${userId}/licitaciones?limite=100`)
      .then(r => r.json())
      .then(d => {
        const lista = Array.isArray(d) ? d : [];
        setOportunidades(lista);
        onCount(lista.length);
        setLoading(false);
      });
  }, [userId, onCount]);

  useEffect(() => { cargar(); }, [cargar]);

  const calcular = async () => {
    if (!usuario) return;
    setCalculando(true);
    setMsg('');
    const res = await fetch(`/api/clientes/${userId}/relevancia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rubros: usuario.rubros_json ?? [] }),
    });
    const json = await res.json();
    setCalculando(false);
    if (json.guardadas > 0) {
      setMsg(`Encontradas ${json.guardadas} oportunidades`);
      cargar();
    } else {
      setMsg('Sin nuevas oportunidades. Revisa los rubros en Perfil.');
    }
  };

  const filtradas = oportunidades.filter(o => {
    if (filtro === 'alta') return o.relevancia_score >= 60;
    if (filtro === 'urgente') {
      const d = diasParaCierre(o.compra?.fecha_cierre ?? null);
      return d !== null && d >= 0 && d <= 7;
    }
    return true;
  });

  return (
    <div style={{ padding: '16px' }}>
      {/* Actions row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button style={{ ...btnPrimary, flex: 1, fontSize: '0.85rem' }}
          onClick={calcular} disabled={calculando}>
          {calculando ? 'Buscando…' : '↻ Buscar oportunidades'}
        </button>
      </div>

      {/* Filter chips */}
      {oportunidades.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[
            { key: 'todas', label: `Todas (${oportunidades.length})` },
            { key: 'alta', label: 'Alta relevancia' },
            { key: 'urgente', label: '⚡ Urgentes' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key as typeof filtro)}
              style={{
                height: 32, borderRadius: 99, border: `1px solid ${filtro === f.key ? BLUE : BORDER}`,
                background: filtro === f.key ? BLUE : WHITE, color: filtro === f.key ? WHITE : MUTED,
                fontSize: '0.75rem', fontWeight: 600, padding: '0 12px', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {msg && (
        <p style={{ fontSize: '0.85rem', color: BLUE, marginBottom: 10, fontWeight: 500 }}>{msg}</p>
      )}

      {loading ? (
        <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: MUTED, fontSize: '1.5rem', margin: '0 0 12px' }}>🔍</p>
          <p style={{ color: TEXT, fontWeight: 600, margin: '0 0 6px' }}>Sin oportunidades todavía</p>
          <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>
            Presiona "Buscar oportunidades" para analizar las compras ágiles del portal.
          </p>
          {!usuario?.rubros_json?.length && (
            <p style={{ color: RED, fontSize: '0.85rem', marginTop: 8 }}>
              ⚠ Agrega rubros en la pestaña Perfil para mejores resultados.
            </p>
          )}
        </div>
      ) : (
        filtradas.map(o => <OportunidadCard key={o.compra_agil_id} o={o} />)
      )}
    </div>
  );
}

// ─── Tab 2: Propuestas ────────────────────────────────────────────────────────

function PropuestasTab({ userId, onCount }: { userId: string; onCount: (n: number) => void }) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clientes/${userId}/propuestas`)
      .then(r => r.json())
      .then(d => {
        const lista = Array.isArray(d) ? d : [];
        setPropuestas(lista);
        onCount(lista.length);
        setLoading(false);
      });
  }, [userId, onCount]);

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch(`/api/propuestas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    setPropuestas(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta propuesta?')) return;
    await fetch(`/api/propuestas/${id}`, { method: 'DELETE' });
    setPropuestas(prev => prev.filter(p => p.id !== id));
    onCount(propuestas.length - 1);
  };

  const stats = {
    incompletas: propuestas.filter(p => p.estado === 'incompleta').length,
    completas: propuestas.filter(p => p.estado === 'completa').length,
    postuladas: propuestas.filter(p => p.estado === 'postulada').length,
  };

  const estadoBadge = (estado: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
      postulada:  { bg: '#D1FAE5', color: '#065F46' },
      completa:   { bg: '#DBEAFE', color: '#1E40AF' },
      incompleta: { bg: '#FEF3C7', color: '#92400E' },
    };
    const s = map[estado] ?? { bg: '#F3F4F6', color: MUTED };
    return { fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
      textTransform: 'uppercase', letterSpacing: '0.04em', background: s.bg, color: s.color };
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Stats row */}
      {propuestas.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Borradores', n: stats.incompletas, color: AMBER },
            { label: 'Completas', n: stats.completas, color: BLUE },
            { label: 'Postuladas', n: stats.postuladas, color: GREEN },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
              padding: '10px 8px', textAlign: 'center',
            }}>
              <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.n}</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: MUTED }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>
      ) : propuestas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: TEXT, fontWeight: 600, margin: '0 0 6px' }}>Sin propuestas</p>
          <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 16px' }}>
            Genera una desde la pestaña Oportunidades.
          </p>
          <Link href="/dashboard" style={{ color: BLUE, fontWeight: 600, fontSize: '0.9rem' }}>
            Ir al generador →
          </Link>
        </div>
      ) : (
        propuestas.map(p => (
          <div key={p.id} style={{
            background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
            padding: '14px 16px', marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: TEXT,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.compra?.nombre ?? p.compra_agil_id}
                </p>
                <p style={{ margin: '2px 0 6px', fontSize: '0.75rem', color: MUTED }}>
                  {p.compra?.codigo} · {p.fecha ? fechaCorta(p.fecha) : '—'}
                </p>
                <span style={estadoBadge(p.estado)}>{p.estado}</span>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {p.monto_total && (
                  <p style={{ margin: '0 0 8px', fontWeight: 800, color: TEXT, fontSize: '1.05rem' }}>
                    {pesos(p.monto_total)}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {p.compra?.codigo && (
                <>
                  <Link
                    href={`/dashboard/compra/${encodeURIComponent(p.compra.codigo)}`}
                    style={{ height: 36, borderRadius: 8, background: BLUE, color: WHITE,
                      fontSize: '0.8rem', fontWeight: 600, padding: '0 14px', display: 'inline-flex',
                      alignItems: 'center', textDecoration: 'none' }}
                  >
                    Ver / editar
                  </Link>
                  <a
                    href={portalUrl(p.compra.codigo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ height: 36, borderRadius: 8, background: WHITE, color: BLUE,
                      fontSize: '0.8rem', fontWeight: 600, padding: '0 14px', display: 'inline-flex',
                      alignItems: 'center', textDecoration: 'none', border: `1.5px solid ${BLUE}` }}
                  >
                    Portal ↗
                  </a>
                </>
              )}
              {p.estado !== 'postulada' && (
                <button
                  onClick={() => cambiarEstado(p.id, 'postulada')}
                  style={{ height: 36, borderRadius: 8, background: '#D1FAE5', color: '#065F46',
                    fontSize: '0.8rem', fontWeight: 700, padding: '0 14px', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ✓ Postulada
                </button>
              )}
              <button
                onClick={() => eliminar(p.id)}
                style={{ height: 36, borderRadius: 8, background: 'none', border: 'none',
                  color: '#9CA3AF', fontSize: '0.8rem', cursor: 'pointer', padding: '0 10px' }}
              >
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Tab 3: Perfil ────────────────────────────────────────────────────────────

function PerfilTab({ userId, usuario, onUsuarioChange }: {
  userId: string;
  usuario: Usuario | null;
  onUsuarioChange: (u: Usuario) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ empresa_nombre: '', rut: '', email: '', rubros: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (usuario) {
      setForm({
        empresa_nombre: usuario.empresa_nombre ?? '',
        rut: usuario.rut ?? '',
        email: usuario.email ?? '',
        rubros: (usuario.rubros_json ?? []).join(', '),
        region: usuario.region ?? '',
      });
    }
  }, [usuario]);

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
    onUsuarioChange({ ...usuario!, ...form, rubros_json });
    setEditando(false);
    setMsg('Guardado correctamente');
  };

  if (!usuario) return <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>;

  return (
    <div style={{ padding: '16px' }}>
      <div style={{
        background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`, padding: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: TEXT }}>
            {usuario.empresa_nombre}
          </h3>
          <button
            onClick={() => setEditando(v => !v)}
            style={{ height: 36, borderRadius: 8, background: editando ? BG : BLUE_DARK,
              color: editando ? MUTED : WHITE, border: editando ? `1px solid ${BORDER}` : 'none',
              fontSize: '0.8rem', fontWeight: 600, padding: '0 14px', cursor: 'pointer',
              fontFamily: 'inherit' }}
          >
            {editando ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {!editando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label="RUT" valor={usuario.rut} />
            <Row label="Email" valor={usuario.email ?? '—'} />
            <Row label="Región" valor={usuario.region ?? '—'} />
            <div>
              <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: MUTED }}>Rubros</p>
              {usuario.rubros_json?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {usuario.rubros_json.map(r => (
                    <span key={r} style={{
                      background: BLUE + '15', color: BLUE, fontSize: '0.8rem',
                      fontWeight: 600, padding: '4px 12px', borderRadius: 99,
                    }}>
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: RED }}>
                  ⚠ Sin rubros — agrégalos para calcular relevancia de licitaciones.
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {[
              { key: 'empresa_nombre', label: 'Nombre empresa' },
              { key: 'rut', label: 'RUT' },
              { key: 'email', label: 'Email' },
              { key: 'region', label: 'Región' },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.8rem', color: MUTED, display: 'block', marginBottom: 4 }}>
                  {label}
                </label>
                <input style={inputStyle} value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.8rem', color: MUTED, display: 'block', marginBottom: 4 }}>
                Rubros (separados por coma)
              </label>
              <input style={inputStyle} placeholder="impresión, vestuario, grabados"
                value={form.rubros}
                onChange={e => setForm(f => ({ ...f, rubros: e.target.value }))} />
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: MUTED }}>
                Los rubros determinan qué licitaciones se consideran relevantes.
              </p>
            </div>
            {msg && (
              <p style={{ fontSize: '0.85rem', color: msg.includes('correctamente') ? GREEN : RED, margin: '0 0 8px' }}>
                {msg}
              </p>
            )}
            <button style={{ ...btnPrimary, width: '100%' }} onClick={guardar} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        )}
      </div>

      {msg && !editando && (
        <p style={{ fontSize: '0.85rem', color: GREEN, margin: '12px 0 0', fontWeight: 500 }}>{msg}</p>
      )}
    </div>
  );
}

function Row({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ fontSize: '0.8rem', color: MUTED, minWidth: 60 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: TEXT, fontWeight: 500 }}>{valor}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage({ params }: { params: { user_id: string } }) {
  const [tab, setTab] = useState(0);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [countOportunidades, setCountOportunidades] = useState(0);
  const [countPropuestas, setCountPropuestas] = useState(0);

  useEffect(() => {
    fetch(`/api/usuarios/${params.user_id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setUsuario(d); });
  }, [params.user_id]);

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      color: TEXT, maxWidth: 600, margin: '0 auto',
    }}>
      {/* Header */}
      <header style={{
        background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`,
        color: WHITE, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Link href="/app/dashboard"
          style={{ color: WHITE, textDecoration: 'none', fontSize: '1.1rem', lineHeight: 1, padding: '4px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.15)' }}>
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {usuario?.empresa_nombre ?? '…'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.7 }}>
            RUT {usuario?.rut ?? '…'}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: WHITE, position: 'sticky', top: 0, zIndex: 9, boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
        <TabBar
          active={tab}
          onChange={setTab}
          counts={[countOportunidades, countPropuestas]}
        />
      </div>

      {/* Content */}
      <div style={{ minHeight: 'calc(100vh - 108px)' }}>
        {tab === 0 && (
          <OportunidadesTab
            userId={params.user_id}
            usuario={usuario}
            onCount={setCountOportunidades}
          />
        )}
        {tab === 1 && (
          <PropuestasTab
            userId={params.user_id}
            onCount={setCountPropuestas}
          />
        )}
        {tab === 2 && (
          <PerfilTab
            userId={params.user_id}
            usuario={usuario}
            onUsuarioChange={setUsuario}
          />
        )}
      </div>
    </div>
  );
}
