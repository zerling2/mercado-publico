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
  descripcion: string | null;
  lugar_entrega: string | null;
  plazo_entrega_dias: number | null;
}

interface ItemCotizacion {
  id: string;
  nombre: string;
  descripcion: string | null;
  cantidad: number;
  unidad_medida: string;
  estado: 'cotizable' | 'calculado' | 'fuera' | 'sin_analisis';
  catalogo_nombre: string | null;
  precio_unitario: number | null;
  confianza: number | null;
  nota_ia: string | null;
  manual?: boolean;
}

interface Relevancia {
  id: string;
  comentario: string | null;
  visto: boolean;
  cotizacion_descargada: boolean;
  relevancia_score: number;
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

function pesos(n: number | null | undefined) {
  if (n == null || n === 0) return '—';
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CotizacionPage({ params }: { params: { user_id: string; compra_codigo: string } }) {
  const { user_id, compra_codigo } = params;

  const [compra, setCompra]       = useState<CompraInfo | null>(null);
  const [items, setItems]         = useState<ItemCotizacion[]>([]);
  const [relevancia, setRelevancia] = useState<Relevancia | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [precios, setPrecios]     = useState<Record<string, string>>({});
  const [comentario, setComentario]         = useState('');
  const [savingComentario, setSavingComentario] = useState(false);
  const [comentarioMsg, setComentarioMsg]   = useState('');

  // Manual item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ nombre: '', cantidad: '1', unidad_medida: 'u', precio: '' });

  useEffect(() => {
    fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setCompra(d.compra);
        setItems(d.items ?? []);
        setRelevancia(d.relevancia);
        setComentario(d.relevancia?.comentario ?? '');
        const initial: Record<string, string> = {};
        (d.items ?? []).forEach((it: ItemCotizacion) => {
          initial[it.id] = it.precio_unitario != null ? String(it.precio_unitario) : '';
        });
        setPrecios(initial);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [user_id, compra_codigo]);

  const addManualItem = () => {
    if (!newItem.nombre.trim()) return;
    const id = `manual-${Date.now()}`;
    const it: ItemCotizacion = {
      id,
      nombre: newItem.nombre.trim(),
      descripcion: null,
      cantidad: Math.max(1, Number(newItem.cantidad) || 1),
      unidad_medida: newItem.unidad_medida.trim() || 'u',
      estado: 'sin_analisis',
      catalogo_nombre: null,
      precio_unitario: newItem.precio ? Number(newItem.precio) : null,
      confianza: null,
      nota_ia: null,
      manual: true,
    };
    setItems(prev => [...prev, it]);
    setPrecios(prev => ({ ...prev, [id]: newItem.precio }));
    setNewItem({ nombre: '', cantidad: '1', unidad_medida: 'u', precio: '' });
    setShowAddForm(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    setPrecios(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const rows = items.map(it => {
    const pu = Number(precios[it.id] ?? '') || 0;
    return { ...it, precio_unit: pu, total: pu * it.cantidad };
  });
  const subtotal = rows.reduce((s, r) => s + r.total, 0);
  const iva      = Math.round(subtotal * 0.19);
  const total    = subtotal + iva;

  const guardarComentario = async () => {
    setSavingComentario(true);
    setComentarioMsg('');
    const res = await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comentario }),
    });
    const json = await res.json();
    setSavingComentario(false);
    setComentarioMsg(json.ok ? 'Guardado' : 'Error al guardar');
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
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: MUTED }}>
      Cargando cotización…
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

  const inputSt: React.CSSProperties = {
    height: 38, borderRadius: 8, border: `1.5px solid ${BORDER}`,
    padding: '0 10px', fontSize: '0.85rem', fontFamily: 'inherit',
    color: TEXT, boxSizing: 'border-box', width: '100%',
    background: WHITE,
  };

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      color: TEXT, maxWidth: 800, margin: '0 auto', paddingBottom: 48,
    }}>
      {/* Header */}
      <header style={{
        background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`,
        color: WHITE, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Link href={`/app/dashboard/${user_id}`}
          style={{ color: WHITE, textDecoration: 'none', fontSize: '1.1rem', lineHeight: 1,
            padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.15)' }}>
          ←
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {compra.nombre}
          </h1>
          <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.7 }}>{compra.codigo}</p>
        </div>
        <button onClick={descargarPDF} style={{
          height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: WHITE, color: BLUE, fontFamily: 'inherit',
          fontSize: '0.82rem', fontWeight: 700, padding: '0 14px', whiteSpace: 'nowrap',
        }}>
          PDF ↓
        </button>
      </header>

      <div style={{ padding: '16px' }}>

        {/* Compra info */}
        <div style={{ background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
          padding: '14px 16px', marginBottom: 14 }}>
          <p style={{ margin: '0 0 2px', fontSize: '0.72rem', color: MUTED }}>{compra.organismo}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px',
            fontSize: '0.82rem', marginTop: 8 }}>
            <InfoRow label="Código"  value={compra.codigo} />
            <InfoRow label="Cierre"  value={fechaCorta(compra.fecha_cierre)} />
            {compra.region && <InfoRow label="Región" value={compra.region} />}
            {compra.monto_referencial
              ? <InfoRow label="Presupuesto" value={pesos(compra.monto_referencial)} bold />
              : null}
            {compra.lugar_entrega && <InfoRow label="Entrega" value={compra.lugar_entrega} />}
            {compra.plazo_entrega_dias
              ? <InfoRow label="Plazo" value={`${compra.plazo_entrega_dias} días`} />
              : null}
          </div>
        </div>

        {/* Items */}
        <div style={{ background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
          marginBottom: 14, overflow: 'hidden' }}>

          {/* Table header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: TEXT }}>
              Ítems cotizados {items.length > 0 && `(${items.length})`}
            </h3>
            <button
              onClick={() => setShowAddForm(v => !v)}
              style={{ height: 32, borderRadius: 8, border: `1.5px solid ${BLUE}`,
                background: showAddForm ? BLUE : WHITE,
                color: showAddForm ? WHITE : BLUE,
                fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700,
                padding: '0 12px', cursor: 'pointer' }}>
              {showAddForm ? 'Cancelar' : '+ Agregar ítem'}
            </button>
          </div>

          {/* Add item form */}
          {showAddForm && (
            <div style={{ padding: '12px 16px', background: '#EFF6FF',
              borderBottom: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: 8 }}>
                <div>
                  <label style={labelSt}>Descripción del ítem</label>
                  <input style={inputSt} placeholder="Ej: Resmas de papel A4"
                    value={newItem.nombre}
                    onChange={e => setNewItem(p => ({ ...p, nombre: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addManualItem()}
                  />
                </div>
                <div>
                  <label style={labelSt}>Cantidad</label>
                  <input style={{ ...inputSt, textAlign: 'center' }} type="number" min={1}
                    value={newItem.cantidad}
                    onChange={e => setNewItem(p => ({ ...p, cantidad: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelSt}>Unidad</label>
                  <input style={{ ...inputSt, textAlign: 'center' }} placeholder="u"
                    value={newItem.unidad_medida}
                    onChange={e => setNewItem(p => ({ ...p, unidad_medida: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'flex-end' }}>
                <div>
                  <label style={labelSt}>Precio unitario ($ neto)</label>
                  <input style={{ ...inputSt, textAlign: 'right' }} type="number" min={0}
                    placeholder="0"
                    value={newItem.precio}
                    onChange={e => setNewItem(p => ({ ...p, precio: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addManualItem()}
                  />
                </div>
                <button onClick={addManualItem} style={{
                  height: 38, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: BLUE, color: WHITE, fontFamily: 'inherit',
                  fontSize: '0.85rem', fontWeight: 700, padding: '0 18px', whiteSpace: 'nowrap',
                }}>
                  Agregar
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {items.length === 0 && !showAddForm && (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 6px' }}>
                No hay ítems aún para esta licitación.
              </p>
              <p style={{ color: MUTED, fontSize: '0.78rem', margin: 0 }}>
                Usa el botón "+ Agregar ítem" para ingresar los productos manualmente.
              </p>
            </div>
          )}

          {/* Rows */}
          {rows.map((it, idx) => (
            <div key={it.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 70px 110px 90px',
              gap: 8, padding: '10px 16px', alignItems: 'center',
              borderBottom: idx < rows.length - 1 ? `1px solid ${BORDER}` : 'none',
              background: WHITE,
            }}>
              {/* Name */}
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: TEXT, lineHeight: 1.3 }}>
                  {it.nombre}
                </p>
                {it.catalogo_nombre && (
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: BLUE }}>
                    → {it.catalogo_nombre}
                  </p>
                )}
                {it.manual && (
                  <span style={{ fontSize: '0.65rem', color: MUTED }}>manual</span>
                )}
              </div>
              {/* Qty */}
              <div style={{ textAlign: 'center', fontSize: '0.83rem', color: TEXT }}>
                {it.cantidad} {it.unidad_medida}
              </div>
              {/* Price input */}
              <input
                type="number" min={0}
                value={precios[it.id] ?? ''}
                onChange={e => setPrecios(p => ({ ...p, [it.id]: e.target.value }))}
                placeholder="$ precio"
                style={{
                  height: 36, borderRadius: 8, border: `1.5px solid ${BORDER}`,
                  padding: '0 8px', fontSize: '0.83rem', fontFamily: 'inherit',
                  textAlign: 'right', color: TEXT, boxSizing: 'border-box', width: '100%',
                  background: WHITE,
                }}
              />
              {/* Total + delete */}
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center',
                justifyContent: 'flex-end', gap: 6 }}>
                <span style={{ fontSize: '0.83rem', fontWeight: 600,
                  color: it.total > 0 ? TEXT : MUTED }}>
                  {it.total > 0 ? pesos(it.total) : '—'}
                </span>
                {it.manual && (
                  <button onClick={() => removeItem(it.id)}
                    title="Eliminar"
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      color: MUTED, fontSize: '0.9rem', padding: '0 2px', lineHeight: 1 }}>
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Totals */}
          {rows.length > 0 && (
            <div style={{ borderTop: `2px solid ${BORDER}`, padding: '12px 16px', background: BG }}>
              {[
                { label: 'Subtotal neto', value: pesos(subtotal), bold: false },
                { label: 'IVA 19%',       value: pesos(iva),      bold: false },
                { label: 'TOTAL',         value: pesos(total),    bold: true  },
              ].map(r => (
                <div key={r.label} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '3px 0',
                  fontSize: r.bold ? '1rem' : '0.85rem',
                  fontWeight: r.bold ? 800 : 400,
                  color: r.bold ? BLUE : TEXT,
                }}>
                  <span>{r.label}</span>
                  <span>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment */}
        <div style={{ background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
          padding: '14px 16px', marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: TEXT }}>
            Comentario interno
          </h3>
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Notas de revisión, decisiones, preguntas pendientes…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', borderRadius: 10,
              border: `1.5px solid ${BORDER}`, padding: '10px 12px',
              fontSize: '0.87rem', fontFamily: 'inherit', color: TEXT,
              resize: 'vertical', lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            {comentarioMsg && (
              <span style={{ fontSize: '0.78rem', color: comentarioMsg.includes('Error') ? RED : GREEN }}>
                {comentarioMsg}
              </span>
            )}
            <button onClick={guardarComentario} disabled={savingComentario}
              style={{ marginLeft: 'auto', height: 34, borderRadius: 8, border: 'none',
                cursor: 'pointer', background: BLUE, color: WHITE,
                fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, padding: '0 16px' }}>
              {savingComentario ? 'Guardando…' : 'Guardar'}
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
              cursor: 'pointer', background: WHITE, color: BLUE,
              fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600,
              padding: '0 20px', display: 'inline-flex', alignItems: 'center',
              textDecoration: 'none' }}>
            Portal ↗
          </a>
        </div>
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: 'block', marginBottom: 4,
  fontSize: '0.7rem', fontWeight: 700, color: MUTED,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ color: MUTED, minWidth: 80, flexShrink: 0, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: bold ? 700 : 400, fontSize: '0.82rem' }}>{value}</span>
    </div>
  );
}
