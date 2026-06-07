'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAVY  = '#001A4D';
const BLUE  = '#0047CC';
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

type BandejaItem = {
  id: string;
  estado: 'vista' | 'aprobada' | 'rechazada';
  respuesta_cliente: string | null;
  comentario_rechazo: string | null;
  respondida_at: string | null;
  empresa_id: string;
  compra_codigo: string;
  compra_nombre: string;
  organismo_nombre: string | null;
  fecha_cierre: string | null;
  empresa_nombre: string;
};

function diasRestantes(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
}

export default function AsesorHomePage() {
  const router = useRouter();
  const [bandeja, setBandeja]       = useState<BandejaItem[]>([]);
  const [postulando, setPostulando] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('asesor_token');
    if (!token) return;
    fetch('/api/asesor/bandeja', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.cotizaciones)) setBandeja(d.cotizaciones); })
      .catch(() => {});
  }, []);

  async function postular(item: BandejaItem) {
    setPostulando(item.id);
    try {
      const token = localStorage.getItem('asesor_token') ?? '';
      const res = await fetch(`/api/cotizacion/${item.empresa_id}/${item.compra_codigo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postulada: true, quien_postulo: 'asesor' }),
      });
      if (res.ok) setBandeja(prev => prev.filter(b => b.id !== item.id));
    } finally {
      setPostulando(null);
    }
  }

  const aprobadas  = bandeja.filter(b => b.estado === 'aprobada');
  const vistas     = bandeja.filter(b => b.estado === 'vista');
  const rechazadas = bandeja.filter(b => b.estado === 'rechazada');
  const ordenada   = [...aprobadas, ...vistas, ...rechazadas];

  return (
    <div style={{
      minHeight: '100vh', background: NAVY,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 16px 48px',
    }}>
      {/* Brand */}
      <div style={{ width: '100%', maxWidth: 480, paddingTop: 52, marginBottom: ordenada.length ? 24 : 36, textAlign: 'center' }}>
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

      {/* Bandeja */}
      {ordenada.length > 0 && (
        <div style={{ width: '100%', maxWidth: 480, marginBottom: 28 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ color: WHITE, fontWeight: 700, fontSize: '0.95rem' }}>Bandeja</span>
            {aprobadas.length > 0 && (
              <span style={{
                background: '#16a34a', color: WHITE, fontSize: '0.7rem',
                fontWeight: 700, borderRadius: 99, padding: '2px 8px',
              }}>
                {aprobadas.length} {aprobadas.length === 1 ? 'acción pendiente' : 'acciones pendientes'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ordenada.map(item => {
              const dias = diasRestantes(item.fecha_cierre);
              return (
                <div key={item.id} style={{
                  background: item.estado === 'aprobada'
                    ? 'rgba(22,163,74,0.12)'
                    : item.estado === 'rechazada'
                    ? 'rgba(220,38,38,0.10)'
                    : 'rgba(255,255,255,0.05)',
                  borderRadius: 16,
                  border: item.estado === 'aprobada'
                    ? '1px solid rgba(22,163,74,0.4)'
                    : item.estado === 'rechazada'
                    ? '1px solid rgba(220,38,38,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                  padding: '14px 16px',
                }}>
                  {/* Estado badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, borderRadius: 99, padding: '2px 8px',
                      background: item.estado === 'aprobada' ? 'rgba(22,163,74,0.25)' : item.estado === 'rechazada' ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.1)',
                      color: item.estado === 'aprobada' ? '#4ade80' : item.estado === 'rechazada' ? '#f87171' : 'rgba(255,255,255,0.5)',
                    }}>
                      {item.estado === 'aprobada' ? '✓ Cliente aprobó' : item.estado === 'rechazada' ? '✗ Cliente rechazó' : '👁 En revisión'}
                    </span>
                    {dias !== null && dias >= 0 && (
                      <span style={{ fontSize: '0.7rem', color: dias <= 3 ? '#f87171' : 'rgba(255,255,255,0.35)' }}>
                        {dias === 0 ? 'Cierra hoy' : `${dias}d restantes`}
                      </span>
                    )}
                  </div>

                  {/* Empresa + compra */}
                  <p style={{ margin: '0 0 2px', color: WHITE, fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.3 }}>
                    {item.empresa_nombre}
                  </p>
                  <p style={{ margin: '0 0 2px', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', lineHeight: 1.4 }}>
                    {item.compra_nombre}
                  </p>
                  {item.organismo_nombre && (
                    <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem' }}>
                      {item.organismo_nombre}
                    </p>
                  )}

                  {/* Comentario rechazo */}
                  {item.estado === 'rechazada' && item.comentario_rechazo && (
                    <p style={{
                      margin: '0 0 10px', padding: '8px 10px',
                      background: 'rgba(220,38,38,0.12)', borderRadius: 8,
                      color: '#fca5a5', fontSize: '0.78rem', lineHeight: 1.4,
                    }}>
                      "{item.comentario_rechazo}"
                    </p>
                  )}

                  {/* Botón postular */}
                  {item.estado === 'aprobada' && (
                    <button
                      onClick={() => postular(item)}
                      disabled={postulando === item.id}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 10,
                        background: postulando === item.id ? 'rgba(255,255,255,0.1)' : '#16a34a',
                        color: WHITE, fontWeight: 700, fontSize: '0.88rem',
                        border: 'none', cursor: postulando === item.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {postulando === item.id ? 'Postulando...' : 'Marcar como postulada →'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
