'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Item {
  id: string;
  nombre: string;
  descripcion: string | null;
  cantidad: number;
  unidad_medida: string;
  costo: number | null;
  margen: number | null;
  precio: number | null;
  costo_cliente: number | null;
  margen_cliente: number | null;
  precio_cliente: number | null;
}
interface Data {
  cot: { estado: string; notas: string | null; enviada_at: string; respondida_at: string | null; postulada_at: string | null; quien_postulo: string | null };
  compra: { codigo: string; nombre: string; organismo_nombre: string | null; fecha_cierre: string | null; monto: number | null };
  usuario: { empresa_nombre: string; rut: string };
  items: Item[];
}
interface Row extends Item { costoEdit: string; margenEdit: string; precioEdit: string }

type EstadoFinal = 'aprobada' | 'rechazada' | 'postulada' | 'ganada' | 'perdida' | 'desierta';
const ESTADOS_FINALES: EstadoFinal[] = ['aprobada', 'rechazada', 'postulada', 'ganada', 'perdida', 'desierta'];

const BLUE = '#003DA5'; const BLUE_D = '#00297A';
const GREEN = '#059669'; const RED = '#DC2626';
const TEXT = '#111827'; const MUTED = '#6B7280';
const BORDER = '#E5E7EB'; const BG = '#F9FAFB'; const WHITE = '#FFFFFF';

const ESTADO_INFO: Record<EstadoFinal, { label: string; color: string; emoji: string; canModify: boolean }> = {
  aprobada:  { label: 'Postulada',                 color: GREEN, emoji: '✅', canModify: true  },
  rechazada: { label: 'Rechazada',                 color: RED,   emoji: '❌', canModify: true  },
  postulada: { label: 'Enviada al organismo',      color: BLUE,  emoji: '📤', canModify: false },
  ganada:    { label: 'Adjudicada',                color: GREEN, emoji: '🏆', canModify: false },
  perdida:   { label: 'No adjudicada',             color: RED,   emoji: '📋', canModify: false },
  desierta:  { label: 'Licitación desierta',       color: MUTED, emoji: '📋', canModify: false },
};

function pesos(n: number) {
  if (!n) return '—';
  return '$' + n.toLocaleString('es-CL');
}
function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}
function calcPrecio(c: string, m: string) {
  const cv = parseFloat(c); const mv = parseFloat(m);
  return (!isNaN(cv) && !isNaN(mv)) ? Math.round(cv * (1 + mv / 100)) : 0;
}
function calcMargen(c: string, p: string) {
  const cv = parseFloat(c); const pv = parseFloat(p);
  return (!isNaN(cv) && cv > 0 && !isNaN(pv)) ? Math.round((pv / cv - 1) * 100 * 10) / 10 : 0;
}

