'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

const NAVY   = '#001A4D';
const BLUE   = '#0047CC';
const WHITE  = '#FFFFFF';
const BGCARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';

type Scope = 'catalogo' | 'mixto' | 'nuevo';

interface Categoria {
  id: string;
  nombre: string;
  emoji: string;
  keywords: string[];
  count: number;
}

interface Usuario {
  empresa_nombre: string;
  rubros_json?: string[];
}

function normalizar(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim();
}

export default function SeleccionPage() {
  const router = useRouter();
  const { user_id } = useParams<{ user_id: string }>();

  const [usuario, setUsuario]       = useState<Usuario | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selCats, setSelCats]       = useState<Set<string>>(new Set());
  const [selRubros, setSelRubros]   = useState<Set<string>>(new Set());
  const [scope, setScope]           = useState<Scope>('mixto');
  const [cajon, setCajon]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [buscando, setBuscando]     = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/usuarios/${user_id}`).then(r => r.json()),
      fetch('/api/categorias-licitaciones').then(r => r.json()),
    ]).then(([u, c]) => {
      setUsuario(u ?? null);
      setCategorias(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, [user_id]);

  // Cajón: filter categories by text the user types
  const cajonNorm = normalizar(cajon);
  const catsFiltradas = cajonNorm.length < 2
    ? categorias
    : categorias.filter(cat =>
        cat.keywords.some(kw => kw.includes(cajonNorm) || cajonNorm.includes(kw)) ||
        normalizar(cat.nombre).includes(cajonNorm)
      );

  // Auto-select categories that match the cajón text
  useEffect(() => {
    if (cajonNorm.length < 2) return;
    const matches = categorias
      .filter(cat =>
        cat.keywords.some(kw => kw.includes(cajonNorm) || cajonNorm.includes(kw)) ||
        normalizar(cat.nombre).includes(cajonNorm)
      )
      .map(c => c.id);
    if (matches.length > 0) {
      setSelCats(prev => new Set([...prev, ...matches]));
    }
  }, [cajonNorm, categorias]);

  const toggleCat = (id: string) =>
    setSelCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleRubro = (r: string) =>
    setSelRubros(prev => { const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n; });

  const rubros = usuario?.rubros_json ?? [];

  // Build keywords based on scope
  const buildKeywords = useCallback((): string[] => {
    const catKw = categorias.filter(c => selCats.has(c.id)).flatMap(c => c.keywords);
    const rubroTerms = Array.from(selRubros);
    const allRubroKw = rubros; // user's registered rubros as keywords

    if (scope === 'catalogo') return [...new Set([...allRubroKw, ...rubroTerms])];
    if (scope === 'nuevo')    return [...new Set(catKw)];
    return [...new Set([...allRubroKw, ...rubroTerms, ...catKw])]; // mixto
  }, [scope, selCats, selRubros, categorias, rubros]);

  const totalSel = scope === 'catalogo'
    ? rubros.length + selRubros.size
    : selCats.size + (scope === 'mixto' ? rubros.length + selRubros.size : 0);

  const puedeAvanzar = scope === 'catalogo'
    ? rubros.length > 0
    : selCats.size > 0;

  const buscar = useCallback(async () => {
    if (!puedeAvanzar) { setError('Selecciona al menos una categoría'); return; }
    setBuscando(true); setError('');
    const keywords = buildKeywords();
    if (!keywords.length) { setError('Sin palabras clave para buscar'); setBuscando(false); return; }

    const res = await fetch(`/api/clientes/${user_id}/relevancia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords }),
    });
    const json = await res.json();
    setBuscando(false);
    if (json.error) { setError(json.error); return; }
    router.push(`/app/dashboard/${user_id}`);
  }, [puedeAvanzar, buildKeywords, user_id, router]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: NAVY, display: 'flex',
      alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Cargando…</p>
    </div>
  );

  const SCOPES: { id: Scope; label: string; desc: string }[] = [
    { id: 'catalogo', label: 'Mi catálogo',         desc: 'Solo productos que ya ofrece esta empresa' },
    { id: 'mixto',    label: 'Mi catálogo + nuevos', desc: 'Sus productos más categorías adicionales' },
    { id: 'nuevo',    label: 'Productos nuevos',     desc: 'Categorías que aún no están en su cartera' },
  ];

  const showCajon   = scope === 'nuevo' || scope === 'mixto';
  const showRubros  = (scope === 'catalogo' || scope === 'mixto') && rubros.length > 0;
  const showCatGrid = scope !== 'catalogo';

  return (
    <div style={{
      minHeight: '100vh', background: NAVY,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 16px 100px',
    }}>
      <div style={{ width: '100%', maxWidth: 520, paddingTop: 40 }}>

        {/* Back + company name */}
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem', cursor: 'pointer', padding: 0, marginBottom: 18 }}>
          ← Volver
        </button>

        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', margin: '0 0 4px' }}>
          {usuario?.empresa_nombre ?? ''}
        </p>
        <h1 style={{ color: WHITE, fontSize: '1.25rem', fontWeight: 800, margin: '0 0 20px', lineHeight: 1.25 }}>
          ¿Qué oportunidades<br/>quieres buscar?
        </h1>

        {/* Scope selector */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 2px' }}>
            Alcance de búsqueda
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SCOPES.map(s => (
              <button key={s.id} onClick={() => setScope(s.id)}
                style={{
                  background: scope === s.id ? 'rgba(0,71,204,0.3)' : BGCARD,
                  border: `1.5px solid ${scope === s.id ? BLUE : BORDER}`,
                  borderRadius: 12, padding: '11px 14px',
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${scope === s.id ? BLUE : 'rgba(255,255,255,0.3)'}`,
                  background: scope === s.id ? BLUE : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {scope === s.id && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: WHITE }} />
                  )}
                </div>
                <div>
                  <p style={{ margin: 0, color: WHITE, fontWeight: 700, fontSize: '0.85rem' }}>{s.label}</p>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.73rem' }}>{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* User rubros chips */}
        {showRubros && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 2px' }}>
              Productos de {usuario?.empresa_nombre}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {rubros.map(r => (
                <button key={r} onClick={() => toggleRubro(r)}
                  style={{
                    height: 32, borderRadius: 99, padding: '0 13px',
                    border: `1.5px solid ${selRubros.has(r) ? BLUE : 'rgba(255,255,255,0.2)'}`,
                    background: selRubros.has(r) ? BLUE : 'rgba(255,255,255,0.06)',
                    color: selRubros.has(r) ? WHITE : 'rgba(255,255,255,0.7)',
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  }}>
                  {scope === 'mixto' && selRubros.has(r) ? '✓ ' : ''}{r}
                </button>
              ))}
              {scope === 'catalogo' && rubros.length > 0 && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', margin: '4px 0 0',
                  width: '100%' }}>
                  Se buscarán licitaciones para todos los productos de esta empresa.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Cajón: free text → category mapper */}
        {showCajon && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 2px' }}>
              ¿Buscas algo específico? Escribe un producto
            </p>
            <div style={{ position: 'relative' }}>
              <input
                value={cajon}
                onChange={e => setCajon(e.target.value)}
                placeholder="Ej: escobas, tóner, poleras, catering…"
                style={{
                  width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 12,
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)', color: WHITE,
                  fontSize: '0.9rem', padding: '0 16px', outline: 'none',
                }}
              />
              {cajon && (
                <button onClick={() => setCajon('')}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer', fontSize: '1rem', padding: 0 }}>
                  ×
                </button>
              )}
            </div>
            {cajon.length >= 2 && catsFiltradas.length === 0 && (
              <p style={{ color: 'rgba(255,200,0,0.6)', fontSize: '0.75rem', margin: '6px 0 0 2px' }}>
                Sin categorías para "{cajon}" — intenta con otra palabra
              </p>
            )}
            {cajon.length >= 2 && catsFiltradas.length > 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.73rem', margin: '6px 0 0 2px' }}>
                Mostrando categorías relacionadas con "{cajon}"
              </p>
            )}
          </div>
        )}

        {/* Category grid */}
        {showCatGrid && (
          <div style={{ marginBottom: 16 }}>
            {!showCajon && (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 2px' }}>
                Categorías disponibles en el portal
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {catsFiltradas.map(cat => {
                const sel = selCats.has(cat.id);
                return (
                  <button key={cat.id} onClick={() => toggleCat(cat.id)}
                    style={{
                      background: sel ? 'rgba(0,71,204,0.35)' : BGCARD,
                      border: `1.5px solid ${sel ? BLUE : BORDER}`,
                      borderRadius: 14, padding: '14px 12px',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '1.25rem' }}>{cat.emoji}</span>
                      {sel && (
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: BLUE,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6rem', color: WHITE, fontWeight: 900, flexShrink: 0 }}>✓</span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 2px', color: sel ? WHITE : 'rgba(255,255,255,0.8)',
                      fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.3 }}>
                      {cat.nombre}
                    </p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem' }}>
                      {cat.count} licitaciones
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: '#F87171', fontSize: '0.82rem', textAlign: 'center',
            margin: '0 0 10px', fontWeight: 600 }}>
            {error}
          </p>
        )}
      </div>

      {/* Sticky bottom button */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: `linear-gradient(to top, ${NAVY} 60%, transparent)`,
        padding: '18px 16px 28px',
        display: 'flex', justifyContent: 'center',
      }}>
        <button onClick={buscar} disabled={buscando || !puedeAvanzar}
          style={{
            width: '100%', maxWidth: 520, height: 52, borderRadius: 14, border: 'none',
            background: puedeAvanzar ? BLUE : 'rgba(255,255,255,0.1)',
            color: puedeAvanzar ? WHITE : 'rgba(255,255,255,0.3)',
            fontSize: '0.95rem', fontWeight: 700,
            cursor: puedeAvanzar ? 'pointer' : 'default',
          }}>
          {buscando
            ? 'Buscando oportunidades…'
            : puedeAvanzar
              ? `Ver oportunidades`
              : scope === 'catalogo'
                ? 'Esta empresa no tiene rubros registrados'
                : 'Selecciona al menos una categoría'}
        </button>
      </div>
    </div>
  );
}
