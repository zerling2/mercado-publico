'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BLUE       = '#0047CC';
const BLUE_LIGHT = '#EEF3FF';
const BLUE_MID   = '#DBEAFE';
const WHITE      = '#FFFFFF';
const TEXT       = '#111827';
const TEXT_MUTED = '#6B7280';
const BORDER     = '#E5E7EB';
const BG_HOVER   = '#F5F8FF';
const GREEN      = '#059669';
const GREEN_LIGHT = '#D1FAE5';

interface Totals  { total: number; activas: number; cerradas: number; enCategorias: number; }
interface Categoria {
  id: string; nombre: string; keywords: string[];
  count: number; activas: number; cerradas: number;
}
interface Licitacion {
  id: string; codigo: string; nombre: string;
  organismo_nombre: string | null; monto: number | null;
  region: string | null; fecha_cierre: string | null; estado: string | null;
}

function diasRestantes(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
}
function pesos(n: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

function Icon({ id }: { id: string }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
    stroke: BLUE, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'impresion': return (
      <svg {...props}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    );
    case 'vestuario': return (
      <svg {...props}><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>
    );
    case 'publicidad': return (
      <svg {...props}><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
    );
    case 'reconocimientos': return (
      <svg {...props}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
    );
    case 'oficina': return (
      <svg {...props}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
    );
    case 'alimentacion': return (
      <svg {...props}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
    );
    case 'embalaje': return (
      <svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
    );
    case 'limpieza': return (
      <svg {...props}><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>
    );
    case 'tecnologia': return (
      <svg {...props}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
    );
    case 'mobiliario': return (
      <svg {...props}><rect x="3" y="12" width="18" height="8" rx="2"/><path d="M5 12V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/><line x1="5" y1="20" x2="5" y2="22"/><line x1="19" y1="20" x2="19" y2="22"/></svg>
    );
    case 'construccion': return (
      <svg {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    );
    case 'salud': return (
      <svg {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    );
    default: return (
      <svg {...props}><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    );
  }
}

function StatBox({ label, value, accent, success }: { label: string; value: number; accent?: boolean; success?: boolean }) {
  const color = success ? GREEN : accent ? BLUE : TEXT_MUTED;
  const bg    = success ? GREEN_LIGHT : accent ? BLUE_LIGHT : '#F9FAFB';
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: '0.72rem', color: TEXT_MUTED, marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

export default function CategoriasBrowsePage() {
  const router = useRouter();
  const [totals, setTotals]           = useState<Totals | null>(null);
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [selCat, setSelCat]           = useState<Categoria | null>(null);
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingLics, setLoadingLics] = useState(false);
  const [hovered, setHovered]         = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categorias-licitaciones')
      .then(r => r.json())
      .then(d => {
        setTotals(d.totals ?? null);
        setCategorias(Array.isArray(d.categorias) ? d.categorias : []);
        setLoadingCats(false);
      });
  }, []);

  const abrirCategoria = async (cat: Categoria) => {
    setSelCat(cat);
    setLicitaciones([]);
    setLoadingLics(true);
    const params = new URLSearchParams({ keywords: cat.keywords.join(','), limite: '100' });
    const d = await fetch(`/api/licitaciones-categoria?${params}`).then(r => r.json());
    setLicitaciones(Array.isArray(d) ? d : []);
    setLoadingLics(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: WHITE, fontFamily: FONT }}>

      {/* Fixed header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 52,
        background: WHITE, borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', padding: '0 20px',
        zIndex: 100, gap: 12,
      }}>
        <button
          onClick={() => selCat ? setSelCat(null) : router.back()}
          style={{
            background: 'none', border: 'none', color: BLUE,
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            padding: '6px 0', display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: FONT,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {selCat ? 'Categorías' : 'Volver'}
        </button>
        <span style={{ color: BORDER, fontSize: '1rem' }}>|</span>
        <span style={{ color: TEXT, fontSize: '0.9rem', fontWeight: 700 }}>
          {selCat ? selCat.nombre : 'Explorar por categoría'}
        </span>
      </div>

      {/* Content */}
      <div style={{ paddingTop: 52, maxWidth: 660, margin: '0 auto', padding: '52px 20px 64px' }}>

        {!selCat ? (
          <>
            {/* Summary */}
            {totals && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '24px 0 10px' }}>
                  <StatBox label="Total BD" value={totals.total} />
                  <StatBox label="Activas" value={totals.activas} success />
                  <StatBox label="Cerradas" value={totals.cerradas} />
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: BLUE_LIGHT, borderRadius: 10, padding: '9px 14px', marginBottom: 24,
                  fontSize: '0.78rem',
                }}>
                  <span style={{ color: TEXT_MUTED }}>
                    Cubiertas por categorías: <strong style={{ color: BLUE }}>{totals.enCategorias}</strong>
                    <span style={{ color: '#9CA3AF' }}> de {totals.total}</span>
                  </span>
                  <span style={{ color: '#9CA3AF', fontSize: '0.7rem' }}>
                    Los totales por fila pueden solaparse
                  </span>
                </div>
              </>
            )}

            {/* Table */}
            {loadingCats ? (
              <p style={{ color: TEXT_MUTED, textAlign: 'center', padding: 40, fontSize: '0.9rem' }}>Cargando categorías…</p>
            ) : (
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 72px 72px 56px',
                  padding: '10px 16px',
                  background: BLUE_LIGHT,
                  borderBottom: `1px solid ${BLUE_MID}`,
                }}>
                  <span style={{ color: BLUE, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría</span>
                  <span style={{ color: GREEN, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Activas</span>
                  <span style={{ color: TEXT_MUTED, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Cerradas</span>
                  <span style={{ color: TEXT_MUTED, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Total</span>
                </div>

                {categorias.map((cat, i) => (
                  <div
                    key={cat.id}
                    onClick={() => abrirCategoria(cat)}
                    onMouseEnter={() => setHovered(cat.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 72px 72px 56px',
                      alignItems: 'center', padding: '11px 16px',
                      cursor: 'pointer',
                      background: hovered === cat.id ? BG_HOVER : WHITE,
                      borderBottom: i < categorias.length - 1 ? `1px solid ${BORDER}` : 'none',
                      transition: 'background 0.12s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: hovered === cat.id ? BLUE_MID : BLUE_LIGHT,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'background 0.12s',
                      }}>
                        <Icon id={cat.id} />
                      </div>
                      <span style={{ color: TEXT, fontSize: '0.87rem', fontWeight: 600, lineHeight: 1.3 }}>
                        {cat.nombre}
                      </span>
                    </div>
                    <span style={{ color: GREEN, fontSize: '0.87rem', fontWeight: 700, textAlign: 'right' }}>
                      {cat.activas}
                    </span>
                    <span style={{ color: TEXT_MUTED, fontSize: '0.87rem', textAlign: 'right' }}>
                      {cat.cerradas}
                    </span>
                    <span style={{ color: TEXT_MUTED, fontSize: '0.87rem', fontWeight: 500, textAlign: 'right' }}>
                      {cat.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Category summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '24px 0 28px' }}>
              <StatBox label="Activas" value={selCat.activas} success />
              <StatBox label="Cerradas" value={selCat.cerradas} />
            </div>

            {loadingLics ? (
              <p style={{ color: TEXT_MUTED, textAlign: 'center', padding: 40, fontSize: '0.9rem' }}>
                Buscando licitaciones…
              </p>
            ) : licitaciones.length === 0 ? (
              <p style={{ color: TEXT_MUTED, textAlign: 'center', padding: 40, fontSize: '0.87rem' }}>
                No se encontraron licitaciones para esta categoría
              </p>
            ) : (
              <div>
                {licitaciones.map(lic => {
                  const dias    = diasRestantes(lic.fecha_cierre);
                  const urgente = dias != null && dias >= 0 && dias <= 3;
                  const vencida = dias != null && dias < 0;
                  return (
                    <div key={lic.id} style={{
                      padding: '14px 0',
                      borderBottom: `1px solid ${BORDER}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <p style={{ margin: 0, color: TEXT, fontWeight: 600, fontSize: '0.87rem', lineHeight: 1.4, flex: 1 }}>
                          {lic.nombre}
                        </p>
                        {dias != null && (
                          <span style={{
                            flexShrink: 0, fontSize: '0.68rem', fontWeight: 700,
                            padding: '3px 9px', borderRadius: 99,
                            background: vencida ? '#F3F4F6' : urgente ? '#FEF2F2' : GREEN_LIGHT,
                            color:      vencida ? TEXT_MUTED  : urgente ? '#DC2626' : GREEN,
                          }}>
                            {vencida ? 'Cerrada' : dias === 0 ? 'Hoy' : `${dias}d`}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '5px 0 0', color: TEXT_MUTED, fontSize: '0.75rem' }}>
                        {lic.organismo_nombre ?? '—'}
                        {lic.region ? ` · ${lic.region}` : ''}
                        {pesos(lic.monto) ? ` · ${pesos(lic.monto)}` : ''}
                      </p>
                      <p style={{ margin: '3px 0 0', color: '#9CA3AF', fontSize: '0.68rem', fontFamily: 'monospace' }}>
                        {lic.codigo}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