export default function CotizacionClientePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [data, setData]         = useState<Data | null>(null);
  const [rows, setRows]         = useState<Row[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [sending, setSending]   = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  // estadoFinal: estado que viene de la BD (terminal), null si editable
  const [estadoFinal, setEstadoFinal] = useState<EstadoFinal | null>(null);
  // editando: true cuando el usuario presionó "Modificar" para volver al formulario
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    fetch(`/api/cotizacion-cliente/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        const estado = d.cot?.estado as string;
        if (ESTADOS_FINALES.includes(estado as EstadoFinal)) {
          setEstadoFinal(estado as EstadoFinal);
        }
        setRows((d.items ?? []).map((it: Item) => ({
          ...it,
          costoEdit:  (it.costo_cliente  ?? it.costo)  != null ? String(it.costo_cliente  ?? it.costo)  : '',
          margenEdit: (it.margen_cliente ?? it.margen) != null ? String(it.margen_cliente ?? it.margen) : '',
          precioEdit: (it.precio_cliente ?? it.precio) != null ? String(it.precio_cliente ?? it.precio) : '',
        })));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const update = useCallback((idx: number, field: 'costoEdit' | 'margenEdit' | 'precioEdit', val: string) => {
    setRows(prev => {
      const next = [...prev];
      const r = { ...next[idx], [field]: val };
      if (field === 'costoEdit' || field === 'margenEdit') {
        if (r.costoEdit && r.margenEdit) r.precioEdit = String(calcPrecio(r.costoEdit, r.margenEdit));
      }
      if (field === 'costoEdit' || field === 'precioEdit') {
        if (r.costoEdit && r.precioEdit) r.margenEdit = String(calcMargen(r.costoEdit, r.precioEdit));
      }
      next[idx] = r;
      return next;
    });
  }, []);

  const buildItems = () => rows.map(r => ({
    id: r.id,
    costo_cliente:  r.costoEdit  ? parseFloat(r.costoEdit)  : null,
    margen_cliente: r.margenEdit ? parseFloat(r.margenEdit) : null,
    precio_cliente: r.precioEdit ? parseFloat(r.precioEdit) : null,
  }));

  const aprobar = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/cotizacion-cliente/${token}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: buildItems(), aprobar: true }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error ?? 'Error al aprobar'); return; }
      setEstadoFinal('aprobada');
      setEditando(false);
    } finally {
      setSending(false);
    }
  };

  const confirmarRechazo = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/cotizacion-cliente/${token}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rechazar: true, comentario: comentarioRechazo }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error ?? 'Error al rechazar'); return; }
      setEstadoFinal('rechazada');
      setEditando(false);
      setRechazando(false);
    } finally {
      setSending(false);
    }
  };

  // locked = true cuando hay estado final Y el usuario no está editando
  const locked = estadoFinal !== null && !editando;
  const cfgFinal = estadoFinal ? ESTADO_INFO[estadoFinal] : null;

  const calcRows = rows.map(r => {
    const precioAuto = !!(r.costoEdit && r.margenEdit && !rows[rows.indexOf(r)]?.precioEdit);
    const p = r.precioEdit ? parseFloat(r.precioEdit) : (r.costoEdit && r.margenEdit ? calcPrecio(r.costoEdit, r.margenEdit) : 0);
    const c = r.costoEdit ? parseFloat(r.costoEdit) : 0;
    return { ...r, precioFinal: p, costoFinal: c, totalPrecio: p * r.cantidad, totalCosto: c * r.cantidad, precioAuto };
  });
  const subtotal     = calcRows.reduce((s, r) => s + r.totalPrecio, 0);
  const totalCosto   = calcRows.reduce((s, r) => s + r.totalCosto, 0);
  const iva          = Math.round(subtotal * 0.19);
  const total        = subtotal + iva;
  const margenGlobal = totalCosto > 0 ? Math.round((subtotal / totalCosto - 1) * 100) : null;
  const needsInput   = rows.some(r => !r.precioEdit);
  const llenados     = calcRows.filter(r => r.precioFinal > 0).length;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: MUTED }}>
      Cargando cotización…
    </div>
  );
  if (error && !data) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: RED }}>{error}</div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      color: TEXT, maxWidth: 640, margin: '0 auto', paddingBottom: 96 }}>

      {/* Sticky header */}
      <header style={{ background: `linear-gradient(135deg,${BLUE_D} 0%,${BLUE} 100%)`,
        color: WHITE, padding: '11px 14px', position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '0.95rem', flexShrink: 0 }}>M</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data?.compra.nombre}
          </p>
          <p style={{ margin: 0, fontSize: '0.66rem', opacity: 0.6 }}>
            {data?.usuario.empresa_nombre} · {data?.compra.codigo}
          </p>
        </div>
        <button onClick={() => router.push('/app/cliente/bandeja')}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: WHITE,
            borderRadius: 6, padding: '5px 10px', fontSize: '0.75rem', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600, flexShrink: 0 }}>
          Mi bandeja
        </button>
      </header>

      <div style={{ padding: '12px 14px' }}>

        {/* Banner de estado cuando está bloqueado */}
        {locked && cfgFinal && (
          <div style={{ background: WHITE, borderRadius: 12,
            border: `1.5px solid ${cfgFinal.color}22`,
            padding: '12px 14px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{cfgFinal.emoji}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: cfgFinal.color }}>
                {cfgFinal.label}
              </p>
              {data?.cot.respondida_at && (
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: MUTED }}>
                  {estadoFinal === 'rechazada' ? 'Rechazada el' : 'Confirmada el'} {fechaCorta(data.cot.respondida_at)}
                </p>
              )}
            </div>
            {cfgFinal.canModify && (
              <button onClick={() => setEditando(true)}
                style={{ flexShrink: 0, height: 34, borderRadius: 8,
                  border: `1.5px solid ${BORDER}`, background: WHITE,
                  color: TEXT, fontFamily: 'inherit', fontSize: '0.78rem',
                  fontWeight: 600, cursor: 'pointer', padding: '0 12px' }}>
                Modificar
              </button>
            )}
          </div>
        )}

        {/* Info card */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          padding: '11px 14px', marginBottom: 12,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px', fontSize: '0.82rem' }}>
          <InfoRow label="Cierre"    value={fechaCorta(data?.compra.fecha_cierre ?? null)} />
          <InfoRow label="Organismo" value={data?.compra.organismo_nombre ?? '—'} />
          {data?.compra.monto ? <InfoRow label="Presupuesto ref." value={pesos(data.compra.monto)} bold /> : null}
        </div>

        {/* Nota del asesor */}
        {data?.cot.notas && (
          <div style={{ background: '#FFFBEB', borderRadius: 12, border: `1.5px solid #FCD34D`,
            padding: '11px 14px', marginBottom: 12 }}>
            <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '0.75rem', color: '#92400E',
              textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nota del asesor</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: TEXT, lineHeight: 1.5 }}>
              {data.cot.notas}
            </p>
          </div>
        )}

        {/* Progress bar — solo cuando editable */}
        {!locked && rows.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: '0.72rem', color: MUTED, marginBottom: 4 }}>
              <span>{llenados} de {rows.length} productos con precio</span>
              <span>{Math.round(llenados / rows.length * 100)}%</span>
            </div>
            <div style={{ height: 4, background: BORDER, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99,
                background: llenados === rows.length ? GREEN : BLUE,
                width: `${Math.round(llenados / rows.length * 100)}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Error inline */}
        {error && (
          <div style={{ background: '#FEF2F2', border: `1px solid #FCA5A5`, borderRadius: 10,
            padding: '10px 12px', marginBottom: 12, color: RED, fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Product cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {calcRows.map((r, idx) => (
            <div key={r.id} style={{ background: WHITE, borderRadius: 12,
              border: `1px solid ${BORDER}`, overflow: 'hidden',
              opacity: locked ? 0.85 : 1 }}>
              <div style={{ padding: '11px 14px 8px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>
                    {r.nombre}
                  </p>
                  {r.descripcion && r.descripcion !== r.nombre && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: MUTED, lineHeight: 1.4 }}>
                      {r.descripcion}
                    </p>
                  )}
                  <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: MUTED }}>
                    {r.cantidad} {r.unidad_medida}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700,
                    color: r.totalPrecio > 0 ? TEXT : MUTED }}>
                    {r.totalPrecio > 0 ? pesos(r.totalPrecio) : '—'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: MUTED }}>total</p>
                </div>
              </div>
              <div style={{ padding: '0 14px 11px',
                display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 7, alignItems: 'center' }}>
                <div>
                  <label style={labelSt}>Costo unit.</label>
                  <input type="number" min={0} placeholder="$"
                    value={rows[idx].costoEdit}
                    readOnly={locked}
                    onChange={e => !locked && update(idx, 'costoEdit', e.target.value)}
                    style={inpSt(!!rows[idx].costoEdit, locked)} />
                </div>
                <div>
                  <label style={labelSt}>Margen</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input type="number" min={0} max={999} placeholder="0"
                      value={rows[idx].margenEdit}
                      readOnly={locked}
                      onChange={e => !locked && update(idx, 'margenEdit', e.target.value)}
                      style={{ ...inpSt(!!rows[idx].margenEdit, locked), textAlign: 'center' }} />
                    <span style={{ fontSize: '0.75rem', color: MUTED, flexShrink: 0 }}>%</span>
                  </div>
                </div>
                <div>
                  <label style={labelSt}>
                    Precio neto {!locked && r.precioAuto && <span style={{ color: BLUE }}>·auto</span>}
                  </label>
                  <input type="number" min={0} placeholder="$"
                    value={r.precioAuto ? String(r.precioFinal) : rows[idx].precioEdit}
                    readOnly={locked || r.precioAuto}
                    onChange={e => { if (!locked && !r.precioAuto) update(idx, 'precioEdit', e.target.value); }}
                    style={{ ...inpSt(!!(rows[idx].precioEdit || r.precioAuto), locked),
                      color: (!locked && r.precioAuto) ? BLUE : TEXT,
                      cursor: (locked || r.precioAuto) ? 'default' : 'text' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        {rows.length > 0 && (
          <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
            padding: '12px 14px', marginBottom: 12 }}>
            {totalCosto > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between',
                paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: '0.78rem', color: MUTED }}>Costo total</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{pesos(totalCosto)}</span>
                {margenGlobal != null && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 700,
                    color: margenGlobal >= 20 ? GREEN : margenGlobal >= 10 ? '#D97706' : RED }}>
                    Margen {margenGlobal}%
                  </span>
                )}
              </div>
            )}
            {[
              { label: 'Subtotal neto', val: pesos(subtotal), bold: false },
              { label: 'IVA 19%',       val: pesos(iva),      bold: false },
              { label: 'TOTAL',         val: pesos(total),    bold: true  },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '3px 0', fontSize: row.bold ? '1rem' : '0.84rem',
                fontWeight: row.bold ? 800 : 400, color: row.bold ? BLUE : TEXT }}>
                <span style={{ color: row.bold ? BLUE : MUTED }}>{row.label}</span>
                <span>{row.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Rechazo textarea — solo cuando editando */}
        {!locked && rechazando && (
          <div style={{ background: '#FEF2F2', border: `1.5px solid #FCA5A5`, borderRadius: 12,
            padding: '12px 14px', marginBottom: 14 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, color: RED, fontSize: '0.85rem' }}>
              Motivo del rechazo (opcional)
            </p>
            <textarea value={comentarioRechazo} onChange={e => setComentarioRechazo(e.target.value)}
              placeholder="¿Por qué rechazas esta cotización?"
              rows={3} style={{ width: '100%', boxSizing: 'border-box', borderRadius: 8,
                border: `1.5px solid #FCA5A5`, padding: '8px 10px', fontSize: '0.86rem',
                fontFamily: 'inherit', color: TEXT, resize: 'vertical', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={confirmarRechazo} disabled={sending}
                style={{ flex: 1, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: RED, color: WHITE, fontFamily: 'inherit',
                  fontSize: '0.88rem', fontWeight: 700 }}>
                {sending ? 'Enviando…' : 'Confirmar rechazo'}
              </button>
              <button onClick={() => setRechazando(false)}
                style={{ height: 40, borderRadius: 8, border: `1.5px solid ${BORDER}`, cursor: 'pointer',
                  background: WHITE, color: TEXT, fontFamily: 'inherit',
                  fontSize: '0.88rem', fontWeight: 600, padding: '0 16px' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
        background: WHITE, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '10px 14px' }}>
          {locked ? (
            /* Barra de estado — formulario bloqueado */
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2rem' }}>{cfgFinal?.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: cfgFinal?.color }}>
                  {cfgFinal?.label}
                </p>
                {cfgFinal?.canModify && (
                  <p style={{ margin: 0, fontSize: '0.7rem', color: MUTED }}>
                    Puedes modificar tu respuesta
                  </p>
                )}
              </div>
              {cfgFinal?.canModify && (
                <button onClick={() => setEditando(true)}
                  style={{ height: 40, borderRadius: 10, border: `1.5px solid ${BORDER}`,
                    background: BG, color: TEXT, fontFamily: 'inherit',
                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '0 14px' }}>
                  Modificar →
                </button>
              )}
            </div>
          ) : rechazando ? null : (
            /* Barra de acción — formulario editable */
            <div style={{ display: 'flex', gap: 8 }}>
              {editando && (
                <button onClick={() => { setEditando(false); setRechazando(false); }}
                  style={{ height: 46, borderRadius: 11, border: `1.5px solid ${BORDER}`,
                    background: BG, color: MUTED, fontFamily: 'inherit',
                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '0 14px' }}>
                  Cancelar
                </button>
              )}
              <button onClick={() => setRechazando(true)}
                style={{ height: 46, borderRadius: 11, border: `1.5px solid ${BORDER}`,
                  background: BG, color: RED, fontFamily: 'inherit',
                  fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', padding: '0 18px' }}>
                Rechazar
              </button>
              <button onClick={aprobar} disabled={sending || needsInput}
                style={{ flex: 1, height: 46, borderRadius: 11, border: 'none',
                  cursor: needsInput ? 'default' : 'pointer',
                  background: needsInput ? '#E5E7EB' : GREEN,
                  color: needsInput ? MUTED : WHITE,
                  fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 700 }}>
                {sending ? 'Enviando…' : needsInput ? 'Completa los precios' : 'Confirmar cotización ✓'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: 'block', marginBottom: 3,
  fontSize: '0.64rem', fontWeight: 700, color: MUTED,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};
const inpSt = (filled: boolean, locked: boolean): React.CSSProperties => ({
  height: 36, width: '100%', boxSizing: 'border-box' as const,
  borderRadius: 8,
  border: `1.5px solid ${locked ? BORDER : filled ? '#003DA5' : BORDER}`,
  padding: '0 9px', fontSize: '0.85rem', fontFamily: 'inherit',
  textAlign: 'right' as const,
  color: locked ? MUTED : '#111827',
  background: locked ? '#F3F4F6' : filled ? '#EFF6FF' : '#FAFAFA',
  outline: 'none',
  cursor: locked ? 'default' : 'text',
});
function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ color: MUTED, fontSize: '0.78rem', minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#111827', fontSize: '0.82rem', fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
