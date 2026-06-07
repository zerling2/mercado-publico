'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const NAVY = '#001A4D';
const BLUE = '#0047CC';
const WHITE = '#FFFFFF';

type BandejaItem = {
  id: string;
  estado: 'enviada' | 'vista' | 'aprobada' | 'rechazada' | 'postulada';
  respuesta_cliente: string | null;
  comentario_rechazo: string | null;
  enviada_at: string | null;
  respondida_at: string | null;
  postulada_at: string | null;
  empresa_id: string;
  compra_codigo: string;
  compra_nombre: string;
  organismo_nombre: string | null;
  fecha_cierre: string | null;
  empresa_nombre: string;
};

type Filtro = 'todas' | 'pendientes' | 'postuladas';

const ESTADO_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
  enviada:   { label: 'Enviada',         color: '#60a5fa', border: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  vista:     { label: 'En revisión',     color: '#fbbf24', border: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  aprobada:  { label: '✓ Aprobada',      color: '#4ade80', border: '#16a34a', bg: 'rgba(22,163,74,0.12)'  },
  rechazada: { label: '✗ Rechazada',     color: '#f87171', border: '#dc2626', bg: 'rgba(220,38,38,0.10)'  },
  postulada: { label: '⬆ Postulada',    color: '#a78bfa', border: '#7c3aed', bg: 'rgba(124,58,237,0.10)' },
};

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function diasRestantes(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
}

export default function AsesorBandejaPage() {
  const router = useRouter();
  const [items, setItems]           = useState<BandejaItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filtro, setFiltro]         = useState<Filtro>('todas');
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [postulando, setPostulando] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('asesor_token');
    if (!token) { router.replace('/app/login'); return; }

    fetch('/api/asesor/bandeja', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.cotizaciones)) setItems(d.cotizaciones); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function postular(item: BandejaItem) {
    setPostulando(item.id);
    try {
      const token = localStorage.getItem('asesor_token') ?? '';
      const res = await fetch(`/api/cotizacion/${item.empresa_id}/${item.compra_codigo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postulada: true, quien_postulo: 'asesor' }),
      });
      if (res.ok) {
        setItems(prev => prev.map(b => b.id === item.id ? { ...b, estado: 'postulada', postulada_at: new Date().toISOString() } : b));
        setExpanded(null);
      }
    } finally {
      setPostulando(null);
    }
  }

  const filtrada = items.filter(i => {
    if (filtro === 'pendientes') return i.estado === 'aprobada';
    if (filtro === 'postuladas') return i.estado === 'postulada';
    return true;
  });

  const aprobadas = items.filter(i => i.estado === 'aprobada').length;

  return (
    <div style={{
      minHeight: '100vh', background: NAVY,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(135deg, #001A4D 0%, #0047CC 100%)',
        padding: '16px 16px 0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => router.push('/app/dashboard')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '1.4rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
            >
              ‹
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, color: WHITE, fontSize: '1.1rem', fontWeight: 800 }}>
                Cotizaciones enviadas
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                {items.length} {items.length === 1 ? 'cotización' : 'cotizaciones'}
                {aprobadas > 0 && ` · ${aprobadas} pendiente${aprobadas > 1 ? 's' : ''} de postular`}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 12, overflowX: 'auto' }}>
            {([
              { key: 'todas',      label: 'Todas' },
              { key: 'pendientes', label: `Postular${aprobadas > 0 ? ` (${aprobadas})` : ''}` },
              { key: 'postuladas', label: 'Postuladas' },
            ] as { key: Filtro; label: string }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 99,
                  border: filtro === f.key ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  background: filtro === f.key ? WHITE : 'transparent',
                  color: filtro === f.key ? NAVY : 'rgba(255,255,255,0.6)',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '12px 16px 32px' }}>
        {loading && (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 48 }}>
            Cargando...
          </p>
        )}

        {!loading && filtrada.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 64 }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '2rem', marginBottom: 8 }}>✉</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>
              {filtro === 'pendientes' ? 'Sin cotizaciones pendientes de postular' :
               filtro === 'postuladas' ? 'Aún no hay cotizaciones postuladas' :
               'Aún no hay cotizaciones enviadas'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrada.map(item => {
            const cfg  = ESTADO_CONFIG[item.estado] ?? ESTADO_CONFIG.enviada;
            const open = expanded === item.id;
            const dias = diasRestantes(item.fecha_cierre);

            return (
              <div
                key={item.id}
                style={{
                  background: open ? cfg.bg : 'rgba(255,255,255,0.05)',
                  borderRadius: 16,
                  border: `1px solid ${open ? cfg.border : 'rgba(255,255,255,0.08)'}`,
                  overflow: 'hidden',
                  transition: 'all 0.15s',
                }}
              >
                {/* Fila principal */}
                <button
                  onClick={() => setExpanded(open ? null : item.id)}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '14px 16px', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}
                >
                  {/* Barra de color lateral */}
                  <div style={{
                    width: 3, borderRadius: 99, alignSelf: 'stretch', flexShrink: 0,
                    background: cfg.border, minHeight: 40,
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: WHITE, fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {item.empresa_nombre}
                      </span>
                      <span style={{ color: cfg.color, fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                        background: `${cfg.bg}`, borderRadius: 99, padding: '2px 8px', border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', lineHeight: 1.35,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.compra_nombre}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                        Enviada {formatFecha(item.enviada_at)}
                      </span>
                      {dias !== null && (
                        <span style={{ color: dias <= 3 && dias >= 0 ? '#f87171' : 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                          {dias < 0 ? 'Cerrada' : dias === 0 ? 'Cierra hoy' : `Cierra en ${dias}d`}
                        </span>
                      )}
                    </div>
                  </div>

                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1rem', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                    ›
                  </span>
                </button>

                {/* Detalle expandido */}
                {open && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginTop: 14, marginBottom: 14 }}>
                      <div>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organismo</p>
                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem' }}>{item.organismo_nombre ?? '—'}</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Código</p>
                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', fontFamily: 'monospace' }}>{item.compra_codigo}</p>
                      </div>
                      {item.respondida_at && (
                        <div>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {item.estado === 'rechazada' ? 'Rechazada el' : 'Aprobada el'}
                          </p>
                          <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem' }}>{formatFecha(item.respondida_at)}</p>
                        </div>
                      )}
                      {item.postulada_at && (
                        <div>
                          <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Postulada el</p>
                          <p style={{ margin: '2px 0 0', color: '#a78bfa', fontSize: '0.78rem' }}>{formatFecha(item.postulada_at)}</p>
                        </div>
                      )}
                    </div>

                    {/* Comentario rechazo */}
                    {item.estado === 'rechazada' && item.comentario_rechazo && (
                      <div style={{
                        padding: '10px 12px', borderRadius: 10, marginBottom: 14,
                        background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)',
                      }}>
                        <p style={{ margin: '0 0 4px', color: '#f87171', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Observación del cliente
                        </p>
                        <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.83rem', lineHeight: 1.5 }}>
                          "{item.comentario_rechazo}"
                        </p>
                      </div>
                    )}

                    {/* Botones */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href={`/api/cotizacion/${item.empresa_id}/${item.compra_codigo}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 10, textAlign: 'center',
                          background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
                          fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        ↓ Descargar PDF
                      </a>

                      {item.estado === 'aprobada' && (
                        <button
                          onClick={() => postular(item)}
                          disabled={postulando === item.id}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 10,
                            background: postulando === item.id ? 'rgba(255,255,255,0.1)' : '#16a34a',
                            color: WHITE, fontWeight: 700, fontSize: '0.82rem',
                            border: 'none', cursor: postulando === item.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {postulando === item.id ? 'Guardando...' : '⬆ Marcar postulada'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
