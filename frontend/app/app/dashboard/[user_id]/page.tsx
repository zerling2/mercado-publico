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
  organismo_nombre: string | null;
}

interface Oportunidad {
  relevancia_id: string;
  compra_agil_id: string;
  relevancia_score: number;
  razon_match: string | null;
  visto: boolean;
  cotizacion_descargada: boolean;
  comentario: string | null;
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

// ─── Design tokens ────────────────────────────────────────────────────────────

const NAVY    = '#001A4D';
const BLUE    = '#0047CC';
const BLUE2   = '#1A6BFF';
const BLUEBG  = '#EEF3FF';
const BLUEMID = '#DBEAFE';
const WHITE   = '#FFFFFF';
const BG      = '#F0F4FF';
const TEXT    = '#0A0F1E';
const MUTED   = '#5A6480';
const BORDER  = '#D6E0F5';
const GREEN   = '#027A48';
const GREENBG = '#ECFDF3';
const AMBER   = '#B45309';
const AMBERBG = '#FFFBEB';
const RED     = '#C01048';
const REDBG   = '#FFF1F3';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pesos(n: number | null) {
  if (n == null) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString('es-CL')}`;
}

function diasParaCierre(fechaCierre: string | null): number | null {
  if (!fechaCierre) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const cierre = new Date(fechaCierre); cierre.setHours(0, 0, 0, 0);
  return Math.ceil((cierre.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function portalUrl(codigo: string) {
  return `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(codigo)}`;
}

function scoreConfig(score: number) {
  if (score >= 60) return { color: GREEN, bg: GREENBG, label: 'ALTA' };
  if (score >= 30) return { color: AMBER, bg: AMBERBG, label: 'MEDIA' };
  return { color: MUTED, bg: BG, label: 'BAJA' };
}

// ─── Global styles injected once ─────────────────────────────────────────────

const GLOBAL_CSS = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; background: ${BG}; }
  input, button, textarea, select { font-family: inherit; }
  @media (min-width: 640px) {
    .dash-root { max-width: 680px !important; }
  }
`;

// ─── Shared button styles ─────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
  background: BLUE, color: WHITE, fontSize: '0.9rem', fontWeight: 700,
  padding: '0 20px', letterSpacing: '0.01em',
};

const btnOutline: React.CSSProperties = {
  height: 48, borderRadius: 12, cursor: 'pointer', background: WHITE,
  color: BLUE, fontSize: '0.9rem', fontWeight: 700,
  padding: '0 20px', border: `2px solid ${BLUE}`,
};

const inputStyle: React.CSSProperties = {
  height: 48, borderRadius: 12, border: `1.5px solid ${BORDER}`,
  padding: '0 14px', fontSize: '0.95rem', width: '100%',
  color: TEXT, background: WHITE, outline: 'none',
};

