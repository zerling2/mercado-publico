'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const BLUE        = '#0047CC';
const BLUE_DARK   = '#001A4D';
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
  relevante?: boolean;
}
interface Empresa { id: string; empresa_nombre: string; rut?: string; }
interface EmpCatLink { empresa_id: string; categoria_id: string; }

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
function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim();
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
  const router = useRouter();

  const [totals, setTotals]             = useState<Totals | null>(null);
  const [categorias, setCategorias]     = useState<Categoria[]>([]);
  const [empCatLinks, setEmpCatLinks]   = useState<EmpCatLink[]>([]);
  const [selCat, setSelCat]             = useState<Categoria | null>(null);
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [loadingCats, setLoadingCats]   = useState(true);
  const [loadingLics, setLoadingLics]   = useState(false);
  const [hovered, setHovered]           = useState<string | null>(null);
  const [empresas, setEmpresas]         = useState<Empresa[]>([]);
  const [pickerCodigo, setPickerCodigo] = useState<string | null>(null);

  // Filtro multi-empresa
  const [selEmpresas, setSelEmpresas]   = useState<Set<string>>(new Set());
  const [filtroOpen, setFiltroOpen]     = useState(false);
  const [filtroQuery, setFiltroQuery]   = useState('');

  useEffect(() => {
    const token = localStorage.getItem('asesor_token') ?? '';
    const authHeader = { Authorization: `Bearer ${token}` };

    fetch('/api/usuarios', { headers: authHeader })
      .then(r => r.json())
      .then(d => setEmpresas(Array.isArray(d) ? d : []));

    fetch('/api/categorias-licitaciones')
      .then(r => r.json())
      .then(d => {
        setTotals(d.totals ?? null);
        setCategorias(Array.isArray(d.categorias) ? d.categorias : []);
        setLoadingCats(false);
      });

    fetch('/api/asesor/empresas-por-categoria', { headers: authHeader })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setEmpCatLinks(d); });
  }, []);

  // Map empresa_id → Set<categoria_id>
  const empresaCatMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const { empresa_id, categoria_id } of empCatLinks) {
      if (!m.has(empresa_id)) m.set(empresa_id, new Set());
      m.get(empresa_id)!.add(categoria_id);
    }
    return m;
  }, [empCatLinks]);

  const filtroActivo = selEmpresas.size > 0;

  // Categorías visibles: si hay filtro, solo las que matchean al menos una empresa seleccionada
  const categoriasVisible = useMemo(() => {
    if (!filtroActivo) return categorias;
    return categorias.filter(cat =>
      [...selEmpresas].some(eid => empresaCatMap.get(eid)?.has(cat.id))
    );
  }, [categorias, selEmpresas, empresaCatMap, filtroActivo]);

  // Cuenta de empresas (seleccionadas o todas) para una categoría
  const nEmpresasParaCat = (catId: string): number => {
    if (filtroActivo) {
      return [...selEmpresas].filter(eid => empresaCatMap.get(eid)?.has(catId)).length;
    }
    const uniq = new Set(empCatLinks.filter(l => l.categoria_id === catId).map(l => l.empresa_id));
    return uniq.size;
  };

  // Empresas filtradas por búsqueda en el panel
  const empresasFiltradas = useMemo(() => {
    const q = normalizar(filtroQuery);
    if (!q) return empresas;
    return empresas.filter(e =>
      normalizar(e.empresa_nombre).includes(q) ||
      (e.rut ?? '').replace(/[.\-]/g, '').includes(q.replace(/[.\-]/g, ''))
    );
  }, [empresas, filtroQuery]);

  const toggleEmpresa = (id: string) =>
    setSelEmpresas(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const limpiarFiltro = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelEmpresas(new Set());
  };

  // Label del chip de filtro
  const filtroLabel = () => {
    if (selEmpresas.size === 0) return 'Todas las empresas';
    if (selEmpresas.size === 1) {
      const emp = empresas.find(e => selEmpresas.has(e.id));
      const name = emp?.empresa_nombre ?? '';
      return name.length > 22 ? name.slice(0, 22) + '…' : name;
    }
    return `${selEmpresas.size} empresas`;
  };

  const abrirCategoria = async (cat: Categoria) => {
    setSelCat(cat); setLicitaciones([]); setLoadingLics(true);
    const params = cat.id === 'otros'
      ? new URLSearchParams({ otros: 'true', limite: '500' })
      : new URLSearchParams({ keywords: cat.keywords.join(','), limite: '200' });
    if (selEmpresas.size > 0) params.set('empresa_ids', [...selEmpresas].join(','));
    const d = await fetch(`/api/licitaciones-categoria?${params}`).then(r => r.json());
    const result = (Array.isArray(d) ? d : []).filter(
      (l: Licitacion) => !l.fecha_cierre || new Date(l.fecha_cierre) > new Date()
    );
    setLicitaciones(result); setLoadingLics(false);
  };

  const abrirLicitacion = (codigo: string) => {
    if (empresas.length === 1) {
      router.push(`/app/cotizacion/${empresas[0].id}/${encodeURIComponent(codigo)}`);
    } else if (empresas.length > 1) {
      setPickerCodigo(codigo);
    } else {
      router.push('/app/asesor/empresa');
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
      <div style={{ paddingTop: 48, paddingBottom: 56 }}>

        {!selCat ? (
          <>
            {/* Stats + filtro */}
            <div style={{ padding: '12px 16px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Stats chips */}
              {totals && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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

              {/* Filtro empresa */}
              {empresas.length > 0 && (
                <button
                  onClick={() => setFiltroOpen(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    height: 34, borderRadius: 99,
                    padding: '0 12px 0 10px',
                    border: `1.5px solid ${filtroActivo ? BLUE_DARK : BORDER}`,
                    background: filtroActivo ? BLUE_DARK : WHITE,
                    color: filtroActivo ? WHITE : TEXT_MUTED,
                    fontSize: '0.76rem', fontWeight: filtroActivo ? 700 : 500,
                    cursor: 'pointer', fontFamily: FONT,
                    alignSelf: 'flex-start',
                  }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke={filtroActivo ? WHITE : TEXT_MUTED}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {filtroLabel()}
                  {filtroActivo && (
                    <span
                      onClick={limpiarFiltro}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 16, height: 16, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.25)',
                        fontSize: '0.7rem', lineHeight: 1, cursor: 'pointer',
                      }}>
                      ×
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Category table */}
            {loadingCats ? (
              <p style={{ color: TEXT_MUTED, textAlign: 'center', padding: 40, fontSize: '0.85rem' }}>
                Cargando…
              </p>
            ) : categoriasVisible.length === 0 ? (
              <p style={{ color: TEXT_MUTED, textAlign: 'center', padding: 40, fontSize: '0.85rem' }}>
                Las empresas seleccionadas no tienen categorías asignadas aún
              </p>
            ) : (
              <div style={{ margin: '0 16px', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 52px 52px',
                  padding: '7px 12px',
                  background: BLUE_LIGHT, borderBottom: `1px solid ${BLUE_MID}`,
                }}>
                  <span style={{ color: BLUE, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Categoría</span>
                  <span style={{ color: GREEN, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Licit.</span>
                  <span style={{ color: BLUE, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Empr.</span>
                </div>

                {categoriasVisible.map((cat, i) => {
                  const nEmp = nEmpresasParaCat(cat.id);
                  return (
                    <div key={cat.id}
                      onClick={() => abrirCategoria(cat)}
                      onMouseEnter={() => setHovered(cat.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 52px 52px',
                        alignItems: 'center', padding: '7px 12px',
                        cursor: 'pointer',
                        background: hovered === cat.id ? BG_HOVER : WHITE,
                        borderBottom: i < categoriasVisible.length - 1 ? `1px solid ${BORDER}` : 'none',
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
                      <span style={{ color: GREEN, fontSize: '0.82rem', fontWeight: 700, textAlign: 'right' }}>
                        {cat.activas}
                      </span>
                      <span style={{
                        fontSize: '0.82rem', fontWeight: 700, textAlign: 'right',
                        color: nEmp > 0 ? BLUE_DARK : '#D1D5DB',
                      }}>
                        {nEmp > 0 ? nEmp : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Encabezado: conteo + empresas con match */}
            <div style={{ padding: '10px 16px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loadingLics ? (
                <p style={{ color: TEXT_MUTED, fontSize: '0.82rem', margin: 0 }}>Buscando…</p>
              ) : (
                <span style={{ background: GREEN_LIGHT, borderRadius: 99, padding: '4px 11px',
                  fontSize: '0.76rem', color: GREEN, fontWeight: 600, alignSelf: 'flex-start' }}>
                  {licitaciones.length} activas
                </span>
              )}

              {/* Banner de empresas con match — siempre visible si filtro activo */}
              {!loadingLics && filtroActivo && selCat && (() => {
                const matching = [...selEmpresas]
                  .filter(eid => empresaCatMap.get(eid)?.has(selCat.id))
                  .map(eid => empresas.find(e => e.id === eid)?.empresa_nombre)
                  .filter((n): n is string => !!n);
                if (!matching.length) return null;
                return (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 7,
                    background: GREEN_LIGHT, borderRadius: 10, padding: '8px 11px',
                  }}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                      background: GREEN, flexShrink: 0, marginTop: 3 }} />
                    <span style={{ fontSize: '0.76rem', color: '#065F46', lineHeight: 1.45 }}>
                      <strong>{matching.join(', ')}</strong>
                      {matching.length === 1 ? ' participa' : ' participan'} en esta categoría
                    </span>
                  </div>
                );
              })()}
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
              <div style={{ margin: '0 16px', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                {licitaciones.map((lic, i) => {
                  const dias    = diasRestantes(lic.fecha_cierre);
                  const cerrada = dias != null && dias < 0;
                  const urgente = dias != null && dias >= 0 && dias <= 3;
                  return (
                    <div
                      key={lic.id}
                      onClick={() => abrirLicitacion(lic.codigo)}
                      onMouseEnter={() => setHovered(lic.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        padding: '11px 12px',
                        borderBottom: i < licitaciones.length - 1 ? `1px solid ${BORDER}` : 'none',
                        cursor: 'pointer',
                        background: hovered === lic.id ? BG_HOVER : WHITE,
                        transition: 'background 0.1s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <p style={{ margin: 0, color: TEXT, fontWeight: 600, fontSize: '0.83rem', lineHeight: 1.4, flex: 1 }}>
                          {lic.nombre}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                          {dias != null && (
                            <span style={{
                              fontSize: '0.66rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                              background: cerrada ? '#F3F4F6' : urgente ? '#FEF2F2' : GREEN_LIGHT,
                              color:      cerrada ? TEXT_MUTED  : urgente ? '#DC2626' : GREEN,
                            }}>
                              {cerrada ? 'Cerrada' : dias === 0 ? 'Hoy' : `${dias}d`}
                            </span>
                          )}
                          <ChevronRight />
                        </div>
                      </div>
                      <p style={{ margin: '3px 0 0', color: TEXT_MUTED, fontSize: '0.72rem', lineHeight: 1.4 }}>
                        {lic.organismo_nombre ?? '—'}
                        {lic.region   ? ` · ${lic.region}`   : ''}
                        {pesos(lic.monto) ? ` · ${pesos(lic.monto)}` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Panel filtro empresas ── */}
      {filtroOpen && (
        <div
          onClick={() => setFiltroOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: WHITE, width: '100%', borderRadius: '16px 16px 0 0', padding: '0 0 36px', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{ padding: '18px 16px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: TEXT }}>
                  Filtrar por empresa
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {selEmpresas.size > 0 && (
                    <button
                      onClick={() => setSelEmpresas(new Set())}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, fontSize: '0.76rem', fontFamily: FONT, padding: 0 }}>
                      Limpiar
                    </button>
                  )}
                  <button
                    onClick={() => setFiltroOpen(false)}
                    style={{ background: BLUE_DARK, border: 'none', borderRadius: 8, cursor: 'pointer', color: WHITE, fontSize: '0.82rem', fontWeight: 700, fontFamily: FONT, padding: '6px 14px' }}>
                    Listo
                  </button>
                </div>
              </div>

              {/* Búsqueda */}
              <div style={{ position: 'relative' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  autoFocus
                  value={filtroQuery}
                  onChange={e => setFiltroQuery(e.target.value)}
                  placeholder="Nombre o RUT…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    height: 38, borderRadius: 10, border: `1.5px solid ${BORDER}`,
                    padding: '0 12px 0 32px', fontSize: '0.88rem',
                    fontFamily: FONT, color: TEXT, outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Lista scrollable */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {empresasFiltradas.length === 0 ? (
                <p style={{ color: TEXT_MUTED, textAlign: 'center', padding: '24px 16px', fontSize: '0.84rem' }}>
                  Sin resultados
                </p>
              ) : (
                empresasFiltradas.map(emp => {
                  const sel = selEmpresas.has(emp.id);
                  const catCount = empresaCatMap.get(emp.id)?.size ?? 0;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleEmpresa(emp.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 16px',
                        borderBottom: `1px solid ${BORDER}`,
                        cursor: 'pointer',
                        background: sel ? BLUE_LIGHT : WHITE,
                        transition: 'background 0.1s',
                      }}>
                      {/* Checkbox */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${sel ? BLUE_DARK : BORDER}`,
                        background: sel ? BLUE_DARK : WHITE,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.1s',
                      }}>
                        {sel && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                            stroke={WHITE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: TEXT, fontWeight: sel ? 700 : 500, fontSize: '0.86rem',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {emp.empresa_nombre}
                        </p>
                        <p style={{ margin: '1px 0 0', color: TEXT_MUTED, fontSize: '0.71rem' }}>
                          {emp.rut ?? ''}
                          {catCount > 0 ? ` · ${catCount} categoría${catCount > 1 ? 's' : ''}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Picker cotización ── */}
      {pickerCodigo && (
        <div onClick={() => setPickerCodigo(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: WHITE, width: '100%', borderRadius: '16px 16px 0 0', padding: '20px 16px 36px', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: 700, color: TEXT }}>
              ¿Para qué cliente?
            </p>
            <p style={{ margin: '0 0 16px', fontSize: '0.75rem', color: TEXT_MUTED }}>
              Se abrirá la calculadora de cotización
            </p>
            {empresas.map(emp => (
              <button key={emp.id}
                onClick={() => { setPickerCodigo(null); router.push(`/app/cotizacion/${emp.id}/${encodeURIComponent(pickerCodigo)}`); }}
                style={{ display: 'block', width: '100%', padding: '11px 14px', background: BLUE_LIGHT, border: 'none', borderRadius: 10, fontSize: '0.84rem', fontWeight: 600, color: BLUE, cursor: 'pointer', marginBottom: 8, textAlign: 'left', fontFamily: FONT }}>
                {emp.empresa_nombre}
              </button>
            ))}
            <button onClick={() => setPickerCodigo(null)}
              style={{ display: 'block', width: '100%', padding: '11px 14px', background: 'none', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: '0.82rem', color: TEXT_MUTED, cursor: 'pointer', marginTop: 4, fontFamily: FONT }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Fixed footer ── */}
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
