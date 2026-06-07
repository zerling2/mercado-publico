'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface CompraInfo {
  id: string; codigo: string; nombre: string; organismo: string;
  monto_referencial: number | null; region: string | null;
  fecha_cierre: string | null; lugar_entrega: string | null;
  plazo_entrega_dias: number | null;
}
interface ItemBase {
  id: string; nombre: string; descripcion: string | null;
  cantidad: number; unidad_medida: string; precio_unitario: number | null;
}

// Calculator row: extends ItemBase with costo/margen/precio editable fields
interface CalcRow extends ItemBase {
  costo: string;
  margen: string;
  precio: string;
  requiere_cliente: boolean;
  saved_id?: string; // cotizacion_items row id if already saved
}

const BLUE = '#003DA5'; const BLUE_D = '#00297A';
const GREEN = '#059669'; const RED = '#DC2626'; const AMBER = '#D97706';
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

function calcPrecio(costo: string, margen: string): number {
  const c = parseFloat(costo); const m = parseFloat(margen);
  if (!isNaN(c) && !isNaN(m)) return Math.round(c * (1 + m / 100));
  return 0;
}
function calcMargen(costo: string, precio: string): number {
  const c = parseFloat(costo); const p = parseFloat(precio);
  if (!isNaN(c) && c > 0 && !isNaN(p)) return Math.round((p / c - 1) * 100 * 10) / 10;
  return 0;
}

