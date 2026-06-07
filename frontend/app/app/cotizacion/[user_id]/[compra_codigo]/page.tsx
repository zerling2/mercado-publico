'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CompraInfo {
  id: string;
  codigo: string;
  nombre: string;
  organismo: string;
  monto_referencial: number | null;
  region: string | null;
  fecha_cierre: string | null;
  lugar_entrega: string | null;
  plazo_entrega_dias: number | null;
}

interface ItemCotizacion {
  id: string;
  nombre: string;
  descripcion: string | null;
  cantidad: number;
  unidad_medida: string;
  precio_unitario: number | null;
}

const BLUE      = '#003DA5';
const BLUE_DARK = '#00297A';
const GREEN     = '#059669';
const RED       = '#DC2626';
const TEXT      = '#111827';
const MUTED     = '#6B7280';
const BORDER    = '#E5E7EB';
const BG        = '#F9FAFB';
const WHITE     = '#FFFFFF';

function pesos(n: number) {
  if (!n) return '—';
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CotizacionPage({ params }: { params: { user_id: string; compra_codigo: string } }) {
  const { user_id, compra_codigo } = params;

  const [compra, setCompra]   = useState<CompraInfo | null>(null);
  const [items, setItems]     = useState<ItemCotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState('Cargando licitación…');
  const [error, setError]     = useState('');

  const [precios, setPrecios]       = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState('');
  const [savingMsg, setSavingMsg]   = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    setLoadMsg('Descargando productos del portal…');
    fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setCompra(d.compra);
        setItems(d.items ?? []);
        setComentario(d.relevancia?.comentario ?? '');
        const init: Record<string, string> = {};
        (d.items ?? []).forEach((it: ItemCotizacion) => {
          init[it.id] = it.precio_unitario != null ? String(it.precio_unitario) : '';
        });
        setPrecios(init);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [user_id, compra_codigo]);

  const rows = items.map(it => {
    const pu = Number(precios[it.id] ?? '') || 0;
    return { ...it, precio_unit: pu, total: pu * it.cantidad };
  });
  const subtotal = rows.reduce((s, r) => s + r.total, 0);
  const iva      = Math.round(subtotal * 0.19);
  const total    = subtotal + iva;

  const guardarComentario = async () => {
    setSaving(true); setSavingMsg('');
    const res = await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comentario }),
    });
    const json = await res.json();
    setSaving(false);
    setSavingMsg(json.ok ? 'Guardado ✓' : 'Error al guardar');
  };

  const descargarPDF = async () => {
    await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cotizacion_descargada: true }),
    });
    window.location.href = `/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}/pdf`;
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      fontFamily: '-apple-system, sans-serif', color: MUTED }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%',
        border: `3px solid ${BORDER}`, borderTopColor: BLUE,
        animation: 'spin 0.8s linear infinite' }} />
      <p style={{ margin: 0, fontSize: '0.85rem' }}>{loadMsg}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !compra) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: RED,
      flexDirection: 'column', gap: 12 }}>
      <p>{error || 'Compra no encontrada'}</p>
      <Link href={`/app/dashboard/${user_id}`} style={{ color: BLUE }}>← Volver</Link>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      color: TEXT, maxWidth: 800, margin: '0 auto', paddingBottom: 60,
    }}>
      {/* Header */}
      <header style={{
        background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`,
        color: WHITE, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href={`/app/dashboard/${user_id}`}
          style={{ color: WHITE, textDecoration: 'none', fontSize: '1rem',
            padding: '5px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.15)' }}>
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {compra.nombre}
          </h1>
          <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.65 }}>
            {compra.organismo} · {compra.codigo}
          </p>
        </div>
        <button onClick={descargarPDF} style={{
          height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: WHITE, color: BLUE, fontFamily: 'inherit',
          fontSize: '0.8rem', fontWeight: 700, padding: '0 14px', whiteSpace: 'nowrap',
        }}>
          PDF ↓
        </button>
      </header>

      <div style={{ padding: '14px 16px' }}>

        {/* Compra info */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          padding: '12px 14px', marginBottom: 14,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
          <InfoRow label="Código"  value={compra.codigo} />
          <InfoRow label="Cierre"  value={fechaCorta(compra.fecha_cierre)} />
          {compra.region         && <InfoRow label="Región"     value={compra.region} />}
          {compra.lugar_entrega  && <InfoRow label="Entrega"    value={compra.lugar_entrega} />}
          {compra.plazo_entrega_dias
            ? <InfoRow label="Plazo" value={`${compra.plazo_entrega_dias} días`} />
            : null}
          {compra.monto_referencial
            ? <InfoRow label="Presupuesto ref." value={pesos(compra.monto_referencial)} bold />
            : null}
        </div>

        {/* Products table */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          marginBottom: 14, overflow: 'hidden' }}>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 100px',
            gap: 8, padding: '9px 14px',
            fontSize: '0.68rem', fontWeight: 700, color: MUTED,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            borderBottom: `1px solid ${BORDER}`, background: BG }}>
            <span>Producto solicitado</span>
            <span style={{ textAlign: 'center' }}>Cant.</span>
            <span style={{ textAlign: 'right' }}>Precio neto unit.</span>
            <span style={{ textAlign: 'right' }}>Total neto</span>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center' }}>
              <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>
                Esta licitación no tiene productos en su oferta técnica.
              </p>
            </div>
          ) : rows.map((it, idx) => (
            <div key={it.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 120px 100px',
              gap: 8, padding: '11px 14px', alignItems: 'center',
              borderBottom: idx < rows.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              {/* Product name */}
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: TEXT, lineHeight: 1.3 }}>
                  {it.nombre}
                </p>
                {it.descripcion && it.descripcion !== it.nombre && (
                  <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: MUTED, lineHeight: 1.3 }}>
                    {it.descripcion}
                  </p>
                )}
              </div>
              {/* Quantity */}
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: TEXT }}>
                {it.cantidad} <span style={{ color: MUTED, fontSize: '0.75rem' }}>{it.unidad_medida}</span>
              </div>
              {/* Price input */}
              <input
                type="number"
                min={0}
                value={precios[it.id] ?? ''}
                onChange={e => setPrecios(p => ({ ...p, [it.id]: e.target.value }))}
                placeholder="0"
                style={{
                  height: 36, borderRadius: 8,
                  border: precios[it.id] ? `1.5px solid ${BLUE}` : `1.5px solid ${BORDER}`,
                  padding: '0 10px', fontSize: '0.88rem', fontFamily: 'inherit',
                  textAlign: 'right', color: TEXT,
                  boxSizing: 'border-box', width: '100%',
                  outline: 'none', background: precios[it.id] ? '#EFF6FF' : WHITE,
                }}
              />
              {/* Row total */}
              <div style={{ textAlign: 'right', fontSize: '0.88rem',
                fontWeight: it.total > 0 ? 600 : 400,
                color: it.total > 0 ? TEXT : MUTED }}>
                {it.total > 0 ? pesos(it.total) : '—'}
              </div>
            </div>
          ))}

          {/* Totals footer */}
          {items.length > 0 && (
            <div style={{ borderTop: `2px solid ${BORDER}`, padding: '12px 14px', background: BG }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ minWidth: 260 }}>
                  {[
                    { label: 'Subtotal neto', value: pesos(subtotal), bold: false },
                    { label: 'IVA 19%',       value: pesos(iva),      bold: false },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between',
                      padding: '3px 0', fontSize: '0.85rem', color: TEXT }}>
                      <span style={{ color: MUTED }}>{r.label}</span>
                      <span>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0 0', marginTop: 4,
                    borderTop: `1px solid ${BORDER}`,
                    fontSize: '1.05rem', fontWeight: 800, color: BLUE }}>
                    <span>TOTAL</span>
                    <span>{pesos(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Comment */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          padding: '14px', marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8,
            fontSize: '0.72rem', fontWeight: 700, color: MUTED,
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Comentario interno
          </label>
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Notas de revisión, condiciones especiales, preguntas pendientes…"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', borderRadius: 8,
              border: `1.5px solid ${BORDER}`, padding: '10px 12px',
              fontSize: '0.87rem', fontFamily: 'inherit', color: TEXT,
              resize: 'vertical', lineHeight: 1.5, outline: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: '0.78rem',
              color: savingMsg.includes('Error') ? RED : GREEN,
              visibility: savingMsg ? 'visible' : 'hidden' }}>
              {savingMsg || '.'}
            </span>
            <button onClick={guardarComentario} disabled={saving} style={{
              height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: BLUE, color: WHITE, fontFamily: 'inherit',
              fontSize: '0.82rem', fontWeight: 600, padding: '0 16px',
            }}>
              {saving ? 'Guardando…' : 'Guardar comentario'}
            </button>
          </div>
        </div>

        {/* Bottom actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={descargarPDF} style={{
            flex: 1, height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: BLUE, color: WHITE, fontFamily: 'inherit',
            fontSize: '0.95rem', fontWeight: 700,
          }}>
            Descargar PDF
          </button>
          <a href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(compra.codigo)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ height: 48, borderRadius: 12, border: `1.5px solid ${BLUE}`,
              background: WHITE, color: BLUE, fontFamily: 'inherit',
              fontSize: '0.9rem', fontWeight: 600, padding: '0 20px',
              display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            Ver en portal ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ color: MUTED, fontSize: '0.78rem', minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#111827', fontSize: '0.82rem', fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
