'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const NAVY  = '#001A4D';
const BLUE  = '#0047CC';
const WHITE = '#FFFFFF';
const BORDER = 'rgba(255,255,255,0.10)';
const BG     = 'rgba(255,255,255,0.06)';

interface Categoria {
  id: string;
  nombre: string;
  emoji: string;
  keywords: string[];
  count: number;
}

interface Licitacion {
  id: string;
  codigo: string;
  nombre: string;
  organismo_nombre: string | null;
  monto: number | null;
  region: string | null;
  fecha_cierre: string | null;
  estado: string | null;
}

function diasRestantes(fecha: string | null): number | null {
  if (!fecha) return null;
  const diff = new Date(fecha).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function pesos(n: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function CategoriasBrowsePage() {
  const router = useRouter();
  const [categorias, setCategorias]     = useState<Categoria[]>([]);
  const [selCat, setSelCat]             = useState<Categoria | null>(null);
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [loadingCats, setLoadingCats]   = useState(true);
  const [loadingLics, setLoadingLics]   = useState(false);

  useEffect(() => {
    fetch('/api/categorias-licitaciones')
      .then(r => r.json())
      .then(d => { setCategorias(Array.isArray(d) ? d : []); setLoadingCats(false); });
  }, []);

  const abrirCategoria = async (cat: Categoria) => {
    setSelCat(cat);
    setLicitaciones([]);
    setLoadingLics(true);
    const params = new URLSearchParams({ keywords: cat.keywords.join(','), limite: '60' });
    const d = await fetch(`/api/licitaciones-categoria?${params}`).then(r => r.json());
    setLicitaciones(Array.isArray(d) ? d : []);
    setLoadingLics(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: NAVY,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 16px 60px',
    }}>
      <div style={{ width: '100%', maxWidth: 520, paddingTop: 40 }}>

        {/* Header */}
        <button onClick={() => selCat ? setSelCat(null) : router.back()}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem', cursor: 'pointer', padding: 0, marginBottom: 20 }}>
          ← {selCat ? 'Categorías' : 'Volver'}
        </button>

        {!selCat ? (
          <>
            <h1 style={{ color: WHITE, fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px' }}>
              Explorar por categoría
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0 0 20px' }}>
              Selecciona una categoría para ver las licitaciones disponibles
            </p>

            {loadingCats ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40 }}>Cargando…</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {categorias.map(cat => (
                  <button key={cat.id} onClick={() => abrirCategoria(cat)}
                    style={{
                      background: BG, border: `1.5px solid ${BORDER}`,
                      borderRadius: 14, padding: '16px 14px',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: 6 }}>{cat.emoji}</span>
                    <p style={{ margin: '0 0 4px', color: WHITE, fontSize: '0.83rem', fontWeight: 700, lineHeight: 1.3 }}>
                      {cat.nombre}
                    </p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>
                      {cat.count} licitaciones
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: '1.6rem' }}>{selCat.emoji}</span>
              <div>
                <h1 style={{ color: WHITE, fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  {selCat.nombre}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: 0 }}>
                  {loadingLics ? 'Cargando…' : `${licitaciones.length} licitaciones activas`}
                </p>
              </div>
            </div>

            {loadingLics ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40 }}>
                Buscando licitaciones…
              </p>
            ) : licitaciones.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: 40, fontSize: '0.85rem' }}>
                No se encontraron licitaciones para esta categoría
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {licitaciones.map(lic => {
                  const dias = diasRestantes(lic.fecha_cierre);
                  const urgente = dias != null && dias <= 3;
                  const vencida = dias != null && dias < 0;
                  return (
                    <div key={lic.id} style={{
                      background: BG, borderRadius: 14,
                      border: `1px solid ${urgente && !vencida ? 'rgba(251,191,36,0.4)' : BORDER}`,
                      padding: '13px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <p style={{ margin: 0, color: WHITE, fontWeight: 700, fontSize: '0.87rem',
                          lineHeight: 1.35, flex: 1 }}>
                          {lic.nombre}
                        </p>
                        {dias != null && !vencida && (
                          <span style={{
                            flexShrink: 0, fontSize: '0.68rem', fontWeight: 700,
                            padding: '3px 8px', borderRadius: 99,
                            background: urgente ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.08)',
                            color: urgente ? '#FCD34D' : 'rgba(255,255,255,0.45)',
                          }}>
                            {dias === 0 ? 'Hoy' : `${dias}d`}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                        {lic.organismo_nombre ?? '—'}
                        {lic.region ? ` · ${lic.region}` : ''}
                        {pesos(lic.monto) ? ` · ${pesos(lic.monto)}` : ''}
                      </p>
                      <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem',
                        fontFamily: 'monospace' }}>
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
