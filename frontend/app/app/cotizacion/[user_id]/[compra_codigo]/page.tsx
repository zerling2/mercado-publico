'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
interface CalcRow extends ItemBase {
  costo: string; margen: string; precio: string;
  saved_id?: string; expandDesc: boolean;
}
interface CotizacionEstado {
  id: string;
  estado: string;
  respuesta_cliente: string | null;
  comentario_rechazo: string | null;
  respondida_at: string | null;
  postulada_at: string | null;
  quien_postulo: string | null;
  token: string | null;
}

const BLUE = '#003DA5'; const BLUE_D = '#00297A';
const GREEN = '#059669'; const AMBER = '#B45309';
const RED = '#DC2626';
const TEXT = '#111827'; const MUTED = '#6B7280';
const BORDER = '#E5E7EB'; const BG = '#F9FAFB'; const WHITE = '#FFFFFF';

function pesos(n: number) {
  if (!n) return '—';
  return '$' + n.toLocaleString('es-CL');
}
function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}
function calcPrecio(costo: string, margen: string) {
  const c = parseFloat(costo); const m = parseFloat(margen);
  return (!isNaN(c) && !isNaN(m)) ? Math.round(c * (1 + m / 100)) : 0;
}
function calcMargen(costo: string, precio: string) {
  const c = parseFloat(costo); const p = parseFloat(precio);
  return (!isNaN(c) && c > 0 && !isNaN(p)) ? Math.round((p / c - 1) * 100 * 10) / 10 : 0;
}

