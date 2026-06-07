'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Usuario {
  id: string; empresa_nombre: string; rut: string;
  email?: string; rubros_json?: string[]; region?: string;
}
interface CompraDetalle {
  id: string; codigo: string; nombre: string; estado: string | null;
  monto: number | null; region: string | null;
  fecha_cierre: string | null; organismo_nombre: string | null;
}
interface Oportunidad {
  relevancia_id: string; compra_agil_id: string;
  relevancia_score: number; razon_match: string | null;
  visto: boolean; cotizacion_descargada: boolean;
  comentario: string | null; compra?: CompraDetalle;
}
interface Propuesta {
  id: string; compra_agil_id: string; estado: string;
  monto_total: number | null; fecha: string | null;
  compra?: { id: string; codigo: string; nombre: string };
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

const NAVY   = '#001A4D';
const BLUE   = '#0047CC';
const WHITE  = '#FFFFFF';
const BG     = '#F0F4FF';
const TEXT   = '#0A0F1E';
const MUTED  = '#5A6480';
const BORDER = '#D6E0F5';
const GREEN  = '#027A48';
const GREENBG= '#ECFDF3';
const AMBER  = '#92400E';
const AMBERBG= '#FFFBEB';
const RED    = '#C01048';
const REDBG  = '#FFF1F3';
const BLUEBG = '#EEF3FF';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pesos(n: number | null) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString('es-CL')}`;
}
function diasParaCierre(s: string | null) {
  if (!s) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const c = new Date(s); c.setHours(0, 0, 0, 0);
  return Math.ceil((c.getTime() - hoy.getTime()) / 86400000);
}
function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}
function portalUrl(c: string) {
  return `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(c)}`;
}
function scoreCfg(s: number) {
  if (s >= 60) return { c: GREEN, bg: GREENBG, t: 'ALTA' };
  if (s >= 30) return { c: AMBER, bg: AMBERBG, t: 'MED' };
  return { c: MUTED, bg: BG, t: 'BAJA' };
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function Tabs({ active, onChange, noVistas, nProp }: {
  active: number; onChange: (i: number) => void;
  noVistas: number; nProp: number;
}) {
  return (
    <div style={{ display: 'flex', background: WHITE,
      borderBottom: `1px solid ${BORDER}`, padding: '0 4px' }}>
      {[
        { label: 'Oportunidades', badge: noVistas },
        { label: 'Propuestas',    badge: nProp },
        { label: 'Perfil',        badge: 0 },
      ].map((t, i) => (
        <button key={i} onClick={() => onChange(i)} style={{
          flex: 1, height: 44, border: 'none', background: 'none', cursor: 'pointer',
          fontSize: '0.8rem', fontWeight: active === i ? 700 : 500,
          color: active === i ? BLUE : MUTED,
          borderBottom: active === i ? `2px solid ${BLUE}` : '2px solid transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
          {t.label}
          {t.badge > 0 && (
            <span style={{ background: RED, color: WHITE, fontSize: '0.6rem',
              fontWeight: 800, padding: '1px 5px', borderRadius: 99 }}>
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Detalle panel ────────────────────────────────────────────────────────────

interface DetalleMP {
  codigo: string; nombre: string; descripcion: string | null; estado: string;
  organismo: { nombre: string | null; rut: string | null; region: string | null };
  monto: number | null;
  fechas: { publicacion: string; cierre: string; fin_preguntas: string };
  items: Array<{ descripcion: string; cantidad: number | null; unidad: string | null }>;
  condiciones: { plazo_entrega: string | null; forma_pago: string | null; lugar_entrega: string | null };
  contacto: { nombre?: string; email?: string } | null;
  documentos: Array<{ nombre: string; url: string; tipo: string }>;
  _fuente?: string; _aviso?: string;
}

function DetallePanel({ codigo }: { codigo: string }) {
  const [d, setD] = useState<DetalleMP | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`/api/compras-agiles/${encodeURIComponent(codigo)}`)
      .then(r => r.json()).then(x => { setD(x); setCargando(false); })
      .catch(() => setCargando(false));
  }, [codigo]);

  if (cargando) return <p style={{ color: MUTED, fontSize: '0.8rem', padding: '8px 0' }}>Cargando…</p>;
  if (!d) return null;

  return (
    <div style={{ fontSize: '0.82rem', color: TEXT, lineHeight: 1.6 }}>
      {d._aviso && (
        <p style={{ background: AMBERBG, color: AMBER, borderRadius: 8,
          padding: '6px 10px', fontSize: '0.75rem', margin: '0 0 10px' }}>
          {d._aviso}
        </p>
      )}

      {/* Organismo */}
      {d.organismo.nombre && (
        <div style={{ marginBottom: 10 }}>
          <span style={labelStyle}>Organismo</span>
          <p style={{ margin: '2px 0 0', fontWeight: 600, color: TEXT }}>{d.organismo.nombre}</p>
          {d.organismo.region && <p style={{ margin: 0, color: MUTED, fontSize: '0.77rem' }}>{d.organismo.region}</p>}
        </div>
      )}

      {/* Descripción */}
      {d.descripcion && (
        <div style={{ marginBottom: 10 }}>
          <span style={labelStyle}>Descripción</span>
          <p style={{ margin: '2px 0 0', color: TEXT, whiteSpace: 'pre-line', lineHeight: 1.5 }}>
            {d.descripcion}
          </p>
        </div>
      )}

      {/* Ítems — mini tabla */}
      {d.items.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <span style={labelStyle}>Ítems solicitados ({d.items.length})</span>
          <div style={{ marginTop: 4, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
            {d.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '7px 10px', fontSize: '0.78rem',
                background: i % 2 === 0 ? WHITE : BLUEBG,
                borderBottom: i < d.items.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <span style={{ flex: 1, color: TEXT, fontWeight: 500 }}>{it.descripcion}</span>
                {it.cantidad && (
                  <span style={{ color: MUTED, flexShrink: 0, marginLeft: 8 }}>
                    {it.cantidad} {it.unidad ?? ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fechas + condiciones inline */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
        <div>
          <span style={labelStyle}>Cierre</span>
          <p style={{ margin: '2px 0 0', fontWeight: 700, color: TEXT }}>{d.fechas.cierre}</p>
        </div>
        {d.monto && (
          <div>
            <span style={labelStyle}>Presupuesto</span>
            <p style={{ margin: '2px 0 0', fontWeight: 700, color: BLUE, fontSize: '0.95rem' }}>
              {pesos(d.monto)}
            </p>
          </div>
        )}
        {d.condiciones.plazo_entrega && (
          <div>
            <span style={labelStyle}>Plazo entrega</span>
            <p style={{ margin: '2px 0 0', color: TEXT }}>{d.condiciones.plazo_entrega}</p>
          </div>
        )}
      </div>

      {/* Documentos */}
      {d.documentos?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <span style={labelStyle}>Adjuntos ({d.documentos.length})</span>
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.documentos.map((doc, i) => (
              <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8,
                  background: WHITE, borderRadius: 8, padding: '7px 10px',
                  border: `1px solid ${BORDER}`, textDecoration: 'none',
                  fontSize: '0.78rem', color: BLUE, fontWeight: 600 }}>
                <span style={{ flexShrink: 0 }}>
                  {doc.nombre?.toLowerCase().includes('.pdf') ? '📄' : '📎'}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.nombre}
                </span>
                <span style={{ color: MUTED, flexShrink: 0 }}>↓</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {d.contacto?.email && (
        <div>
          <span style={labelStyle}>Contacto</span>
          <a href={`mailto:${d.contacto.email}`}
            style={{ display: 'block', color: BLUE, fontSize: '0.8rem', marginTop: 2 }}>
            {d.contacto.email}
          </a>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.67rem', fontWeight: 700, color: BLUE,
  textTransform: 'uppercase', letterSpacing: '0.07em',
};

// ─── Fila de oportunidad ──────────────────────────────────────────────────────

function FilaOportunidad({ o, userId, onVisto }: {
  o: Oportunidad; userId: string; onVisto: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const c = o.compra;
  if (!c) return null;

  const dias   = diasParaCierre(c.fecha_cierre);
  const urgente = dias !== null && dias >= 0 && dias <= 3;
  const pasado  = dias !== null && dias < 0;
  const sc      = scoreCfg(o.relevancia_score);

  const toggle = async () => {
    const abriendo = !open;
    setOpen(abriendo);
    if (abriendo && !o.visto) {
      onVisto(o.relevancia_id);
      fetch(`/api/cotizacion/${userId}/${encodeURIComponent(c.codigo)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visto: true }),
      });
    }
  };

  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      {/* Compact row */}
      <button onClick={toggle} style={{
        width: '100%', textAlign: 'left', background: open ? BLUEBG : WHITE,
        border: 'none', cursor: 'pointer', padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* Score pill */}
        <span style={{ flexShrink: 0, fontSize: '0.7rem', fontWeight: 800,
          background: sc.bg, color: sc.c, padding: '2px 7px', borderRadius: 99,
          minWidth: 36, textAlign: 'center', position: 'relative' }}>
          {o.relevancia_score}
          {!o.visto && (
            <span style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7,
              borderRadius: '50%', background: RED, border: `1.5px solid ${WHITE}` }} />
          )}
        </span>

        {/* Name + organismo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.84rem',
            fontWeight: o.visto ? 500 : 700, color: TEXT,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.nombre}
          </p>
          {c.organismo_nombre && (
            <p style={{ margin: 0, fontSize: '0.71rem', color: MUTED,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.organismo_nombre}
            </p>
          )}
        </div>

        {/* Right meta */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {c.monto && (
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: NAVY }}>
              {pesos(c.monto)}
            </p>
          )}
          <p style={{ margin: 0, fontSize: '0.7rem',
            color: urgente ? RED : pasado ? MUTED : MUTED,
            fontWeight: urgente ? 700 : 400 }}>
            {pasado ? 'Vencida' : urgente ? `⚡${dias}d` : fechaCorta(c.fecha_cierre)}
          </p>
        </div>

        <span style={{ flexShrink: 0, color: MUTED, fontSize: '0.75rem',
          transform: open ? 'rotate(90deg)' : 'none', transition: '0.15s' }}>›</span>
      </button>

      {/* Expanded */}
      {open && (
        <div style={{ background: BLUEBG, padding: '12px 14px', borderTop: `1px solid ${BORDER}` }}>
          {/* Tags row */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {o.cotizacion_descargada && (
              <Tag color={GREEN} bg={GREENBG}>PDF ✓</Tag>
            )}
            {o.razon_match && <Tag color={BLUE} bg={'#E0EBFF'}>{o.razon_match}</Tag>}
            {o.comentario && <Tag color={MUTED} bg={BG} italic>"{o.comentario}"</Tag>}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <Link href={`/app/cotizacion/${userId}/${encodeURIComponent(c.codigo)}`}
              style={{ height: 34, borderRadius: 8, background: BLUE, color: WHITE,
                fontSize: '0.8rem', fontWeight: 700, padding: '0 14px',
                display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              Cotizar →
            </Link>
            <a href={portalUrl(c.codigo)} target="_blank" rel="noopener noreferrer"
              style={{ height: 34, borderRadius: 8, background: WHITE, color: BLUE,
                fontSize: '0.8rem', fontWeight: 600, padding: '0 12px',
                display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
                border: `1.5px solid ${BORDER}` }}>
              Portal ↗
            </a>
          </div>

          <DetallePanel codigo={c.codigo} />
        </div>
      )}
    </div>
  );
}

function Tag({ color, bg, italic, children }: {
  color: string; bg: string; italic?: boolean; children: React.ReactNode;
}) {
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 600, color, background: bg,
      padding: '2px 8px', borderRadius: 99, fontStyle: italic ? 'italic' : 'normal',
      maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      display: 'inline-block' }}>
      {children}
    </span>
  );
}