export default function CotizacionPage({ params }: { params: { user_id: string; compra_codigo: string } }) {
  const { user_id, compra_codigo } = params;

  const [compra, setCompra] = useState<CompraInfo | null>(null);
  const [rows, setRows]     = useState<CalcRow[]>([]);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading]   = useState(true);
  const [loadMsg, setLoadMsg]   = useState('Descargando productos del portal…');
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [sendToken, setSendToken] = useState('');
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    async function load() {
      setLoadMsg('Descargando productos del portal…');
      const [base, saved] = await Promise.all([
        fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`).then(r => r.json()),
        fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}/items`).then(r => r.json()),
      ]);
      if (base.error) { setError(base.error); setLoading(false); return; }

      setCompra(base.compra);
      setComentario(base.relevancia?.comentario ?? '');

      const savedMap = new Map((Array.isArray(saved) ? saved : []).map((s: { compra_producto_id: string; id: string; costo: number | null; margen: number | null; precio: number | null; requiere_cliente: boolean }) => [s.compra_producto_id, s]));

      setRows((base.items ?? []).map((it: ItemBase) => {
        const sv = savedMap.get(it.id);
        return {
          ...it,
          costo:            sv?.costo  != null ? String(sv.costo)  : '',
          margen:           sv?.margen != null ? String(sv.margen) : '',
          precio:           sv?.precio != null ? String(sv.precio) :
                            it.precio_unitario != null ? String(it.precio_unitario) : '',
          requiere_cliente: sv?.requiere_cliente ?? false,
          saved_id:         sv?.id,
        };
      }));
      setLoading(false);
    }
    load();
  }, [user_id, compra_codigo]);

  const updateRow = useCallback((idx: number, field: keyof CalcRow, value: string | boolean) => {
    setRows(prev => {
      const next = [...prev];
      const r = { ...next[idx], [field]: value };

      // Auto-calculate:
      if (field === 'costo' || field === 'margen') {
        if (r.costo && r.margen) r.precio = String(calcPrecio(r.costo, r.margen));
      }
      if (field === 'costo' || field === 'precio') {
        if (r.costo && r.precio && field !== 'margen') {
          r.margen = String(calcMargen(r.costo, r.precio));
        }
      }
      next[idx] = r;
      return next;
    });
  }, []);

  const guardar = useCallback(async () => {
    setSaving(true); setSavedMsg('');
    const items = rows.map(r => ({
      compra_producto_id: r.id,
      nombre: r.nombre, cantidad: r.cantidad, unidad_medida: r.unidad_medida,
      costo:  r.costo  ? parseFloat(r.costo)  : null,
      margen: r.margen ? parseFloat(r.margen) : null,
      precio: r.precio ? parseFloat(r.precio) : null,
      requiere_cliente: r.requiere_cliente,
    }));
    const [itemsRes, cotRes] = await Promise.all([
      fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }).then(r => r.json()),
      fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentario }),
      }).then(r => r.json()),
    ]);
    setSaving(false);
    if (itemsRes.error || cotRes.error) { setSavedMsg('Error al guardar'); return; }
    setSavedMsg('Guardado ✓');
  }, [rows, comentario, user_id, compra_codigo]);

  const enviarCliente = async () => {
    await guardar();
    const res = await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}/enviar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas: comentario }),
    }).then(r => r.json());
    if (res.token) setSendToken(res.token);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/app/cotizacion-cliente/${sendToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const descargarPDF = async () => {
    await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cotizacion_descargada: true }),
    });
    window.location.href = `/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}/pdf`;
  };

  // Totals
  const calcRows = rows.map(r => {
    const p = r.precio ? parseFloat(r.precio) : (r.costo && r.margen ? calcPrecio(r.costo, r.margen) : 0);
    const c = r.costo ? parseFloat(r.costo) : 0;
    return { ...r, precioFinal: p, costoFinal: c, totalPrecio: p * r.cantidad, totalCosto: c * r.cantidad };
  });
  const subtotal = calcRows.reduce((s, r) => s + r.totalPrecio, 0);
  const iva      = Math.round(subtotal * 0.19);
  const total    = subtotal + iva;
  const totalCosto = calcRows.reduce((s, r) => s + r.totalCosto, 0);
  const margenGlobal = totalCosto > 0 ? Math.round((subtotal / totalCosto - 1) * 100) : null;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      fontFamily: '-apple-system, sans-serif', color: MUTED }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%',
        border: `3px solid ${BORDER}`, borderTopColor: BLUE,
        animation: 'spin 0.8s linear infinite' }} />
      <p style={{ margin: 0, fontSize: '0.85rem' }}>{loadMsg}</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !compra) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: RED,
      flexDirection: 'column', gap: 12 }}>
      <p>{error || 'No encontrada'}</p>
      <Link href={`/app/dashboard/${user_id}`} style={{ color: BLUE }}>← Volver</Link>
    </div>
  );

  const inputSt = (highlight?: boolean): React.CSSProperties => ({
    height: 34, width: '100%', boxSizing: 'border-box' as const,
    borderRadius: 7, border: `1.5px solid ${highlight ? BLUE : BORDER}`,
    padding: '0 8px', fontSize: '0.82rem', fontFamily: 'inherit',
    textAlign: 'right' as const, color: TEXT,
    background: highlight ? '#EFF6FF' : WHITE, outline: 'none',
  });

  return (
    <div style={{ minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      color: TEXT, maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>

      {/* Header */}
      <header style={{ background: `linear-gradient(135deg,${BLUE_D} 0%,${BLUE} 100%)`,
        color: WHITE, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10,
        position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href={`/app/dashboard/${user_id}`}
          style={{ color: WHITE, textDecoration: 'none', padding: '5px 10px',
            borderRadius: 6, background: 'rgba(255,255,255,0.15)', fontSize: '0.95rem' }}>
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {compra.nombre}
          </h1>
          <p style={{ margin: 0, fontSize: '0.68rem', opacity: 0.6 }}>
            {compra.organismo} · {compra.codigo}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={guardar} disabled={saving} style={{
            height: 32, borderRadius: 7, border: `1.5px solid rgba(255,255,255,0.4)`,
            background: 'transparent', color: WHITE, fontFamily: 'inherit',
            fontSize: '0.78rem', fontWeight: 600, padding: '0 12px', cursor: 'pointer' }}>
            {saving ? '…' : savedMsg || 'Guardar'}
          </button>
          <button onClick={descargarPDF} style={{
            height: 32, borderRadius: 7, border: 'none',
            background: WHITE, color: BLUE, fontFamily: 'inherit',
            fontSize: '0.78rem', fontWeight: 700, padding: '0 12px', cursor: 'pointer' }}>
            PDF ↓
          </button>
        </div>
      </header>

      <div style={{ padding: '14px 16px' }}>

        {/* Info card */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          padding: '12px 14px', marginBottom: 14,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px', fontSize: '0.82rem' }}>
          <InfoRow label="Código"  value={compra.codigo} />
          <InfoRow label="Cierre"  value={fechaCorta(compra.fecha_cierre)} />
          {compra.region        && <InfoRow label="Región"  value={compra.region} />}
          {compra.lugar_entrega && <InfoRow label="Entrega" value={compra.lugar_entrega} />}
          {compra.monto_referencial
            ? <InfoRow label="Presupuesto ref." value={pesos(compra.monto_referencial)} bold />
            : null}
        </div>

        {/* Calculator table */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          marginBottom: 14, overflow: 'hidden' }}>

          {/* Column headers */}
          <div style={{ display: 'grid',
            gridTemplateColumns: '2fr 70px 105px 80px 105px 90px 32px',
            gap: 6, padding: '9px 14px',
            fontSize: '0.65rem', fontWeight: 700, color: MUTED,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            borderBottom: `1px solid ${BORDER}`, background: BG }}>
            <span>Producto solicitado</span>
            <span style={{ textAlign: 'center' }}>Cant.</span>
            <span style={{ textAlign: 'right' }}>Costo unit.</span>
            <span style={{ textAlign: 'right' }}>Margen %</span>
            <span style={{ textAlign: 'right' }}>Precio neto</span>
            <span style={{ textAlign: 'right' }}>Total</span>
            <span title="Requiere completar por el cliente" style={{ textAlign: 'center' }}>🔔</span>
          </div>

          {rows.length === 0 ? (
            <p style={{ color: MUTED, textAlign: 'center', padding: '28px 16px', fontSize: '0.85rem', margin: 0 }}>
              Sin productos en esta licitación.
            </p>
          ) : calcRows.map((r, idx) => {
            const precioAuto = r.costo && r.margen && !r.precio;
            const faltaPrecio = !r.precio && !(r.costo && r.margen);
            return (
              <div key={r.id} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 70px 105px 80px 105px 90px 32px',
                gap: 6, padding: '9px 14px', alignItems: 'center',
                borderBottom: idx < rows.length - 1 ? `1px solid ${BORDER}` : 'none',
                background: faltaPrecio ? '#FFFBEB' : WHITE,
              }}>
                {/* Name */}
                <div>
                  <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: TEXT, lineHeight: 1.3 }}>
                    {r.nombre}
                  </p>
                  {r.descripcion && r.descripcion !== r.nombre && (
                    <p style={{ margin: '1px 0 0', fontSize: '0.7rem', color: MUTED }}>{r.descripcion}</p>
                  )}
                </div>
                {/* Qty */}
                <div style={{ textAlign: 'center', fontSize: '0.84rem' }}>
                  {r.cantidad} <span style={{ color: MUTED, fontSize: '0.72rem' }}>{r.unidad_medida}</span>
                </div>
                {/* Costo */}
                <input type="number" min={0} placeholder="$ costo"
                  value={rows[idx].costo}
                  onChange={e => updateRow(idx, 'costo', e.target.value)}
                  style={inputSt(!!rows[idx].costo)} />
                {/* Margen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <input type="number" min={0} max={999} placeholder="0"
                    value={rows[idx].margen}
                    onChange={e => updateRow(idx, 'margen', e.target.value)}
                    style={{ ...inputSt(!!rows[idx].margen), width: '65%' }} />
                  <span style={{ fontSize: '0.78rem', color: MUTED, flexShrink: 0 }}>%</span>
                </div>
                {/* Precio */}
                <div>
                  <input type="number" min={0} placeholder="$ precio"
                    value={precioAuto ? String(r.precioFinal) : rows[idx].precio}
                    readOnly={!!precioAuto}
                    onChange={e => !precioAuto && updateRow(idx, 'precio', e.target.value)}
                    style={{
                      ...inputSt(!!rows[idx].precio || precioAuto),
                      color: precioAuto ? BLUE : TEXT,
                      cursor: precioAuto ? 'default' : 'text',
                    }} />
                  {faltaPrecio && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: AMBER }}>
                      ingresa costo+margen o precio
                    </p>
                  )}
                </div>
                {/* Total */}
                <div style={{ textAlign: 'right', fontSize: '0.84rem',
                  fontWeight: r.totalPrecio > 0 ? 600 : 400,
                  color: r.totalPrecio > 0 ? TEXT : MUTED }}>
                  {r.totalPrecio > 0 ? pesos(r.totalPrecio) : '—'}
                </div>
                {/* Flag for client */}
                <div style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={rows[idx].requiere_cliente}
                    onChange={e => updateRow(idx, 'requiere_cliente', e.target.checked)}
                    title="Marcar para que el cliente complete el precio"
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: AMBER }} />
                </div>
              </div>
            );
          })}

          {/* Totals */}
          {rows.length > 0 && (
            <div style={{ borderTop: `2px solid ${BORDER}`, padding: '12px 14px',
              background: BG, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              {/* Margin summary */}
              <div>
                {totalCosto > 0 && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: MUTED }}>
                    Costo total: <strong>{pesos(totalCosto)}</strong>
                    {margenGlobal != null && (
                      <span style={{ marginLeft: 10, color: margenGlobal >= 0 ? GREEN : RED }}>
                        Margen promedio: {margenGlobal}%
                      </span>
                    )}
                  </p>
                )}
              </div>
              {/* Price totals */}
              <div style={{ minWidth: 220 }}>
                {[
                  { label: 'Subtotal neto', value: pesos(subtotal) },
                  { label: 'IVA 19%',       value: pesos(iva) },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between',
                    padding: '2px 0', fontSize: '0.83rem' }}>
                    <span style={{ color: MUTED }}>{r.label}</span>
                    <span>{r.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '5px 0 0', marginTop: 4, borderTop: `1px solid ${BORDER}`,
                  fontSize: '1rem', fontWeight: 800, color: BLUE }}>
                  <span>TOTAL</span>
                  <span>{pesos(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Comment */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          padding: '14px', marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 7, fontSize: '0.7rem',
            fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Notas para el cliente
          </label>
          <textarea value={comentario} onChange={e => setComentario(e.target.value)}
            placeholder="Condiciones especiales, plazos, preguntas que deba responder el cliente…"
            rows={3} style={{ width: '100%', boxSizing: 'border-box', borderRadius: 8,
              border: `1.5px solid ${BORDER}`, padding: '10px 12px', fontSize: '0.87rem',
              fontFamily: 'inherit', color: TEXT, resize: 'vertical', lineHeight: 1.5, outline: 'none' }} />
        </div>

        {/* Send token banner */}
        {sendToken && (
          <div style={{ background: '#ECFDF5', border: `1.5px solid #6EE7B7`, borderRadius: 12,
            padding: '14px 16px', marginBottom: 16, display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#065F46', fontSize: '0.88rem' }}>
                ¡Cotización lista para enviar!
              </p>
              <p style={{ margin: 0, color: '#047857', fontSize: '0.78rem' }}>
                Copia el link y compártelo con el cliente por WhatsApp o email.
              </p>
            </div>
            <button onClick={copyLink} style={{
              height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: GREEN, color: WHITE, fontFamily: 'inherit',
              fontSize: '0.82rem', fontWeight: 700, padding: '0 16px' }}>
              {copied ? 'Copiado ✓' : 'Copiar link'}
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={enviarCliente} style={{
            flex: 1, height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: BLUE, color: WHITE, fontFamily: 'inherit',
            fontSize: '0.92rem', fontWeight: 700 }}>
            Enviar al cliente →
          </button>
          <button onClick={descargarPDF} style={{
            height: 48, borderRadius: 12, border: `1.5px solid ${BLUE}`,
            background: WHITE, color: BLUE, fontFamily: 'inherit',
            fontSize: '0.88rem', fontWeight: 600, padding: '0 18px', cursor: 'pointer' }}>
            PDF ↓
          </button>
          <a href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(compra.codigo)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ height: 48, borderRadius: 12, border: `1.5px solid ${BORDER}`,
              background: WHITE, color: MUTED, fontFamily: 'inherit', fontSize: '0.85rem',
              fontWeight: 600, padding: '0 16px', display: 'inline-flex', alignItems: 'center',
              textDecoration: 'none' }}>
            Portal ↗
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