export default function CotizacionPage({ params }: { params: { user_id: string; compra_codigo: string } }) {
  const { user_id, compra_codigo } = params;
  const router = useRouter();

  const [compra, setCompra]               = useState<CompraInfo | null>(null);
  const [rows, setRows]                   = useState<CalcRow[]>([]);
  const [notasInternas, setNotasInternas] = useState('');
  const [notasCliente, setNotasCliente]   = useState('');
  const [cotizacion, setCotizacion]       = useState<CotizacionEstado | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [saving, setSaving]               = useState(false);
  const [savedMsg, setSavedMsg]           = useState('');
  const [infoExpanded, setInfoExpanded]   = useState(false);
  const [docs, setDocs]                   = useState<{ nombre: string; url: string; tipo: string }[] | null>(null);
  const [docsLoading, setDocsLoading]     = useState(false);

  useEffect(() => {
    async function load() {
      const [base, saved] = await Promise.all([
        fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`).then(r => r.json()),
        fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}/items`).then(r => r.json()),
      ]);
      if (base.error) { setError(base.error); setLoading(false); return; }
      setCompra(base.compra);
      setNotasInternas(base.relevancia?.comentario ?? '');
      setNotasCliente(base.notas_cliente ?? '');
      setCotizacion(base.cotizacion ?? null);
      const savedMap = new Map((Array.isArray(saved) ? saved : []).map(
        (s: { compra_producto_id: string; id: string; costo: number | null; margen: number | null; precio: number | null }) =>
          [s.compra_producto_id, s]
      ));
      setRows((base.items ?? []).map((it: ItemBase) => {
        const sv = savedMap.get(it.id);
        return {
          ...it,
          costo:  sv?.costo  != null ? String(sv.costo)  : '',
          margen: sv?.margen != null ? String(sv.margen) : '',
          precio: sv?.precio != null ? String(sv.precio) : it.precio_unitario != null ? String(it.precio_unitario) : '',
          saved_id: sv?.id,
          expandDesc: false,
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
      if (field === 'costo' || field === 'margen') {
        if (r.costo && r.margen) r.precio = String(calcPrecio(r.costo, r.margen));
      }
      if (field === 'costo' || field === 'precio') {
        if (r.costo && r.precio) r.margen = String(calcMargen(r.costo, r.precio));
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
    }));
    await Promise.all([
      fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }),
      fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentario: notasInternas, notas_cliente: notasCliente }),
      }),
    ]);
    setSaving(false); setSavedMsg('Guardado ✓');
    setTimeout(() => setSavedMsg(''), 2000);
  }, [rows, notasInternas, notasCliente, user_id, compra_codigo]);

  const enviarCliente = async () => {
    await guardar();
    await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}/enviar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const base = await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`).then(r => r.json());
    setCotizacion(base.cotizacion ?? null);
    setSavedMsg('Enviada al cliente ✓');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const descargarPDF = async () => {
    await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cotizacion_descargada: true }),
    });
    window.location.href = `/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}/pdf`;
  };

  const marcarPostulada = async (quien: 'asesor' | 'cliente') => {
    await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postulada: true, quien_postulo: quien }),
    });
    const base = await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`).then(r => r.json());
    setCotizacion(base.cotizacion ?? null);
  };

  const marcarResultado = async (resultado: 'ganada' | 'perdida' | 'desierta') => {
    await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultado }),
    });
    const base = await fetch(`/api/cotizacion/${user_id}/${encodeURIComponent(compra_codigo)}`).then(r => r.json());
    setCotizacion(base.cotizacion ?? null);
  };

  const toggleInfo = useCallback(async () => {
    const next = !infoExpanded;
    setInfoExpanded(next);
    if (next && docs === null && !docsLoading) {
      setDocsLoading(true);
      try {
        const d = await fetch(`/api/compras-agiles/${encodeURIComponent(compra_codigo)}`).then(r => r.json());
        setDocs(Array.isArray(d.documentos) ? d.documentos : []);
      } catch {
        setDocs([]);
      }
      setDocsLoading(false);
    }
  }, [infoExpanded, docs, docsLoading, compra_codigo]);

  const calcRows = rows.map(r => {
    const p = r.precio ? parseFloat(r.precio) : (r.costo && r.margen ? calcPrecio(r.costo, r.margen) : 0);
    const c = r.costo ? parseFloat(r.costo) : 0;
    return { ...r, precioFinal: p, costoFinal: c, totalPrecio: p * r.cantidad, totalCosto: c * r.cantidad };
  });
  const subtotal     = calcRows.reduce((s, r) => s + r.totalPrecio, 0);
  const totalCosto   = calcRows.reduce((s, r) => s + r.totalCosto, 0);
  const iva          = Math.round(subtotal * 0.19);
  const total        = subtotal + iva;
  const margenGlobal = totalCosto > 0 ? Math.round((subtotal / totalCosto - 1) * 100) : null;
  const llenados      = calcRows.filter(r => r.precioFinal > 0).length;
  const todosPreciados = rows.length > 0 && llenados === rows.length;

  const estado = cotizacion?.estado;
  const isFinal = ['ganada', 'perdida', 'desierta'].includes(estado ?? '');

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      fontFamily: '-apple-system, sans-serif', color: MUTED }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%',
        border: `3px solid ${BORDER}`, borderTopColor: BLUE,
        animation: 'spin 0.8s linear infinite' }} />
      <p style={{ margin: 0, fontSize: '0.83rem' }}>Cargando…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error || !compra) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: RED,
      flexDirection: 'column', gap: 12 }}>
      <p>{error || 'No encontrada'}</p>
      <button onClick={() => router.back()} style={{ color: BLUE, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>← Volver</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      color: TEXT, maxWidth: 640, margin: '0 auto', paddingBottom: isFinal ? 24 : 96 }}>

      {/* Sticky header */}
      <header style={{ background: `linear-gradient(135deg,${BLUE_D} 0%,${BLUE} 100%)`,
        color: WHITE, padding: '11px 14px', position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.back()}
          style={{ color: WHITE, border: 'none', cursor: 'pointer', padding: '5px 8px', fontFamily: 'inherit',
            borderRadius: 6, background: 'rgba(255,255,255,0.15)', fontSize: '0.9rem', lineHeight: 1 }}>
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {compra.nombre}
          </p>
          <p style={{ margin: 0, fontSize: '0.66rem', opacity: 0.6 }}>
            {compra.organismo} · {compra.codigo}
          </p>
        </div>
        <button onClick={todosPreciados ? descargarPDF : undefined}
          title={todosPreciados ? undefined : 'Completa todos los precios para generar el PDF'}
          style={{ height: 30, borderRadius: 6, border: 'none',
            background: todosPreciados ? WHITE : 'rgba(255,255,255,0.15)',
            color: todosPreciados ? BLUE : 'rgba(255,255,255,0.4)',
            fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700,
            padding: '0 10px', cursor: todosPreciados ? 'pointer' : 'default' }}>
          PDF ↓
        </button>
      </header>

      <div style={{ padding: '12px 14px' }}>

        {/* STATUS BANNERS */}
        {estado === 'aprobada' && (
          <div style={{ background: '#ECFDF5', border: `1.5px solid #6EE7B7`, borderRadius: 12,
            padding: '12px 14px', marginBottom: 12 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#065F46', fontSize: '0.88rem' }}>
              Cliente aprobó la cotización
            </p>
            <p style={{ margin: '0 0 10px', color: '#047857', fontSize: '0.78rem' }}>
              Respondida {fechaCorta(cotizacion?.respondida_at ?? null)}. ¿Quién sube al portal?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => marcarPostulada('asesor')}
                style={{ flex: 1, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: GREEN, color: WHITE, fontFamily: 'inherit',
                  fontSize: '0.82rem', fontWeight: 700 }}>
                Subir yo (asesor)
              </button>
              <button onClick={() => marcarPostulada('cliente')}
                style={{ flex: 1, height: 36, borderRadius: 8, border: `1.5px solid ${GREEN}`, cursor: 'pointer',
                  background: WHITE, color: GREEN, fontFamily: 'inherit',
                  fontSize: '0.82rem', fontWeight: 700 }}>
                El cliente lo sube
              </button>
            </div>
          </div>
        )}

        {estado === 'rechazada' && (
          <div style={{ background: '#FEF2F2', border: `1.5px solid #FCA5A5`, borderRadius: 12,
            padding: '12px 14px', marginBottom: 12 }}>
            <p style={{ margin: '0 0 3px', fontWeight: 700, color: RED, fontSize: '0.88rem' }}>
              Cliente rechazó la cotización
            </p>
            <p style={{ margin: '0 0 2px', color: '#B91C1C', fontSize: '0.78rem' }}>
              Respondida {fechaCorta(cotizacion?.respondida_at ?? null)}
            </p>
            {cotizacion?.comentario_rechazo && (
              <p style={{ margin: '6px 0 0', color: '#7F1D1D', fontSize: '0.82rem',
                fontStyle: 'italic', borderTop: `1px solid #FCA5A5`, paddingTop: 6 }}>
                "{cotizacion.comentario_rechazo}"
              </p>
            )}
          </div>
        )}

        {estado === 'postulada' && (
          <div style={{ background: '#EFF6FF', border: `1.5px solid #93C5FD`, borderRadius: 12,
            padding: '12px 14px', marginBottom: 12 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: BLUE, fontSize: '0.88rem' }}>
              Postulada al portal — {cotizacion?.quien_postulo === 'cliente' ? 'subió el cliente' : 'subió el asesor'}
            </p>
            <p style={{ margin: '0 0 10px', color: '#1D4ED8', fontSize: '0.78rem' }}>
              {fechaCorta(cotizacion?.postulada_at ?? null)} · ¿Cuál fue el resultado?
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['ganada', 'perdida', 'desierta'] as const).map(r => (
                <button key={r} onClick={() => marcarResultado(r)}
                  style={{ flex: 1, height: 34, borderRadius: 8,
                    border: `1.5px solid ${r === 'ganada' ? GREEN : r === 'perdida' ? RED : AMBER}`,
                    background: WHITE, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '0.78rem', fontWeight: 700,
                    color: r === 'ganada' ? GREEN : r === 'perdida' ? RED : AMBER }}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {isFinal && (
          <div style={{
            background: estado === 'ganada' ? '#ECFDF5' : estado === 'perdida' ? '#FEF2F2' : '#FFFBEB',
            border: `1.5px solid ${estado === 'ganada' ? '#6EE7B7' : estado === 'perdida' ? '#FCA5A5' : '#FCD34D'}`,
            borderRadius: 12, padding: '12px 14px', marginBottom: 12,
          }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem',
              color: estado === 'ganada' ? GREEN : estado === 'perdida' ? RED : AMBER }}>
              {estado === 'ganada' ? 'Ganada' : estado === 'perdida' ? 'Perdida' : 'Desierta'}
            </p>
          </div>
        )}

        {/* Compra info — collapsible */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          marginBottom: 12, overflow: 'hidden' }}>
          <button onClick={toggleInfo}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '11px 14px', textAlign: 'left', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: TEXT }}>
                  {compra.organismo}
                </span>
                <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: MUTED }}>Cierre {fechaCorta(compra.fecha_cierre)}</span>
                  {compra.monto_referencial && (
                    <span style={{ fontSize: '0.72rem', color: BLUE, fontWeight: 700 }}>
                      Presupuesto {pesos(compra.monto_referencial)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span style={{ color: MUTED, fontSize: '0.85rem', transition: 'transform 0.2s',
              transform: infoExpanded ? 'rotate(180deg)' : 'none' }}>⌄</span>
          </button>
          {infoExpanded && (
            <div style={{ borderTop: `1px solid ${BORDER}`, padding: '10px 14px',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '0.78rem' }}>
              <Row label="Código"  val={compra.codigo} />
              <Row label="Región"  val={compra.region ?? '—'} />
              {compra.lugar_entrega && <Row label="Entrega" val={compra.lugar_entrega} full />}
              {compra.plazo_entrega_dias && <Row label="Plazo" val={`${compra.plazo_entrega_dias} días`} />}
              <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: 700,
                  color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Documentos
                </p>
                {docsLoading && (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: MUTED }}>Cargando documentos…</p>
                )}
                {!docsLoading && docs !== null && docs.length === 0 && (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: MUTED }}>Sin documentos adjuntos.</p>
                )}
                {!docsLoading && docs !== null && docs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {docs.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6,
                          color: BLUE, fontSize: '0.8rem', textDecoration: 'none',
                          background: '#EEF3FF', borderRadius: 8, padding: '7px 10px' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.2"
                          strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.nombre}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {rows.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: '0.72rem', color: MUTED, marginBottom: 4 }}>
              <span>{llenados} de {rows.length} productos con precio</span>
              <span>{Math.round(llenados / rows.length * 100)}%</span>
            </div>
            <div style={{ height: 4, background: BORDER, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: llenados === rows.length ? GREEN : BLUE,
                width: `${Math.round(llenados / rows.length * 100)}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Product cards */}
        {rows.length === 0 ? (
          <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
            padding: '28px 16px', textAlign: 'center' }}>
            <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>Sin productos en esta licitación.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {calcRows.map((r, idx) => {
              const precioAuto = !!(r.costo && r.margen && !rows[idx].precio);
              const descLarga  = (r.descripcion ?? '').length > 60;

              return (
                <div key={r.id} style={{
                  background: WHITE, borderRadius: 12,
                  border: `1px solid ${BORDER}`,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '11px 14px 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>
                          {r.nombre}
                        </p>
                        {r.descripcion && r.descripcion !== r.nombre && (
                          <div style={{ marginTop: 3 }}>
                            <p style={{ margin: 0, fontSize: '0.73rem', color: MUTED, lineHeight: 1.4,
                              overflow: rows[idx].expandDesc ? 'visible' : 'hidden',
                              display: rows[idx].expandDesc ? 'block' : '-webkit-box',
                              WebkitLineClamp: rows[idx].expandDesc ? undefined : 2,
                              WebkitBoxOrient: 'vertical' as const,
                            }}>
                              {r.descripcion}
                            </p>
                            {descLarga && (
                              <button onClick={() => updateRow(idx, 'expandDesc', !rows[idx].expandDesc)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer',
                                  color: BLUE, fontSize: '0.7rem', padding: '2px 0', fontWeight: 600 }}>
                                {rows[idx].expandDesc ? 'Ver menos ↑' : 'Ver más ↓'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700,
                          color: r.totalPrecio > 0 ? TEXT : MUTED }}>
                          {r.totalPrecio > 0 ? pesos(r.totalPrecio) : '—'}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: MUTED }}>
                          {r.cantidad} {r.unidad_medida}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '0 14px 11px',
                    display: 'grid', gridTemplateColumns: '1fr 80px 1fr',
                    gap: 7, alignItems: 'center' }}>
                    <div>
                      <label style={labelSt}>Costo unit.</label>
                      <input type="number" min={0} placeholder="$"
                        value={rows[idx].costo}
                        onChange={e => updateRow(idx, 'costo', e.target.value)}
                        style={inpSt(!!rows[idx].costo)} />
                    </div>
                    <div>
                      <label style={labelSt}>Margen</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input type="number" min={0} max={999} placeholder="0"
                          value={rows[idx].margen}
                          onChange={e => updateRow(idx, 'margen', e.target.value)}
                          style={{ ...inpSt(!!rows[idx].margen), textAlign: 'center' }} />
                        <span style={{ fontSize: '0.75rem', color: MUTED, flexShrink: 0 }}>%</span>
                      </div>
                    </div>
                    <div>
                      <label style={labelSt}>
                        Precio neto {precioAuto && <span style={{ color: BLUE }}>·auto</span>}
                      </label>
                      <input type="number" min={0} placeholder="$"
                        value={precioAuto ? String(r.precioFinal) : rows[idx].precio}
                        readOnly={precioAuto}
                        onChange={e => { if (!precioAuto) updateRow(idx, 'precio', e.target.value); }}
                        style={{
                          ...inpSt(!!(rows[idx].precio || precioAuto)),
                          color: precioAuto ? BLUE : TEXT,
                          cursor: precioAuto ? 'default' : 'text',
                        }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Totals card */}
        {rows.length > 0 && (
          <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
            padding: '12px 14px', marginBottom: 12 }}>
            {totalCosto > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between',
                paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: '0.78rem', color: MUTED }}>Costo total</span>
                <span style={{ fontSize: '0.78rem', color: TEXT, fontWeight: 600 }}>{pesos(totalCosto)}</span>
                {margenGlobal != null && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 700,
                    color: margenGlobal >= 20 ? GREEN : margenGlobal >= 10 ? AMBER : RED }}>
                    Margen {margenGlobal}%
                  </span>
                )}
              </div>
            )}
            {[
              { label: 'Subtotal neto', val: pesos(subtotal), bold: false },
              { label: 'IVA 19%',       val: pesos(iva),      bold: false },
              { label: 'TOTAL',         val: pesos(total),    bold: true  },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '3px 0', fontSize: r.bold ? '1rem' : '0.84rem',
                fontWeight: r.bold ? 800 : 400, color: r.bold ? BLUE : TEXT }}>
                <span style={{ color: r.bold ? BLUE : MUTED }}>{r.label}</span>
                <span>{r.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes — two side-by-side textareas */}
        <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
          padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ ...labelSt, display: 'block', marginBottom: 6 }}>
                Notas internas
              </label>
              <textarea value={notasInternas} onChange={e => setNotasInternas(e.target.value)}
                placeholder="Solo tú y el equipo las ven…"
                rows={3} style={textareaSt} />
            </div>
            <div>
              <label style={{ ...labelSt, display: 'block', marginBottom: 6 }}>
                Notas para el cliente
              </label>
              <textarea value={notasCliente} onChange={e => setNotasCliente(e.target.value)}
                placeholder="Condiciones, plazos, aclaraciones…"
                rows={3} style={textareaSt} />
            </div>
          </div>
        </div>


      </div>

      {/* Fixed bottom bar — only when not final */}
      {!isFinal && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: WHITE, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: 640, margin: '0 auto',
            padding: '10px 14px', display: 'flex', gap: 8 }}>
            <button onClick={guardar} disabled={saving}
              style={{ width: 90, height: 46, borderRadius: 11, cursor: 'pointer',
                border: `1.5px solid ${BORDER}`, background: BG,
                color: savedMsg ? GREEN : TEXT, fontFamily: 'inherit',
                fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>
              {saving ? '…' : savedMsg || 'Guardar'}
            </button>
            <button onClick={enviarCliente}
              style={{ flex: 1, height: 46, borderRadius: 11, border: 'none',
                cursor: 'pointer', background: BLUE, color: WHITE,
                fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 700 }}>
              Enviar al cliente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: 'block', marginBottom: 3,
  fontSize: '0.64rem', fontWeight: 700, color: MUTED,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const textareaSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const, borderRadius: 8,
  border: `1.5px solid ${BORDER}`, padding: '9px 11px', fontSize: '0.82rem',
  fontFamily: 'inherit', color: TEXT, resize: 'vertical', lineHeight: 1.5, outline: 'none',
};

const inpSt = (filled: boolean): React.CSSProperties => ({
  height: 36, width: '100%', boxSizing: 'border-box' as const,
  borderRadius: 8, border: `1.5px solid ${filled ? BLUE : BORDER}`,
  padding: '0 9px', fontSize: '0.85rem', fontFamily: 'inherit',
  textAlign: 'right' as const, color: TEXT,
  background: filled ? '#EFF6FF' : '#FAFAFA', outline: 'none',
});

function Row({ label, val, full }: { label: string; val: string; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined, display: 'flex', gap: 6 }}>
      <span style={{ color: MUTED, minWidth: 56, flexShrink: 0 }}>{label}</span>
      <span style={{ color: TEXT, fontWeight: 400 }}>{val}</span>
    </div>
  );
}
