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
  requiere_cliente: boolean;
  costo_cliente: number | null;
  margen_cliente: number | null;
  precio_cliente: number | null;
}
interface Data {
  cot: {
    estado: string;
    notas: string | null;
    enviada_at: string;
    respondida_at: string | null;
    respuesta_cliente: string | null;
    comentario_rechazo: string | null;
  };
  compra: { codigo: string; nombre: string; organismo_nombre: string | null; fecha_cierre: string | null; monto: number | null };
  usuario: { empresa_nombre: string; rut: string };
  items: Item[];
}

const BLUE = '#003DA5'; const BLUE_D = '#00297A';
const GREEN = '#059669'; const AMBER = '#D97706'; const RED = '#DC2626';
const TEXT = '#111827'; const MUTED = '#6B7280';
const BORDER = '#E5E7EB'; const BG = '#F9FAFB'; const WHITE = '#FFFFFF';

function pesos(n: number) {
  if (!n) return '—';
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}
function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CotizacionClientePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [data, setData]     = useState<Data | null>(null);
  const [rows, setRows]     = useState<Array<Item & { costoEdit: string; margenEdit: string; precioEdit: string }>>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [sending, setSending]   = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [done, setDone]         = useState<'aprobada' | 'rechazada' | null>(null);

  useEffect(() => {
    fetch(`/api/cotizacion-cliente/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setData(d);

        const estado = d.cot?.estado;
        if (estado === 'aprobada') { setDone('aprobada'); setLoading(false); return; }
        if (estado === 'rechazada') { setDone('rechazada'); setLoading(false); return; }

        setRows((d.items ?? []).map((it: Item) => {
          const editable = it.requiere_cliente;
          return {
            ...it,
            // Use _cliente values if they exist, otherwise fall back to asesor values
            costoEdit:  (editable ? it.costo_cliente : it.costo)  != null ? String(editable ? it.costo_cliente : it.costo)  : '',
            margenEdit: (editable ? it.margen_cliente : it.margen) != null ? String(editable ? it.margen_cliente : it.margen) : '',
            precioEdit: (editable ? it.precio_cliente : it.precio) != null ? String(editable ? it.precio_cliente : it.precio) : '',
          };
        }));
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [token]);

  const update = useCallback((idx: number, field: 'costoEdit' | 'margenEdit' | 'precioEdit', val: string) => {
    setRows(prev => {
      const next = [...prev];
      const r = { ...next[idx], [field]: val };
      if ((field === 'costoEdit' || field === 'margenEdit') && r.costoEdit && r.margenEdit) {
        const c = parseFloat(r.costoEdit); const m = parseFloat(r.margenEdit);
        if (!isNaN(c) && !isNaN(m)) r.precioEdit = String(Math.round(c * (1 + m / 100)));
      }
      if ((field === 'costoEdit' || field === 'precioEdit') && r.costoEdit && r.precioEdit) {
        const c = parseFloat(r.costoEdit); const p = parseFloat(r.precioEdit);
        if (!isNaN(c) && c > 0 && !isNaN(p)) r.margenEdit = String(Math.round((p / c - 1) * 100 * 10) / 10);
      }
      next[idx] = r;
      return next;
    });
  }, []);

  const buildItems = () =>
    rows
      .filter(r => r.requiere_cliente)
      .map(r => ({
        id:             r.id,
        costo_cliente:  r.costoEdit  ? parseFloat(r.costoEdit)  : null,
        margen_cliente: r.margenEdit ? parseFloat(r.margenEdit) : null,
        precio_cliente: r.precioEdit ? parseFloat(r.precioEdit) : null,
      }));

  const aprobar = async () => {
    setSending(true);
    await fetch(`/api/cotizacion-cliente/${token}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: buildItems(), aprobar: true }),
    });
    setSending(false);
    setDone('aprobada');
  };

  const confirmarRechazo = async () => {
    setSending(true);
    await fetch(`/api/cotizacion-cliente/${token}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rechazar: true, comentario: comentarioRechazo }),
    });
    setSending(false);
    setDone('rechazada');
  };

  const calcRows = rows.map(r => {
    const p = r.precioEdit ? parseFloat(r.precioEdit) : (r.precio ?? 0);
    return { ...r, precioFinal: p, total: p * r.cantidad };
  });
  const subtotal = calcRows.reduce((s, r) => s + r.total, 0);
  const iva = Math.round(subtotal * 0.19);
  const needsInput = rows.some(r => r.requiere_cliente && !r.precioEdit);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: MUTED }}>
      Cargando cotización…
    </div>
  );
  if (error) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: RED }}>
      {error}
    </div>
  );

  if (done === 'aprobada') return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      fontFamily: '-apple-system, sans-serif', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>✅</div>
      <h2 style={{ color: TEXT, fontWeight: 800, margin: 0 }}>¡Cotización aprobada!</h2>
      <p style={{ color: MUTED, margin: 0 }}>El asesor recibirá tu confirmación.</p>
      <button onClick={() => router.push('/app/cliente/bandeja')}
        style={{ marginTop: 8, height: 44, borderRadius: 10, border: 'none',
          background: BLUE, color: WHITE, padding: '0 24px',
          fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
        Ver mis cotizaciones →
      </button>
    </div>
  );

  if (done === 'rechazada') return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      fontFamily: '-apple-system, sans-serif', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>❌</div>
      <h2 style={{ color: TEXT, fontWeight: 800, margin: 0 }}>Cotización rechazada</h2>
      <p style={{ color: MUTED, margin: 0 }}>El asesor quedó notificado.</p>
      <button onClick={() => router.push('/app/cliente/bandeja')}
        style={{ marginTop: 8, height: 44, borderRadius: 10, border: 'none',
          background: BLUE, color: WHITE, padding: '0 24px',
          fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
        Ver mis cotizaciones →
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      color: TEXT, maxWidth: 800, margin: '0 auto', paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ background: `linear-gradient(135deg,${BLUE_D} 0%,${BLUE} 100%)`,
        color: WHITE, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '0.9rem' }}>M</div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', opacity: 0.9 }}>Mercado Público</span>
          </div>
          <button onClick={() => router.push('/app/cliente/bandeja')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: WHITE,
              borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer',
              fontFamily: 'inherit' }}>
            Mi bandeja
          </button>
        </div>
        <h1 style={{ margin: '4px 0 2px', fontSize: '1rem', fontWeight: 700,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data?.compra.nombre}
        </h1>
        <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>
          Cotización para {data?.usuario.empresa_nombre} · {data?.compra.codigo}
        </p>
      </header>

      <div style={{ padding: '14px 16px' }}>
        {/* Info */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          padding: '12px 14px', marginBottom: 14,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px', fontSize: '0.82rem' }}>
          <InfoRow label="Cierre"    value={fechaCorta(data?.compra.fecha_cierre ?? null)} />
          <InfoRow label="Organismo" value={data?.compra.organismo_nombre ?? '—'} />
          {data?.compra.monto ? <InfoRow label="Presupuesto ref." value={pesos(data.compra.monto)} bold /> : null}
        </div>

        {/* Note from advisor */}
        {data?.cot.notas && (
          <div style={{ background: '#FFFBEB', borderRadius: 12, border: `1.5px solid #FCD34D`,
            padding: '12px 14px', marginBottom: 14 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.8rem', color: AMBER }}>
              Nota del asesor
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: TEXT, lineHeight: 1.5 }}>
              {data.cot.notas}
            </p>
          </div>
        )}

        {/* Calculator table */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 65px 100px 75px 100px 85px',
            gap: 6, padding: '9px 14px', fontSize: '0.65rem', fontWeight: 700,
            color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em',
            borderBottom: `1px solid ${BORDER}`, background: BG }}>
            <span>Producto</span>
            <span style={{ textAlign: 'center' }}>Cant.</span>
            <span style={{ textAlign: 'right' }}>Costo unit.</span>
            <span style={{ textAlign: 'right' }}>Margen %</span>
            <span style={{ textAlign: 'right' }}>Precio neto</span>
            <span style={{ textAlign: 'right' }}>Total</span>
          </div>

          {calcRows.map((r, idx) => {
            const editable = r.requiere_cliente;
            const falta = editable && !r.precioEdit;
            return (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 65px 100px 75px 100px 85px',
                gap: 6, padding: '9px 14px', alignItems: 'center',
                borderBottom: idx < rows.length - 1 ? `1px solid ${BORDER}` : 'none',
                background: falta ? '#FFFBEB' : WHITE,
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, lineHeight: 1.3 }}>
                    {r.nombre}
                    {editable && (
                      <span style={{ marginLeft: 6, fontSize: '0.62rem', fontWeight: 700,
                        color: AMBER, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        completar
                      </span>
                    )}
                  </p>
                  {r.descripcion && r.descripcion !== r.nombre && (
                    <p style={{ margin: '1px 0 0', fontSize: '0.7rem', color: MUTED }}>{r.descripcion}</p>
                  )}
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.83rem' }}>
                  {r.cantidad} <span style={{ color: MUTED, fontSize: '0.71rem' }}>{r.unidad_medida}</span>
                </div>
                {editable ? (
                  <input type="number" min={0} placeholder="$ costo"
                    value={r.costoEdit}
                    onChange={e => update(idx, 'costoEdit', e.target.value)}
                    style={inputSt(!!r.costoEdit)} />
                ) : (
                  <div style={{ textAlign: 'right', fontSize: '0.83rem', color: MUTED }}>
                    {r.costo ? pesos(r.costo) : '—'}
                  </div>
                )}
                {editable ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input type="number" min={0} max={999} placeholder="0"
                      value={r.margenEdit}
                      onChange={e => update(idx, 'margenEdit', e.target.value)}
                      style={{ ...inputSt(!!r.margenEdit), width: '65%' }} />
                    <span style={{ fontSize: '0.75rem', color: MUTED }}>%</span>
                  </div>
                ) : (
                  <div style={{ textAlign: 'right', fontSize: '0.83rem', color: MUTED }}>
                    {r.margen ? `${r.margen}%` : '—'}
                  </div>
                )}
                {editable ? (
                  <input type="number" min={0} placeholder="$ precio"
                    value={r.precioEdit}
                    onChange={e => update(idx, 'precioEdit', e.target.value)}
                    style={inputSt(!!r.precioEdit)} />
                ) : (
                  <div style={{ textAlign: 'right', fontSize: '0.83rem',
                    fontWeight: r.precioFinal ? 600 : 400,
                    color: r.precioFinal ? TEXT : MUTED }}>
                    {r.precioFinal ? pesos(r.precioFinal) : '—'}
                  </div>
                )}
                <div style={{ textAlign: 'right', fontSize: '0.83rem',
                  fontWeight: r.total > 0 ? 600 : 400, color: r.total > 0 ? TEXT : MUTED }}>
                  {r.total > 0 ? pesos(r.total) : '—'}
                </div>
              </div>
            );
          })}

          <div style={{ borderTop: `2px solid ${BORDER}`, padding: '12px 14px', background: BG,
            display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ minWidth: 200 }}>
              {[
                { label: 'Subtotal neto', value: pesos(subtotal) },
                { label: 'IVA 19%',       value: pesos(iva) },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '2px 0', fontSize: '0.83rem' }}>
                  <span style={{ color: MUTED }}>{r.label}</span><span>{r.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between',
                padding: '5px 0 0', marginTop: 4, borderTop: `1px solid ${BORDER}`,
                fontSize: '1rem', fontWeight: 800, color: BLUE }}>
                <span>TOTAL</span><span>{pesos(subtotal + iva)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rejection comment (inline) */}
        {rechazando && (
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
      {!rechazando && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: WHITE, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: 800, margin: '0 auto',
            padding: '10px 16px', display: 'flex', gap: 8 }}>
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
              {sending ? 'Enviando…'
                : needsInput ? 'Completa los precios marcados'
                : 'Aprobar cotización ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputSt = (highlight?: boolean): React.CSSProperties => ({
  height: 34, width: '100%', boxSizing: 'border-box' as const,
  borderRadius: 7, border: `1.5px solid ${highlight ? BLUE : BORDER}`,
  padding: '0 8px', fontSize: '0.82rem', fontFamily: 'inherit',
  textAlign: 'right' as const, color: TEXT,
  background: highlight ? '#EFF6FF' : WHITE, outline: 'none',
});

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ color: MUTED, fontSize: '0.78rem', minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#111827', fontSize: '0.82rem', fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
