'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

const NAVY   = '#001A4D';
const BLUE   = '#0047CC';
const BLUE2  = '#003DA5';
const WHITE  = '#FFFFFF';
const BG     = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';

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

export default function SeleccionPage() {
  const router = useRouter();
  const { user_id } = useParams<{ user_id: string }>();

  const [usuario, setUsuario]       = useState<Usuario | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selCats, setSelCats]       = useState<Set<string>>(new Set());
  const [selRubros, setSelRubros]   = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(true);
  const [buscando, setBuscando]     = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    async function init() {
      const [uRes, cRes] = await Promise.all([
        fetch(`/api/usuarios/${user_id}`),
        fetch('/api/categorias-licitaciones'),
      ]);
      const u = await uRes.json();
      const c = await cRes.json();
      setUsuario(u ?? null);
      setCategorias(Array.isArray(c) ? c : []);
      setLoading(false);
    }
    init();
  }, [user_id]);

  const toggleCat = (id: string) => {
    setSelCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleRubro = (r: string) => {
    setSelRubros(prev => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next;
    });
  };

  const totalSeleccionado = selCats.size + selRubros.size;

  const buscar = useCallback(async () => {
    if (totalSeleccionado === 0) { setError('Selecciona al menos una categoría'); return; }
    setBuscando(true);
    setError('');

    // Collect all keywords from selected categories
    const catKeywords = categorias
      .filter(c => selCats.has(c.id))
      .flatMap(c => c.keywords);

    const rubroTerms = Array.from(selRubros);
    const keywords = [...new Set([...catKeywords, ...rubroTerms])];

    const res = await fetch(`/api/clientes/${user_id}/relevancia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords }),
    });

    const json = await res.json();
    setBuscando(false);

    if (json.error) { setError(json.error); return; }

    router.push(`/app/dashboard/${user_id}`);
  }, [categorias, selCats, selRubros, totalSeleccionado, user_id, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: NAVY, display: 'flex',
        alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Cargando…</p>
      </div>
    );
  }

  const rubros = usuario?.rubros_json ?? [];

  return (
    <div style={{
      minHeight: '100vh', background: NAVY,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 16px 100px',
    }}>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 520, paddingTop: 44, marginBottom: 28 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem', cursor: 'pointer', padding: 0, marginBottom: 20 }}
        >
          ← Volver
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', color: WHITE, fontWeight: 900 }}>M</div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
            {usuario?.empresa_nombre ?? ''}
          </span>
        </div>
        <h1 style={{ color: WHITE, fontSize: '1.3rem', fontWeight: 800, margin: 0,
          lineHeight: 1.25 }}>
          ¿Qué oportunidades<br />quieres ver?
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '6px 0 0' }}>
          Selecciona las categorías que te interesan
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* User rubros */}
        {rubros.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 2px' }}>
              Tus productos registrados
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {rubros.map(r => {
                const sel = selRubros.has(r);
                return (
                  <button key={r} onClick={() => toggleRubro(r)}
                    style={{
                      height: 34, borderRadius: 99, border: `1.5px solid ${sel ? BLUE : 'rgba(255,255,255,0.18)'}`,
                      background: sel ? BLUE : 'rgba(255,255,255,0.06)',
                      color: sel ? WHITE : 'rgba(255,255,255,0.7)',
                      fontSize: '0.8rem', fontWeight: 600,
                      padding: '0 14px', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>
                    {sel ? '✓ ' : ''}{r}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Portal categories */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px 2px' }}>
            Categorías disponibles en el portal
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {categorias.map(cat => {
              const sel = selCats.has(cat.id);
              return (
                <button key={cat.id} onClick={() => toggleCat(cat.id)}
                  style={{
                    background: sel ? 'rgba(0,71,204,0.35)' : BG,
                    border: `1.5px solid ${sel ? BLUE : BORDER}`,
                    borderRadius: 14, padding: '14px 14px',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '1.3rem' }}>{cat.emoji}</span>
                    {sel && (
                      <span style={{ width: 18, height: 18, borderRadius: '50%',
                        background: BLUE, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '0.65rem', color: WHITE,
                        fontWeight: 900, flexShrink: 0 }}>✓</span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: sel ? WHITE : 'rgba(255,255,255,0.8)',
                    fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3 }}>
                    {cat.nombre}
                  </p>
                  <p style={{ margin: 0, color: sel ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
                    fontSize: '0.7rem' }}>
                    {cat.count} licitaciones
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p style={{ color: '#F87171', fontSize: '0.82rem', textAlign: 'center',
            margin: '0 0 12px', fontWeight: 600 }}>
            {error}
          </p>
        )}
      </div>

      {/* Sticky bottom button */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: `linear-gradient(to top, ${NAVY} 60%, transparent)`,
        padding: '20px 16px 28px',
        display: 'flex', justifyContent: 'center',
      }}>
        <button
          onClick={buscar}
          disabled={buscando || totalSeleccionado === 0}
          style={{
            width: '100%', maxWidth: 520, height: 52, borderRadius: 14,
            border: 'none',
            background: totalSeleccionado > 0 ? BLUE : 'rgba(255,255,255,0.1)',
            color: totalSeleccionado > 0 ? WHITE : 'rgba(255,255,255,0.3)',
            fontSize: '0.95rem', fontWeight: 700, cursor: totalSeleccionado > 0 ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}>
          {buscando
            ? 'Buscando oportunidades…'
            : totalSeleccionado > 0
              ? `Ver oportunidades (${totalSeleccionado} seleccionada${totalSeleccionado !== 1 ? 's' : ''})`
              : 'Selecciona al menos una categoría'
          }
        </button>
      </div>
    </div>
  );
}