// ─── Tab Oportunidades ────────────────────────────────────────────────────────

function OportunidadesTab({ userId, usuario, onCount, onNoVistas }: {
  userId: string; usuario: Usuario | null;
  onCount: (n: number) => void; onNoVistas: (n: number) => void;
}) {
  const [lista, setLista]           = useState<Oportunidad[]>([]);
  const [loading, setLoading]       = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [msg, setMsg]               = useState('');
  const [filtro, setFiltro]         = useState<'todas' | 'novistas' | 'alta' | 'urgente'>('todas');

  const cargar = useCallback(() => {
    setLoading(true);
    fetch(`/api/clientes/${userId}/licitaciones?limite=100`)
      .then(r => r.json()).then(d => {
        if (d?.error) { setMsg(`Error al cargar: ${d.error}`); setLoading(false); return; }
        const l = Array.isArray(d) ? d : [];
        setLista(l);
        onCount(l.length);
        onNoVistas(l.filter((o: Oportunidad) => !o.visto).length);
        setLoading(false);
      });
  }, [userId, onCount, onNoVistas]);

  useEffect(() => { cargar(); }, [cargar]);

  const buscar = async () => {
    if (!usuario) return;
    setCalculando(true); setMsg('');
    const res = await fetch(`/api/clientes/${userId}/relevancia`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rubros: usuario.rubros_json ?? [] }),
    });
    const j = await res.json();
    setCalculando(false);
    setMsg(j.guardadas > 0 ? `${j.guardadas} nuevas oportunidades encontradas` : 'Sin nuevas oportunidades');
    if (j.guardadas > 0) cargar();
  };

  const marcarVisto = (id: string) => {
    setLista(prev => prev.map(o => o.relevancia_id === id ? { ...o, visto: true } : o));
    onNoVistas(lista.filter(o => !o.visto && o.relevancia_id !== id).length);
  };

  const noVistas = lista.filter(o => !o.visto).length;

  const filtradas = lista.filter(o => {
    if (filtro === 'novistas') return !o.visto;
    if (filtro === 'alta')     return o.relevancia_score >= 60;
    if (filtro === 'urgente')  { const d = diasParaCierre(o.compra?.fecha_cierre ?? null); return d !== null && d >= 0 && d <= 7; }
    return true;
  });

  return (
    <div>
      {/* Top bar */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`,
        display: 'flex', gap: 8, alignItems: 'center', background: WHITE }}>
        <button onClick={buscar} disabled={calculando}
          style={{ height: 32, borderRadius: 8, border: 'none', background: BLUE,
            color: WHITE, fontSize: '0.78rem', fontWeight: 700,
            padding: '0 14px', cursor: 'pointer', flexShrink: 0 }}>
          {calculando ? '…' : '↻ Buscar'}
        </button>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', flexShrink: 1,
          scrollbarWidth: 'none' }}>
          {([
            { k: 'todas',    l: `Todas${lista.length ? ` (${lista.length})` : ''}` },
            { k: 'novistas', l: `No vistas${noVistas ? ` (${noVistas})` : ''}` },
            { k: 'alta',     l: 'Alta' },
            { k: 'urgente',  l: '⚡ Urgente' },
          ] as const).map(f => (
            <button key={f.k} onClick={() => setFiltro(f.k)} style={{
              height: 28, borderRadius: 99, border: `1px solid ${filtro === f.k ? BLUE : BORDER}`,
              background: filtro === f.k ? BLUE : WHITE,
              color: filtro === f.k ? WHITE : MUTED,
              fontSize: '0.72rem', fontWeight: 600, padding: '0 10px',
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ padding: '7px 12px', background: msg.includes('Sin') ? AMBERBG : GREENBG,
          fontSize: '0.78rem', fontWeight: 600,
          color: msg.includes('Sin') ? AMBER : GREEN, borderBottom: `1px solid ${BORDER}` }}>
          {msg}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: MUTED, textAlign: 'center', padding: '40px 0', fontSize: '0.85rem' }}>
          Cargando…
        </p>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <p style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>🔍</p>
          <p style={{ color: TEXT, fontWeight: 700, fontSize: '0.9rem', margin: '0 0 4px' }}>
            Sin oportunidades
          </p>
          <p style={{ color: MUTED, fontSize: '0.82rem', margin: 0 }}>
            Presiona "Buscar" para analizar el portal
          </p>
        </div>
      ) : (
        <div>
          {/* Column headers */}
          <div style={{ display: 'flex', padding: '5px 12px', background: BG,
            borderBottom: `1px solid ${BORDER}`, gap: 10 }}>
            <span style={{ ...colHeader, width: 40 }}>Score</span>
            <span style={{ ...colHeader, flex: 1 }}>Licitación</span>
            <span style={{ ...colHeader, width: 56, textAlign: 'right' }}>Monto</span>
            <span style={{ ...colHeader, width: 36, textAlign: 'right' }}>Cierre</span>
            <span style={{ width: 14 }} />
          </div>
          {filtradas.map(o => (
            <FilaOportunidad key={o.compra_agil_id} o={o} userId={userId} onVisto={marcarVisto} />
          ))}
        </div>
      )}
    </div>
  );
}

const colHeader: React.CSSProperties = {
  fontSize: '0.62rem', fontWeight: 700, color: MUTED,
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

// ─── Tab Propuestas ───────────────────────────────────────────────────────────

function PropuestasTab({ userId, onCount }: { userId: string; onCount: (n: number) => void }) {
  const [lista, setLista]   = useState<Propuesta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clientes/${userId}/propuestas`).then(r => r.json()).then(d => {
      const l = Array.isArray(d) ? d : [];
      setLista(l); onCount(l.length); setLoading(false);
    });
  }, [userId, onCount]);

  const cambiar = async (id: string, estado: string) => {
    await fetch(`/api/propuestas/${id}`, { method: 'PUT',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) });
    setLista(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
  };
  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar?')) return;
    await fetch(`/api/propuestas/${id}`, { method: 'DELETE' });
    setLista(prev => prev.filter(p => p.id !== id));
  };

  const badge = (e: string): React.CSSProperties => {
    const m: Record<string, [string,string]> = {
      postulada: [GREENBG, GREEN], completa: [BLUEBG, BLUE], incompleta: [AMBERBG, AMBER],
    };
    const [bg, c] = m[e] ?? [BG, MUTED];
    return { fontSize: '0.62rem', fontWeight: 800, padding: '1px 7px', borderRadius: 99,
      textTransform: 'uppercase', letterSpacing: '0.05em', background: bg, color: c };
  };

  if (loading) return <p style={{ color: MUTED, textAlign: 'center', padding: 40, fontSize: '0.85rem' }}>Cargando…</p>;

  if (!lista.length) return (
    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
      <p style={{ fontSize: '1.8rem', margin: '0 0 8px' }}>📋</p>
      <p style={{ color: TEXT, fontWeight: 700, fontSize: '0.9rem', margin: '0 0 4px' }}>Sin propuestas</p>
      <p style={{ color: MUTED, fontSize: '0.82rem' }}>Genera una desde Oportunidades</p>
    </div>
  );

  return (
    <div>
      {lista.map(p => (
        <div key={p.id} style={{ padding: '10px 12px', borderBottom: `1px solid ${BORDER}`,
          background: WHITE, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: TEXT,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.compra?.nombre ?? p.compra_agil_id}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
              <span style={badge(p.estado)}>{p.estado}</span>
              <span style={{ fontSize: '0.72rem', color: MUTED }}>{p.compra?.codigo}</span>
            </div>
          </div>
          {p.monto_total && (
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: NAVY, flexShrink: 0 }}>
              {pesos(p.monto_total)}
            </span>
          )}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {p.estado !== 'postulada' && (
              <button onClick={() => cambiar(p.id, 'postulada')}
                style={{ height: 28, borderRadius: 6, background: GREENBG, color: GREEN,
                  border: 'none', fontSize: '0.72rem', fontWeight: 700,
                  padding: '0 10px', cursor: 'pointer' }}>
                ✓
              </button>
            )}
            <button onClick={() => eliminar(p.id)}
              style={{ height: 28, borderRadius: 6, background: 'none', border: 'none',
                color: MUTED, fontSize: '0.8rem', cursor: 'pointer', padding: '0 6px' }}>
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab Perfil ───────────────────────────────────────────────────────────────

function PerfilTab({ userId, usuario, onUsuarioChange }: {
  userId: string; usuario: Usuario | null; onUsuarioChange: (u: Usuario) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ empresa_nombre: '', rut: '', email: '', rubros: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (usuario) setForm({
      empresa_nombre: usuario.empresa_nombre ?? '', rut: usuario.rut ?? '',
      email: usuario.email ?? '', rubros: (usuario.rubros_json ?? []).join(', '),
      region: usuario.region ?? '',
    });
  }, [usuario]);

  const guardar = async () => {
    setSaving(true); setMsg('');
    const rubros_json = form.rubros.split(',').map(r => r.trim()).filter(Boolean);
    const res = await fetch(`/api/usuarios/${userId}`, { method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rubros_json }) });
    const j = await res.json();
    setSaving(false);
    if (j.error) { setMsg(j.error); return; }
    onUsuarioChange({ ...usuario!, ...form, rubros_json });
    setEditando(false); setMsg('Guardado');
  };

  if (!usuario) return <p style={{ color: MUTED, textAlign: 'center', padding: 40 }}>Cargando…</p>;

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontWeight: 800, color: NAVY, fontSize: '0.92rem' }}>
            {usuario.empresa_nombre}
          </p>
          <button onClick={() => setEditando(v => !v)}
            style={{ height: 28, borderRadius: 6, border: `1px solid ${BORDER}`,
              background: editando ? BG : NAVY, color: editando ? MUTED : WHITE,
              fontSize: '0.75rem', fontWeight: 700, padding: '0 12px', cursor: 'pointer' }}>
            {editando ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {!editando ? (
          <div style={{ padding: '12px 14px' }}>
            {[['RUT', usuario.rut], ['Email', usuario.email ?? '—'], ['Región', usuario.region ?? '—']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: '0.84rem' }}>
                <span style={{ color: MUTED, minWidth: 52 }}>{l}</span>
                <span style={{ color: TEXT, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.67rem', fontWeight: 700,
                color: BLUE, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rubros</p>
              {usuario.rubros_json?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {usuario.rubros_json.map(r => (
                    <span key={r} style={{ background: BLUEBG, color: BLUE, fontSize: '0.75rem',
                      fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: RED, fontSize: '0.8rem', margin: 0, fontWeight: 600 }}>
                  ⚠ Sin rubros — agrégalos para buscar oportunidades
                </p>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '14px' }}>
            {[
              { k: 'empresa_nombre', l: 'Empresa' },
              { k: 'rut',            l: 'RUT' },
              { k: 'email',          l: 'Email' },
              { k: 'region',         l: 'Región' },
            ].map(({ k, l }) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.67rem', fontWeight: 700, color: BLUE,
                  textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>
                  {l}
                </label>
                <input style={{ width: '100%', height: 38, borderRadius: 8,
                  border: `1.5px solid ${BORDER}`, padding: '0 10px', fontSize: '0.88rem', color: TEXT }}
                  value={form[k as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.67rem', fontWeight: 700, color: BLUE,
                textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 }}>
                Rubros (separados por coma)
              </label>
              <input style={{ width: '100%', height: 38, borderRadius: 8,
                border: `1.5px solid ${BORDER}`, padding: '0 10px', fontSize: '0.88rem', color: TEXT }}
                placeholder="impresión, vestuario, pendones"
                value={form.rubros}
                onChange={e => setForm(f => ({ ...f, rubros: e.target.value }))} />
            </div>
            {msg && <p style={{ color: msg === 'Guardado' ? GREEN : RED,
              fontSize: '0.82rem', fontWeight: 600, margin: '0 0 8px' }}>{msg}</p>}
            <button onClick={guardar} disabled={saving}
              style={{ width: '100%', height: 40, borderRadius: 8, border: 'none',
                background: BLUE, color: WHITE, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
      {msg && !editando && (
        <p style={{ color: GREEN, fontSize: '0.82rem', fontWeight: 600, margin: '10px 0 0' }}>{msg}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage({ params }: { params: { user_id: string } }) {
  const [tab, setTab]           = useState(0);
  const [usuario, setUsuario]   = useState<Usuario | null>(null);
  const [nOp, setNOp]           = useState(0);
  const [nProp, setNProp]       = useState(0);
  const [noVistas, setNoVistas] = useState(0);

  useEffect(() => {
    fetch(`/api/usuarios/${params.user_id}`).then(r => r.json())
      .then(d => { if (!d.error) setUsuario(d); });
  }, [params.user_id]);

  return (
    <div style={{
      minHeight: '100vh', background: BG, maxWidth: 540, margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      color: TEXT,
    }}>
      {/* Header */}
      <header style={{ background: NAVY, color: WHITE, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/app/dashboard" style={{ color: 'rgba(255,255,255,0.5)',
          textDecoration: 'none', fontSize: '1.1rem', lineHeight: 1,
          padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.08)' }}>
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {usuario?.empresa_nombre ?? '…'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>
            {usuario?.rut ?? '…'}
          </p>
        </div>
        {noVistas > 0 && (
          <span style={{ background: RED, color: WHITE, fontSize: '0.68rem', fontWeight: 800,
            padding: '2px 7px', borderRadius: 99, flexShrink: 0 }}>
            {noVistas} nuevas
          </span>
        )}
      </header>

      {/* Tabs */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 4px rgba(0,26,77,0.1)' }}>
        <Tabs active={tab} onChange={setTab} noVistas={noVistas} nProp={nProp} />
      </div>

      {/* Content */}
      <div style={{ background: WHITE, minHeight: 'calc(100vh - 100px)' }}>
        {tab === 0 && (
          <OportunidadesTab userId={params.user_id} usuario={usuario}
            onCount={setNOp} onNoVistas={setNoVistas} />
        )}
        {tab === 1 && <PropuestasTab userId={params.user_id} onCount={setNProp} />}
        {tab === 2 && <PerfilTab userId={params.user_id} usuario={usuario} onUsuarioChange={setUsuario} />}
      </div>
    </div>
  );
}
