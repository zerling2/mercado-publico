'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const BLUE   = '#001A4D';
const BLUE_M = '#0047CC';
const WHITE  = '#FFFFFF';
const MUTED  = '#6B7280';
const BORDER = '#E5E7EB';
const BG     = '#F8FAFF';

export default function AsesorHomePage() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('asesor_token');
    if (!token) return;
    fetch('/api/asesor/bandeja', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const n = (d.cotizaciones ?? []).filter((c: { estado: string }) => c.estado === 'aprobada').length;
        setPendientes(n);
      })
      .catch(() => {});
  }, []);

  const card = (id: string): React.CSSProperties => ({
    background: hovered === id ? BG : WHITE,
    border: `1.5px solid ${hovered === id ? BLUE_M : BORDER}`,
    borderRadius: 16,
    padding: '22px 20px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    transition: 'border-color 0.15s, background 0.15s',
    width: '100%',
    fontFamily: 'inherit',
  });

  return (
    <div style={{
      minHeight: '100vh', background: WHITE,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 20px 48px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Brand */}
        <div style={{ paddingTop: 64, marginBottom: 48 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={WHITE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <p style={{ margin: '0 0 4px', color: BLUE, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Mercado Público
          </p>
          <p style={{ margin: 0, color: MUTED, fontSize: '0.82rem' }}>
            Portal para asesores
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Buscar oportunidades */}
          <button
            onClick={() => router.push('/app/asesor/categorias')}
            onMouseEnter={() => setHovered('buscar')}
            onMouseLeave={() => setHovered(null)}
            style={card('buscar')}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: hovered === 'buscar' ? BLUE : BG,
              border: `1.5px solid ${hovered === 'buscar' ? BLUE : BORDER}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, border-color 0.15s',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={hovered === 'buscar' ? WHITE : BLUE_M}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: BLUE, fontWeight: 700, fontSize: '0.98rem' }}>
                Buscar oportunidades
              </p>
              <p style={{ margin: '2px 0 0', color: MUTED, fontSize: '0.76rem' }}>
                Explora licitaciones por categoría
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* Bandeja */}
          <button
            onClick={() => router.push('/app/asesor/bandeja')}
            onMouseEnter={() => setHovered('bandeja')}
            onMouseLeave={() => setHovered(null)}
            style={card('bandeja')}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: hovered === 'bandeja' ? BLUE : BG,
              border: `1.5px solid ${hovered === 'bandeja' ? BLUE : BORDER}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, border-color 0.15s',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={hovered === 'bandeja' ? WHITE : BLUE_M}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ margin: 0, color: BLUE, fontWeight: 700, fontSize: '0.98rem' }}>
                  Bandeja
                </p>
                {pendientes > 0 && (
                  <span style={{
                    background: '#16a34a', color: WHITE,
                    fontSize: '0.68rem', fontWeight: 800,
                    borderRadius: 99, padding: '2px 8px', lineHeight: 1.5,
                  }}>
                    {pendientes} pendiente{pendientes > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', color: MUTED, fontSize: '0.76rem' }}>
                Cotizaciones enviadas y respuestas
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

        </div>
      </div>
    </div>
  );
}
