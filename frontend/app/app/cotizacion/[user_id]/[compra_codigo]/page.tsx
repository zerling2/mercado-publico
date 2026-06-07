'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

interface Relevancia {
  id: string;
  comentario: string | null;
  visto: boolean;
  cotizacion_descargada: boolean;
  relevancia_score: number;
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

function pesos(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    cotizable:   { bg: '#D1FAE5', color: '#065F46', label: 'Cotizable' },
    calculado:   { bg: '#DBEAFE', color: '#1E40AF', label: 'Calculado' },
    fuera:       { bg: '#FEE2E2', color: '#991B1B', label: 'Fuera' },
    sin_analisis:{ bg: '#F3F4F6', color: MUTED,     label: 'Sin análisis' },
  };
  const s = map[estado] ?? map.sin_analisis;
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {s.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CotizacionPage({ params }: { params: { user_id: string; compra_codigo: string } }) {
  const { user_id, compra_codigo } = params;

  const [compra, setCompra] = useState<CompraInfo | null>(null);
  const [items, setItems] = useState<ItemCotizacion[]>([]);
  const [relevancia, setRelevancia] = useState<Relevancia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editable prices (keyed by item id)
  const [precios, setPrecios] = useState<Record<string, string>>({});

  // Comment
  const [comentario, setComentario] = useState('');
  const [savingComentario, setSavingComentario] = useState(false);
  const [comentarioMsg, setComentarioMsg] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setCompra(d.compra);
        setItems(d.items ?? []);
        setRelevancia(d.relevancia);
        setComentario(d.relevancia?.comentario ?? '');
        // Initialise editable prices from AI/catalog suggestions
        const initial: Record<string, string> = {};
        (d.items ?? []).forEach((it: ItemCotizacion) => {
          initial[it.id] = it.precio_unitario != null ? String(it.precio_unitario) : '';
        });
        setPrecios(initial);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [user_id, compra_codigo]);

  // ── Calculations ───────────────────────────────────────────────────────────

  const rows = items.map(it => {
    const pu = Number(precios[it.id] ?? '') || 0;
    return { ...it, precio_unit: pu, total: pu * it.cantidad };
  });
  const subtotal = rows.reduce((s, r) => s + r.total, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  // ── Save comment ───────────────────────────────────────────────────────────

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
    setComentarioMsg(json.ok ? 'Comentario guardado' : 'Error al guardar');
  };

  // ── Download PDF ───────────────────────────────────────────────────────────

  const descargarPDF = async () => {
    // Mark cotizacion_descargada in DB
    await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cotizacion_descargada: true }),
    });
    window.print();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: MUTED }}>
      Cargando cotización…
    </div>
  );

  if (error || !compra) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: RED, flexDirection: 'column', gap: 12 }}>
      <p>{error || 'Compra no encontrada'}</p>
      <Link href={`/app/dashboard/${user_id}`} style={{ color: BLUE }}>← Volver</Link>
    </div>
  );

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-root { max-width: 100% !important; padding: 0 !important; }
          .print-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="print-root" style={{
        minHeight: '100vh', background: BG,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
        color: TEXT, maxWidth: 800, margin: '0 auto', paddingBottom: 48,
      }}>
        {/* Header */}
        <header className="no-print" style={{
          background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`,
          color: WHITE, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Link href={`/app/dashboard/${user_id}`}
            style={{ color: WHITE, textDecoration: 'none', fontSize: '1.1rem', lineHeight: 1,
              padding: '4px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.15)' }}>
            ←
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Cotización
            </h1>
            <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.7 }}>{compra.codigo}</p>
          </div>
          <button
            onClick={descargarPDF}
            style={{
              height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: WHITE, color: BLUE, fontFamily: 'inherit',
              fontSize: '0.82rem', fontWeight: 700, padding: '0 14px',
            }}
          >
            PDF ↓
          </button>
        </header>

        <div ref={printRef} style={{ padding: '16px' }}>
          {/* ── Compra info card ─────────────────────────────────────────── */}
          <div className="print-card" style={{
            background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
            padding: '16px', marginBottom: 16,
          }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: TEXT, lineHeight: 1.35 }}>
              {compra.nombre}
            </h2>
            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: MUTED }}>{compra.organismo}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '0.82rem' }}>
              <InfoRow label="Código" value={compra.codigo} />
              <InfoRow label="Cierre" value={fechaCorta(compra.fecha_cierre)} />
              {compra.region && <InfoRow label="Región" value={compra.region} />}
              {compra.monto_referencial && (
                <InfoRow label="Presupuesto ref." value={pesos(compra.monto_referencial)} bold />
              )}
              {compra.lugar_entrega && <InfoRow label="Entrega" value={compra.lugar_entrega} />}
              {compra.plazo_entrega_dias && (
                <InfoRow label="Plazo" value={`${compra.plazo_entrega_dias} días`} />
              )}
            </div>
          </div>

          {/* ── Items table ──────────────────────────────────────────────── */}
          <div className="print-card" style={{
            background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
            marginBottom: 16, overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 16px 8px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: TEXT }}>
                Ítems ({items.length})
              </h3>
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 100px 120px 100px',
              gap: 8, padding: '8px 16px',
              fontSize: '0.7rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase',
              letterSpacing: '0.05em', borderBottom: `1px solid ${BORDER}`,
              background: BG,
            }}>
              <span>Ítem</span>
              <span style={{ textAlign: 'center' }}>Cant.</span>
              <span style={{ textAlign: 'right' }}>Precio unit.</span>
              <span style={{ textAlign: 'center' }}>Estado IA</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>

            {rows.map((it, idx) => (
              <div key={it.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 60px 100px 120px 100px',
                gap: 8, padding: '10px 16px',
                borderBottom: idx < rows.length - 1 ? `1px solid ${BORDER}` : 'none',
                alignItems: 'start',
                background: it.estado === 'fuera' ? '#FFF5F5' : WHITE,
              }}>
                {/* Item name */}
                <div>
                  <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: TEXT, lineHeight: 1.3 }}>
                    {it.nombre}
                  </p>
                  {it.catalogo_nombre && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: BLUE }}>
                      → {it.catalogo_nombre}
                    </p>
                  )}
                  {it.nota_ia && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: MUTED, fontStyle: 'italic' }}>
                      {it.nota_ia}
                    </p>
                  )}
                </div>
                {/* Quantity */}
                <div style={{ textAlign: 'center', fontSize: '0.84rem', paddingTop: 2 }}>
                  {it.cantidad} {it.unidad_medida}
                </div>
                {/* Price input */}
                <div>
                  <input
                    className="no-print"
                    type="number"
                    min={0}
                    value={precios[it.id] ?? ''}
                    onChange={e => setPrecios(p => ({ ...p, [it.id]: e.target.value }))}
                    placeholder="Por definir"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      height: 34, borderRadius: 8, border: `1.5px solid ${BORDER}`,
                      padding: '0 8px', fontSize: '0.82rem', fontFamily: 'inherit',
                      textAlign: 'right', color: TEXT,
                    }}
                  />
                  <span className="print-only" style={{ display: 'none', fontSize: '0.84rem' }}>
                    {it.precio_unit > 0 ? pesos(it.precio_unit) : '—'}
                  </span>
                </div>
                {/* Estado badge */}
                <div style={{ textAlign: 'center', paddingTop: 4 }}>
                  {estadoBadge(it.estado)}
                  {it.confianza != null && (
                    <p style={{ margin: '3px 0 0', fontSize: '0.65rem', color: MUTED }}>
                      {Math.round(it.confianza * 100)}% conf.
                    </p>
                  )}
                </div>
                {/* Total */}
                <div style={{ textAlign: 'right', fontSize: '0.84rem', fontWeight: 600,
                  color: it.total > 0 ? TEXT : MUTED, paddingTop: 2 }}>
                  {it.total > 0 ? pesos(it.total) : '—'}
                </div>
              </div>
            ))}

            {/* Totals */}
            <div style={{ borderTop: `2px solid ${BORDER}`, padding: '12px 16px', background: BG }}>
              {[
                { label: 'Subtotal (neto)', value: pesos(subtotal), bold: false },
                { label: 'IVA 19%', value: pesos(iva), bold: false },
                { label: 'TOTAL', value: pesos(total), bold: true },
              ].map(r => (
                <div key={r.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '3px 0', fontSize: r.bold ? '1rem' : '0.85rem',
                  fontWeight: r.bold ? 800 : 400, color: r.bold ? BLUE : TEXT,
                }}>
                  <span>{r.label}</span>
                  <span>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Comment box ──────────────────────────────────────────────── */}
          <div className="print-card" style={{
            background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
            padding: '16px', marginBottom: 16,
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: TEXT }}>
              Comentario interno
            </h3>
            <textarea
              className="no-print"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Notas de revisión, decisiones, preguntas pendientes…"
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                borderRadius: 10, border: `1.5px solid ${BORDER}`,
                padding: '10px 12px', fontSize: '0.88rem', fontFamily: 'inherit',
                color: TEXT, resize: 'vertical', lineHeight: 1.5,
              }}
            />
            {/* Print version of comment */}
            {comentario && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: TEXT, lineHeight: 1.5,
                whiteSpace: 'pre-line', display: 'none' }}
                className="print-comment">
                {comentario}
              </p>
            )}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              {comentarioMsg && (
                <span style={{ fontSize: '0.8rem', color: comentarioMsg.includes('Error') ? RED : GREEN }}>
                  {comentarioMsg}
                </span>
              )}
              <button
                onClick={guardarComentario}
                disabled={savingComentario}
                style={{
                  marginLeft: 'auto', height: 36, borderRadius: 8, border: 'none',
                  cursor: 'pointer', background: BLUE, color: WHITE,
                  fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, padding: '0 16px',
                }}
              >
                {savingComentario ? 'Guardando…' : 'Guardar comentario'}
              </button>
            </div>
          </div>

          {/* ── Print button (bottom, no-print) ──────────────────────────── */}
          <div className="no-print" style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={descargarPDF}
              style={{
                flex: 1, height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: BLUE, color: WHITE, fontFamily: 'inherit',
                fontSize: '0.95rem', fontWeight: 700,
              }}
            >
              Descargar PDF
            </button>
            <a
              href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(compra.codigo)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: 48, borderRadius: 12, border: `1.5px solid ${BLUE}`,
                cursor: 'pointer', background: WHITE, color: BLUE,
                fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600,
                padding: '0 20px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
              }}
            >
              Portal ↗
            </a>
          </div>
        </div>
      </div>

      {/* Print-specific: show comment, hide inputs */}
      <style>{`
        @media print {
          .print-only { display: inline !important; }
          .print-comment { display: block !important; }
        }
      `}</style>
    </>
  );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ color: MUTED, minWidth: 100, flexShrink: 0 }}>{label}</span>
      <span style={{ color: TEXT, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
