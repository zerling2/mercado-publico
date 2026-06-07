'use client';

import { useRouter } from 'next/navigation';

const NAVY = '#001A4D';
const BLUE = '#0047CC';
const WHITE = '#FFFFFF';

const OPCIONES = [
  {
    emoji: '🏢',
    titulo: 'Empresa de mi cartera',
    desc: 'Busca oportunidades para una empresa cliente existente',
    href: '/app/asesor/empresa',
  },
  {
    emoji: '🔍',
    titulo: 'Explorar por categoría',
    desc: 'Ve todas las licitaciones disponibles por tipo de producto, sin seleccionar empresa',
    href: '/app/asesor/categorias',
  },
  {
    emoji: '✨',
    titulo: 'Cliente prospecto',
    desc: 'Registra una empresa nueva o fuera de tu cartera y busca sus primeras oportunidades',
    href: '/app/asesor/nuevo-cliente',
  },
];

export default function AsesorHomePage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh', background: NAVY,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 16px 48px',
    }}>
      {/* Brand */}
      <div style={{ width: '100%', maxWidth: 480, paddingTop: 52, marginBottom: 36, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', color: WHITE, fontWeight: 900 }}>M</div>
          <span style={{ color: WHITE, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
            Mercado Público
          </span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: 0 }}>
          Portal para asesores — ¿qué quieres hacer hoy?
        </p>
      </div>

      {/* Option cards */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {OPCIONES.map(op => (
          <button
            key={op.href}
            onClick={() => router.push(op.href)}
            style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '20px 20px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 16,
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{op.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 4px', color: WHITE, fontWeight: 700, fontSize: '1rem' }}>
                {op.titulo}
              </p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                {op.desc}
              </p>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