// ─── TabBar ───────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, counts, noVistas }: {
  active: number; onChange: (i: number) => void;
  counts: [number, number]; noVistas: number;
}) {
  const tabs = [
    { label: 'Oportunidades', count: noVistas },
    { label: 'Propuestas', count: counts[1] },
    { label: 'Perfil', count: 0 },
  ];
  return (
    <div style={{ display: 'flex', background: WHITE, borderBottom: `1.5px solid ${BORDER}` }}>
      {tabs.map((t, i) => (
        <button key={t.label} onClick={() => onChange(i)} style={{
          flex: 1, height: 52, border: 'none', background: 'none', cursor: 'pointer',
          fontSize: '0.82rem', fontWeight: active === i ? 800 : 500,
          color: active === i ? BLUE : MUTED,
          borderBottom: active === i ? `3px solid ${BLUE}` : '3px solid transparent',
          position: 'relative', transition: 'color 0.15s',
        }}>
          {t.label}
          {t.count > 0 && (
            <span style={{
              marginLeft: 5,
              background: active === i ? BLUE : RED,
              color: WHITE,
              fontSize: '0.65rem', fontWeight: 800,
              padding: '2px 6px', borderRadius: 99,
              verticalAlign: 'middle',
            }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Detalle Compra ───────────────────────────────────────────────────────────

interface DetalleCompra {
  codigo: string; nombre: string; descripcion: string | null; estado: string;
  organismo: { nombre: string | null; rut: string | null; region: string | null; comuna: string | null };
  monto: number | null;
  fechas: { publicacion: string; cierre: string; fin_preguntas: string };
  items: Array<{ descripcion: string; cantidad: number | null; unidad: string | null; especificaciones: string | null }>;
  condiciones: { plazo_entrega: string | null; forma_pago: string | null; garantia: string | null; lugar_entrega: string | null };
  contacto: { nombre?: string; email?: string; fono?: string } | null;
  documentos: Array<{ nombre: string; url: string; tipo: string }>;
  _fuente?: string; _aviso?: string;
}

function DetallePanel({ codigo }: { codigo: string }) {
  const [detalle, setDetalle] = useState<DetalleCompra | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    fetch(`/api/compras-agiles/${encodeURIComponent(codigo)}`)
      .then(r => r.json())
      .then(d => { if (d._aviso) setAviso(d._aviso); setDetalle(d); setCargando(false); })
      .catch(e => { setAviso(e.message); setCargando(false); });
  }, [codigo]);

  if (cargando) return (
    <p style={{ color: MUTED, fontSize: '0.85rem', margin: '12px 0', textAlign: 'center' }}>
      Cargando detalle…
    </p>
  );

  const desdeBD = detalle?._fuente === 'base_de_datos';

  return (
    <div style={{ fontSize: '0.85rem', lineHeight: 1.65 }}>
      {aviso && (
        <div style={{ background: desdeBD ? AMBERBG : REDBG, borderRadius: 10,
          padding: '10px 12px', marginBottom: 14, fontSize: '0.78rem',
          color: desdeBD ? AMBER : RED, border: `1px solid ${desdeBD ? AMBER+'40' : RED+'40'}` }}>
          {aviso}
        </div>
      )}

      {detalle && (
        <>
          {(detalle.organismo.nombre || detalle.organismo.region) && (
            <DSection title="Organismo">
              {detalle.organismo.nombre && <DField label="Entidad" value={detalle.organismo.nombre} bold />}
              {detalle.organismo.rut && <DField label="RUT" value={detalle.organismo.rut} />}
              {detalle.organismo.region && <DField label="Región" value={detalle.organismo.region} />}
            </DSection>
          )}

          {detalle.descripcion && (
            <DSection title="Descripción">
              <p style={{ margin: 0, color: TEXT, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {detalle.descripcion}
              </p>
            </DSection>
          )}

          {detalle.items.length > 0 && (
            <DSection title={`Ítems solicitados (${detalle.items.length})`}>
              {detalle.items.map((it, i) => (
                <div key={i} style={{ background: BLUEBG, borderRadius: 10, padding: '10px 12px',
                  marginBottom: 6, border: `1px solid ${BORDER}` }}>
                  <p style={{ margin: 0, fontWeight: 700, color: TEXT }}>{it.descripcion}</p>
                  {it.cantidad && (
                    <p style={{ margin: '3px 0 0', color: MUTED, fontSize: '0.8rem' }}>
                      {it.cantidad} {it.unidad ?? ''}
                    </p>
                  )}
                  {it.especificaciones && (
                    <p style={{ margin: '3px 0 0', color: MUTED, fontSize: '0.8rem' }}>
                      {it.especificaciones}
                    </p>
                  )}
                </div>
              ))}
            </DSection>
          )}

          <DSection title="Fechas">
            <DField label="Cierre" value={detalle.fechas.cierre} bold />
            {detalle.fechas.publicacion !== '—' && <DField label="Publicación" value={detalle.fechas.publicacion} />}
          </DSection>

          {detalle.monto && (
            <DSection title="Presupuesto">
              <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: BLUE }}>
                {pesos(detalle.monto)} CLP
              </p>
            </DSection>
          )}

          {detalle.documentos?.length > 0 && (
            <DSection title={`Adjuntos (${detalle.documentos.length})`}>
              {detalle.documentos.map((doc, i) => (
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10,
                    background: WHITE, borderRadius: 10, padding: '10px 14px', marginBottom: 6,
                    border: `1.5px solid ${BORDER}`, textDecoration: 'none' }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>
                    {doc.nombre?.toLowerCase().includes('.pdf') ? '📄' : '📎'}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.83rem', fontWeight: 600, color: BLUE,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.nombre}
                  </span>
                  <span style={{ color: MUTED, fontSize: '0.8rem', flexShrink: 0 }}>↓</span>
                </a>
              ))}
            </DSection>
          )}

          {Object.values(detalle.condiciones).some(Boolean) && (
            <DSection title="Condiciones">
              {detalle.condiciones.plazo_entrega && <DField label="Plazo" value={detalle.condiciones.plazo_entrega} />}
              {detalle.condiciones.lugar_entrega && <DField label="Entrega" value={detalle.condiciones.lugar_entrega} />}
              {detalle.condiciones.forma_pago && <DField label="Pago" value={detalle.condiciones.forma_pago} />}
            </DSection>
          )}

          {detalle.contacto && (detalle.contacto.nombre || detalle.contacto.email) && (
            <DSection title="Contacto">
              {detalle.contacto.nombre && <DField label="Nombre" value={detalle.contacto.nombre} />}
              {detalle.contacto.email && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                  <span style={{ color: MUTED, minWidth: 72 }}>Email</span>
                  <a href={`mailto:${detalle.contacto.email}`} style={{ color: BLUE, fontWeight: 600 }}>
                    {detalle.contacto.email}
                  </a>
                </div>
              )}
            </DSection>
          )}
        </>
      )}
    </div>
  );
}

function DSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 800, color: BLUE,
        textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function DField({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
      <span style={{ color: MUTED, minWidth: 80, flexShrink: 0, fontSize: '0.85rem' }}>{label}</span>
      <span style={{ color: TEXT, fontWeight: bold ? 700 : 500, fontSize: '0.85rem' }}>{value}</span>
    </div>
  );
}

// ─── Oportunidad Card ─────────────────────────────────────────────────────────

function OportunidadCard({ o, userId, onVisto }: {
  o: Oportunidad; userId: string; onVisto: (id: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const c = o.compra;
  if (!c) return null;

  const dias = diasParaCierre(c.fecha_cierre);
  const urgente = dias !== null && dias <= 3 && dias >= 0;
  const pasado  = dias !== null && dias < 0;
  const sc      = scoreConfig(o.relevancia_score);

  const handleExpand = async () => {
    const abriendo = !expandido;
    setExpandido(abriendo);
    if (abriendo && !o.visto) {
      onVisto(o.relevancia_id);
      await fetch(`/api/cotizacion/${userId}/${encodeURIComponent(c.codigo)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visto: true }),
      });
    }
  };

  return (
    <div style={{
      background: WHITE, borderRadius: 16,
      border: `1.5px solid ${!o.visto ? BLUE + '50' : BORDER}`,
      marginBottom: 12, overflow: 'hidden',
      boxShadow: !o.visto
        ? `0 2px 12px ${BLUE}18`
        : '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <button onClick={handleExpand} style={{
        width: '100%', textAlign: 'left', background: 'none', border: 'none',
        cursor: 'pointer', padding: '16px', display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        {/* Score badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            background: sc.bg, borderRadius: 10, padding: '6px 10px',
            textAlign: 'center', minWidth: 52,
            border: `1.5px solid ${sc.color}30`,
          }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: sc.color, lineHeight: 1 }}>
              {o.relevancia_score}
            </div>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, color: sc.color,
              textTransform: 'uppercase', marginTop: 2, letterSpacing: '0.05em' }}>
              {sc.label}
            </div>
          </div>
          {!o.visto && (
            <span style={{
              position: 'absolute', top: -5, right: -5, width: 12, height: 12,
              borderRadius: '50%', background: RED, border: `2.5px solid ${WHITE}`,
              animation: 'pulse 2s infinite',
            }} />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: '0.92rem', fontWeight: o.visto ? 600 : 800,
            color: TEXT, lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {c.nombre}
          </p>

          {c.organismo_nombre && (
            <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: MUTED, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.organismo_nombre}
            </p>
          )}

          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {c.monto && (
              <span style={{
                fontSize: '0.88rem', fontWeight: 800, color: NAVY,
                background: BLUEBG, padding: '2px 9px', borderRadius: 8,
              }}>
                {pesos(c.monto)}
              </span>
            )}
            {dias !== null && !pasado && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 700,
                background: urgente ? REDBG : dias <= 7 ? AMBERBG : BG,
                color: urgente ? RED : dias <= 7 ? AMBER : MUTED,
                padding: '2px 8px', borderRadius: 8,
              }}>
                {urgente ? `⚡ ${dias}d` : fechaCorta(c.fecha_cierre)}
              </span>
            )}
            {pasado && (
              <span style={{ fontSize: '0.75rem', color: MUTED, background: BG,
                padding: '2px 8px', borderRadius: 8 }}>
                Vencida
              </span>
            )}
            {o.cotizacion_descargada && (
              <span style={{ fontSize: '0.72rem', background: GREENBG, color: GREEN,
                padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>
                PDF ✓
              </span>
            )}
          </div>

          {o.razon_match && (
            <p style={{ margin: '6px 0 0', fontSize: '0.73rem', color: BLUE, fontWeight: 600 }}>
              {o.razon_match}
            </p>
          )}
          {o.comentario && (
            <p style={{ margin: '4px 0 0', fontSize: '0.73rem', color: MUTED, fontStyle: 'italic',
              display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              "{o.comentario}"
            </p>
          )}
        </div>

        <span style={{ flexShrink: 0, color: MUTED, fontSize: '1rem', paddingTop: 2,
          transform: expandido ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▾</span>
      </button>

      {expandido && (
        <div style={{ borderTop: `1.5px solid ${BORDER}`, padding: '16px', background: BLUEBG }}>
          <Link
            href={`/app/cotizacion/${userId}/${encodeURIComponent(c.codigo)}`}
            style={{ ...btnPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none', marginBottom: 16, width: '100%' }}
          >
            Cotizar esta licitación →
          </Link>
          <DetallePanel codigo={c.codigo} />
        </div>
      )}
    </div>
  );
}

// ─── Tab 1: Oportunidades ─────────────────────────────────────────────────────

function OportunidadesTab({ userId, usuario, onCount, onNoVistas }: {
  userId: string; usuario: Usuario | null;
  onCount: (n: number) => void; onNoVistas: (n: number) => void;
}) {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [loading, setLoading]   = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [msg, setMsg] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'alta' | 'urgente' | 'novistas'>('todas');

  const cargar = useCallback(() => {
    setLoading(true);
    fetch(`/api/clientes/${userId}/licitaciones?limite=100`)
      .then(r => r.json())
      .then(d => {
        const lista = Array.isArray(d) ? d : [];
        setOportunidades(lista);
        onCount(lista.length);
        onNoVistas(lista.filter((o: Oportunidad) => !o.visto).length);
        setLoading(false);
      });
  }, [userId, onCount, onNoVistas]);

  useEffect(() => { cargar(); }, [cargar]);

  const calcular = async () => {
    if (!usuario) return;
    setCalculando(true); setMsg('');
    const res = await fetch(`/api/clientes/${userId}/relevancia`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rubros: usuario.rubros_json ?? [] }),
    });
    const json = await res.json();
    setCalculando(false);
    setMsg(json.guardadas > 0
      ? `Encontradas ${json.guardadas} oportunidades`
      : 'Sin nuevas oportunidades. Revisa los rubros en Perfil.');
    if (json.guardadas > 0) cargar();
  };

  const marcarVisto = (id: string) => {
    setOportunidades(prev => prev.map(o => o.relevancia_id === id ? { ...o, visto: true } : o));
    onNoVistas(oportunidades.filter(o => !o.visto && o.relevancia_id !== id).length);
  };

  const noVistas  = oportunidades.filter(o => !o.visto).length;
  const filtradas = oportunidades.filter(o => {
    if (filtro === 'alta')     return o.relevancia_score >= 60;
    if (filtro === 'urgente')  { const d = diasParaCierre(o.compra?.fecha_cierre ?? null); return d !== null && d >= 0 && d <= 7; }
    if (filtro === 'novistas') return !o.visto;
    return true;
  });

  return (
    <div style={{ padding: '16px' }}>
      {/* Search button */}
      <button
        style={{ ...btnPrimary, width: '100%', marginBottom: 14, fontSize: '0.92rem' }}
        onClick={calcular} disabled={calculando}
      >
        {calculando ? 'Buscando oportunidades…' : '↻ Buscar oportunidades'}
      </button>

      {msg && (
        <div style={{
          background: msg.startsWith('Sin') ? AMBERBG : GREENBG,
          border: `1px solid ${msg.startsWith('Sin') ? AMBER + '40' : GREEN + '40'}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
          fontSize: '0.85rem', fontWeight: 600,
          color: msg.startsWith('Sin') ? AMBER : GREEN,
        }}>
          {msg}
        </div>
      )}

      {/* Filter chips */}
      {oportunidades.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {([
            { key: 'todas',    label: `Todas (${oportunidades.length})` },
            { key: 'novistas', label: `No vistas${noVistas > 0 ? ` · ${noVistas}` : ''}` },
            { key: 'alta',     label: 'Alta relevancia' },
            { key: 'urgente',  label: '⚡ Urgentes' },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)} style={{
              height: 34, borderRadius: 99, cursor: 'pointer',
              background: filtro === f.key ? BLUE : WHITE,
              color: filtro === f.key ? WHITE : MUTED,
              border: `1.5px solid ${filtro === f.key ? BLUE : BORDER}`,
              fontSize: '0.78rem', fontWeight: 700, padding: '0 14px',
            }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
          Cargando…
        </div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
          <p style={{ color: TEXT, fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>
            Sin oportunidades todavía
          </p>
          <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
            Presiona "Buscar oportunidades" para analizar<br />las compras ágiles del portal.
          </p>
          {!usuario?.rubros_json?.length && (
            <p style={{ color: RED, fontSize: '0.85rem', marginTop: 12, fontWeight: 600 }}>
              ⚠ Agrega rubros en Perfil para mejores resultados
            </p>
          )}
        </div>
      ) : (
        filtradas.map(o => (
          <OportunidadCard key={o.compra_agil_id} o={o} userId={userId} onVisto={marcarVisto} />
        ))
      )}
    </div>
  );
}

// ─── Tab 2: Propuestas ────────────────────────────────────────────────────────

function PropuestasTab({ userId, onCount }: { userId: string; onCount: (n: number) => void }) {
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clientes/${userId}/propuestas`).then(r => r.json()).then(d => {
      const lista = Array.isArray(d) ? d : [];
      setPropuestas(lista); onCount(lista.length); setLoading(false);
    });
  }, [userId, onCount]);

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch(`/api/propuestas/${id}`, { method: 'PUT',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) });
    setPropuestas(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta propuesta?')) return;
    await fetch(`/api/propuestas/${id}`, { method: 'DELETE' });
    setPropuestas(prev => prev.filter(p => p.id !== id));
  };

  const stats = {
    incompletas: propuestas.filter(p => p.estado === 'incompleta').length,
    completas:   propuestas.filter(p => p.estado === 'completa').length,
    postuladas:  propuestas.filter(p => p.estado === 'postulada').length,
  };

  const badgeStyle = (estado: string): React.CSSProperties => {
    const m: Record<string, [string, string]> = {
      postulada:  [GREENBG, GREEN],
      completa:   [BLUEMID, BLUE],
      incompleta: [AMBERBG, AMBER],
    };
    const [bg, color] = m[estado] ?? [BG, MUTED];
    return { fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99,
      textTransform: 'uppercase', letterSpacing: '0.05em', background: bg, color };
  };

  return (
    <div style={{ padding: '16px' }}>
      {propuestas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Borradores', n: stats.incompletas, color: AMBER, bg: AMBERBG },
            { label: 'Completas',  n: stats.completas,   color: BLUE,  bg: BLUEMID },
            { label: 'Postuladas', n: stats.postuladas,  color: GREEN, bg: GREENBG },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14,
              padding: '14px 8px', textAlign: 'center', border: `1.5px solid ${s.color}20` }}>
              <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: s.color }}>{s.n}</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: s.color, fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>
      ) : propuestas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
          <p style={{ color: TEXT, fontWeight: 700, margin: '0 0 6px' }}>Sin propuestas aún</p>
          <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0 }}>
            Genera una desde la pestaña Oportunidades.
          </p>
        </div>
      ) : (
        propuestas.map(p => (
          <div key={p.id} style={{ background: WHITE, borderRadius: 16,
            border: `1.5px solid ${BORDER}`, padding: '16px', marginBottom: 10,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: TEXT,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.compra?.nombre ?? p.compra_agil_id}
                </p>
                <p style={{ margin: '3px 0 8px', fontSize: '0.76rem', color: MUTED }}>
                  {p.compra?.codigo} · {p.fecha ? fechaCorta(p.fecha) : '—'}
                </p>
                <span style={badgeStyle(p.estado)}>{p.estado}</span>
              </div>
              {p.monto_total && (
                <p style={{ margin: 0, fontWeight: 900, color: NAVY, fontSize: '1.1rem', flexShrink: 0 }}>
                  {pesos(p.monto_total)}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              {p.compra?.codigo && (
                <>
                  <Link href={`/dashboard/compra/${encodeURIComponent(p.compra.codigo)}`}
                    style={{ height: 38, borderRadius: 10, background: BLUE, color: WHITE,
                      fontSize: '0.82rem', fontWeight: 700, padding: '0 14px',
                      display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                    Ver / editar
                  </Link>
                  <a href={portalUrl(p.compra.codigo)} target="_blank" rel="noopener noreferrer"
                    style={{ height: 38, borderRadius: 10, background: WHITE, color: BLUE,
                      fontSize: '0.82rem', fontWeight: 700, padding: '0 14px',
                      display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
                      border: `2px solid ${BLUE}` }}>
                    Portal ↗
                  </a>
                </>
              )}
              {p.estado !== 'postulada' && (
                <button onClick={() => cambiarEstado(p.id, 'postulada')}
                  style={{ height: 38, borderRadius: 10, background: GREENBG, color: GREEN,
                    fontSize: '0.82rem', fontWeight: 700, padding: '0 14px',
                    border: 'none', cursor: 'pointer' }}>
                  ✓ Postulada
                </button>
              )}
              <button onClick={() => eliminar(p.id)}
                style={{ height: 38, borderRadius: 10, background: 'none', border: 'none',
                  color: MUTED, fontSize: '0.85rem', cursor: 'pointer', padding: '0 10px' }}>
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
  userId: string; usuario: Usuario | null; onUsuarioChange: (u: Usuario) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ empresa_nombre: '', rut: '', email: '', rubros: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (usuario) setForm({
      empresa_nombre: usuario.empresa_nombre ?? '',
      rut: usuario.rut ?? '',
      email: usuario.email ?? '',
      rubros: (usuario.rubros_json ?? []).join(', '),
      region: usuario.region ?? '',
    });
  }, [usuario]);

  const guardar = async () => {
    setSaving(true); setMsg('');
    const rubros_json = form.rubros.split(',').map(r => r.trim()).filter(Boolean);
    const res = await fetch(`/api/usuarios/${userId}`, { method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rubros_json }) });
    const json = await res.json();
    setSaving(false);
    if (json.error) { setMsg(json.error); return; }
    onUsuarioChange({ ...usuario!, ...form, rubros_json });
    setEditando(false); setMsg('Guardado correctamente');
  };

  if (!usuario) return <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>;

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ background: WHITE, borderRadius: 16, border: `1.5px solid ${BORDER}`,
        padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: NAVY }}>
            {usuario.empresa_nombre}
          </h3>
          <button onClick={() => setEditando(v => !v)} style={{
            height: 36, borderRadius: 8,
            background: editando ? BG : NAVY,
            color: editando ? MUTED : WHITE,
            border: editando ? `1.5px solid ${BORDER}` : 'none',
            fontSize: '0.82rem', fontWeight: 700, padding: '0 14px', cursor: 'pointer',
          }}>
            {editando ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {!editando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PRow label="RUT"    valor={usuario.rut} />
            <PRow label="Email"  valor={usuario.email ?? '—'} />
            <PRow label="Región" valor={usuario.region ?? '—'} />
            <div>
              <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 700, color: BLUE,
                textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rubros</p>
              {usuario.rubros_json?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {usuario.rubros_json.map(r => (
                    <span key={r} style={{ background: BLUEBG, color: BLUE,
                      fontSize: '0.82rem', fontWeight: 700, padding: '5px 14px',
                      borderRadius: 99, border: `1.5px solid ${BLUE}30` }}>
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: RED, fontWeight: 600 }}>
                  ⚠ Sin rubros — agrégalos para calcular relevancia
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {[
              { key: 'empresa_nombre', label: 'Nombre empresa' },
              { key: 'rut',            label: 'RUT' },
              { key: 'email',          label: 'Email' },
              { key: 'region',         label: 'Región' },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: BLUE,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  display: 'block', marginBottom: 5 }}>
                  {label}
                </label>
                <input style={inputStyle} value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: BLUE,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                display: 'block', marginBottom: 5 }}>
                Rubros (separados por coma)
              </label>
              <input style={inputStyle} placeholder="impresión, vestuario, pendones"
                value={form.rubros}
                onChange={e => setForm(f => ({ ...f, rubros: e.target.value }))} />
              <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: MUTED }}>
                Determinan qué licitaciones son relevantes para ti
              </p>
            </div>
            {msg && (
              <p style={{ fontSize: '0.85rem', fontWeight: 600,
                color: msg.includes('correctamente') ? GREEN : RED, margin: '0 0 10px' }}>
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
        <p style={{ fontSize: '0.85rem', color: GREEN, margin: '12px 0 0', fontWeight: 600 }}>{msg}</p>
      )}
    </div>
  );
}

function PRow({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: MUTED,
        textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 56 }}>
        {label}
      </span>
      <span style={{ fontSize: '0.92rem', color: TEXT, fontWeight: 600 }}>{valor}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage({ params }: { params: { user_id: string } }) {
  const [tab, setTab]               = useState(0);
  const [usuario, setUsuario]       = useState<Usuario | null>(null);
  const [countOp, setCountOp]       = useState(0);
  const [countProp, setCountProp]   = useState(0);
  const [noVistas, setNoVistas]     = useState(0);

  useEffect(() => {
    fetch(`/api/usuarios/${params.user_id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setUsuario(d); });
  }, [params.user_id]);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="dash-root" style={{
        minHeight: '100vh', background: BG,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
        color: TEXT, maxWidth: 480, margin: '0 auto',
      }}>
        {/* Header */}
        <header style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
          color: WHITE, padding: '18px 16px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Link href="/app/dashboard" style={{
            color: WHITE, textDecoration: 'none', fontSize: '1.2rem', lineHeight: 1,
            padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.12)',
            fontWeight: 300,
          }}>←</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {usuario?.empresa_nombre ?? '…'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.65, marginTop: 1 }}>
              RUT {usuario?.rut ?? '…'}
            </p>
          </div>
          {/* Unread badge in header */}
          {noVistas > 0 && (
            <div style={{ background: RED, borderRadius: 99, minWidth: 26, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 800, color: WHITE, padding: '0 6px' }}>
              {noVistas}
            </div>
          )}
        </header>

        {/* Sticky tab bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,26,77,0.08)' }}>
          <TabBar
            active={tab} onChange={setTab}
            counts={[countOp, countProp]}
            noVistas={noVistas}
          />
        </div>

        {/* Content */}
        <div style={{ minHeight: 'calc(100vh - 122px)', paddingBottom: 24 }}>
          {tab === 0 && (
            <OportunidadesTab userId={params.user_id} usuario={usuario}
              onCount={setCountOp} onNoVistas={setNoVistas} />
          )}
          {tab === 1 && (
            <PropuestasTab userId={params.user_id} onCount={setCountProp} />
          )}
          {tab === 2 && (
            <PerfilTab userId={params.user_id} usuario={usuario} onUsuarioChange={setUsuario} />
          )}
        </div>
      </div>
    </>
  );
}
