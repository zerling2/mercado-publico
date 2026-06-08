'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BLUE        = '#0047CC';
const BLUE_LIGHT  = '#EEF3FF';
const BLUE_MID    = '#DBEAFE';
const WHITE       = '#FFFFFF';
const TEXT        = '#111827';
const TEXT_MUTED  = '#6B7280';
const BORDER      = '#E5E7EB';
const BG_HOVER    = '#F5F8FF';
const GREEN       = '#059669';
const GREEN_LIGHT = '#D1FAE5';
const FONT        = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

interface Totals    { total: number; activas: number; cerradas: number; }
interface Categoria { id: string; nombre: string; keywords: string[]; count: number; activas: number; cerradas: number; }
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

function Icon({ id, size = 16 }: { id: string; size?: number }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: BLUE, strokeWidth: 1.8,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (id) {
    case 'impresion':     return <svg {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
    case 'vestuario':     return <svg {...p}><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>;
    case 'publicidad':    return <svg {...p}><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>;
    case 'reconocimientos': return <svg {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;
    case 'oficina':       return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
    case 'alimentacion':  return <svg {...p}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
    case 'embalaje':      return <svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case 'limpieza':      return <svg {...p}><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>;
    case 'tecnologia':    return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
    case 'mobiliario':    return <svg {...p}><rect x="3" y="12" width="18" height="8" rx="2"/><path d="M5 12V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/><line x1="5" y1="20" x2="5" y2="22"/><line x1="19" y1="20" x2="19" y2="22"/></svg>;
    case 'construccion':  return <svg {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
    case 'salud':         return <svg {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
    case 'transporte':    return <svg {...p}><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
    case 'capacitacion':  return <svg {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
    case 'eventos':       return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'audiovisual':   return <svg {...p}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
    default:              return <svg {...p}><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill={BLUE}/></svg>;
  }
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

export default function CategoriasBrowsePage() {
  const router  = useRouter();
  const [totals, setTotals]           = useState<Totals | null>(null);
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [selCat, setSelCat]           = useState<Categoria | null>(null);
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingLics, setLoadingLics] = useState(false);
  const [hovered, setHovered]         = useState<string | null>(null);
  const [userId, setUserId]           = useState('');

  useEffect(() => {
    const token = localStorage.getItem('asesor_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.sub ?? '');
      } catch {}
    }
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
    const params = cat.id === 'otros'
      ? new URLSearchParams({ otros: 'true', limite: '200' })
      : new URLSearchParams({ keywords: cat.keywords.join(','), limite: '200' });
    const d = await fetch(`/api/licitaciones-categoria?${params}`).then(r => r.json());
    const now = new Date();
    const activas = (Array.isArray(d) ? d : []).filter((l: Licitacion) =>
      !l.fecha_cierre || new Date(l.fecha_cierre) > now
    );
    setLicitaciones(activas);
    setLoadingLics(false);
  };

  const abrirLicitacion = (codigo: string) => {
    if (userId) {
      router.push(`/app/cotizacion/${userId}/${encodeURIComponent(codigo)}`);
    } else {
      router.push('/app/dashboard');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: WHITE, fontFamily: FONT }}>

      {/* ── Fixed top bar ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 48,
        background: WHITE, borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', padding: '0 16px',
        zIndex: 100, gap: 10,
      }}>
        <button onClick={() => selCat ? setSelCat(null) : router.back()} style={{
          background: 'none', border: 'none', color: BLUE,
          fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
          padding: '6px 0', display: 'flex', alignItems: 'center', gap: 3,
          fontFamily: FONT, flexShrink: 0,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={BLUE}
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {selCat ? 'Categorías' : 'Volver'}
        </button>
        <span style={{ color: BORDER }}>|</span>
        <span style={{ color: TEXT, fontSize: '0.82rem', fontWeight: 700,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selCat ? selCat.nombre : 'Explorar por categoría'}
        </span>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ paddingTop: 48, paddingBottom: 56, padding: '48px 0 56px' }}>

        {!selCat ? (
          <>
            {/* Stats chips */}
            {totals && (
              <div style={{ display: 'flex', gap: 6, padding: '14px 16px 10px', flexWrap: 'wrap' }}>
                <span style={{ background: '#F3F4F6', borderRadius: 99, padding: '4px 11px',
                  fontSize: '0.76rem', color: TEXT, fontWeight: 600 }}>
                  {totals.total.toLocaleString()} total
                </span>
                <span style={{ background: GREEN_LIGHT, borderRadius: 99, padding: '4px 11px',
                  fontSize: '0.76rem', color: GREEN, fontWeight: 600 }}>
                  {totals.activas.toLocaleString()} activas
                </span>
                <span style={{ background: '#F3F4F6', borderRadius: 99, padding: '4px 11px',
                  fontSize: '0.76rem', color: TEXT_MUTED, fontWeight: 500 }}>
                  {totals.cerradas.toLocaleString()} cerradas
                </span>
              </div>
            )}

            {/* Category table */}
            {loadingCats ? (
              <p style={{ color: TEXT_MUTED, textAlign: 'center', padding: 40, fontSize: '0.85rem' }}>
                Cargando…
              </p>
            ) : (
              <div style={{ margin: '0 16px', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Column header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 56px 56px 44px',
                  padding: '7px 12px',
                  background: BLUE_LIGHT, borderBottom: `1px solid ${BLUE_MID}`,
                }}>
                  <span style={{ color: BLUE, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Categoría</span>
                  <span style={{ color: GREEN, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Activas</span>
                  <span style={{ color: TEXT_MUTED, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Cerrad.</span>
                  <span style={{ color: TEXT_MUTED, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Total</span>
                </div>

                {categorias.map((cat, i) => (
                  <div key={cat.id}
                    onClick={() => abrirCategoria(cat)}
                    onMouseEnter={() => setHovered(cat.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 56px 56px 44px',
                      alignItems: 'center', padding: '7px 12px',
                      cursor: 'pointer',
                      background: hovered === cat.id ? BG_HOVER : WHITE,
                      borderBottom: i < categorias.length - 1 ? `1px solid ${BORDER}` : 'none',
                      transition: 'background 0.1s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                        background: hovered === cat.id ? BLUE_MID : BLUE_LIGHT,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.1s',
                      }}>
                        <Icon id={cat.id} size={15} />
                      </div>
                      <span style={{ color: TEXT, fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.25 }}>
                        {cat.nombre}
                      </span>
                    </div>
                    <span style={{ color: GREEN, fontSize: '0.8rem', fontWeight: 700, textAlign: 'right' }}>
                      {cat.activas}
                    </span>
                    <span style={{ color: TEXT_MUTED, fontSize: '0.78rem', textAlign: 'right' }}>
                      {cat.cerradas}
                    </span>
                    <span style={{ color: TEXT_MUTED, fontSize: '0.78rem', fontWeight: 500, textAlign: 'right' }}>
                      {cat.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Detail: only active licitaciones */}
            <div style={{ padding: '12px 16px 6px' }}>
              {loadingLics ? (
                <p style={{ color: TEXT_MUTED, fontSize: '0.82rem', margin: 0 }}>Buscando…</p>
              ) : (
                <span style={{ background: GREEN_LIGHT, borderRadius: 99, padding: '4px 11px',
                  fontSize: '0.76rem', color: GREEN, fontWeight: 600 }}>
                  {licitaciones.length} activas
                </span>
              )}
            </div>

            {loadingLics ? (
              <p style={{ color: TEXT_MUTED, textAlign: 'center', padding: 40, fontSize: '0.85rem' }}>
                Buscando licitaciones…
              </p>
            ) : licitaciones.length === 0 ? (
              <p style={{ color: TEXT_MUTED, textAlign: 'center', padding: 40, fontSize: '0.85rem' }}>
                No hay licitaciones activas en esta categoría
              </p>
            ) : (
              <div style={{ margin: '0 16px' }}>
                {licitaciones.map((lic, i) => {
                  const dias    = diasRestantes(lic.fecha_cierre);
                  const urgente = dias != null && dias >= 0 && dias <= 3;
                  return (
                    <div key={lic.id}
                      onClick={() => abrirLicitacion(lic.codigo)}
                      onMouseEnter={() => setHovered(lic.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        padding: '11px 0',
                        borderBottom: i < licitaciones.length - 1 ? `1px solid ${BORDER}` : 'none',
                        cursor: 'pointer',
                        background: hovered === lic.id ? BG_HOVER : 'transparent',
                        borderRadius: 6,
                        transition: 'background 0.1s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <p style={{ margin: 0, color: TEXT, fontWeight: 600, fontSize: '0.83rem', lineHeight: 1.4, flex: 1 }}>
                          {lic.nombre}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {dias != null && (
                            <span style={{
                              fontSize: '0.66rem', fontWeight: 700,
                              padding: '2px 8px', borderRadius: 99,
                              background: urgente ? '#FEF2F2' : GREEN_LIGHT,
                              color:      urgente ? '#DC2626' : GREEN,
                            }}>
                              {dias === 0 ? 'Hoy' : `${dias}d`}
                            </span>
                          )}
                          <ChevronRight />
                        </div>
                      </div>
                      <p style={{ margin: '3px 0 0', color: TEXT_MUTED, fontSize: '0.72rem' }}>
                        {lic.organismo_nombre ?? '—'}
                        {lic.region ? ` · ${lic.region}` : ''}
                        {pesos(lic.monto) ? ` · ${pesos(lic.monto)}` : ''}
                      </p>
                      <p style={{ margin: '2px 0 0', color: '#9CA3AF', fontSize: '0.65rem', fontFamily: 'monospace' }}>
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

      {/* ── Fixed footer bar ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 44,
        background: WHITE, borderTop: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, gap: 6,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span style={{ color: TEXT_MUTED, fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.02em' }}>
          Mercado Público · Compras Ágiles
        </span>
      </div>
    </div>
  );
}
