'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const BLUE  = '#003DA5';
const GREEN = '#059669';
const AMBER = '#B45309';
const TEXT  = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const BG    = '#F9FAFB';
const WHITE = '#FFFFFF';

interface Compra {
  codigo: string; nombre: string;
  organismo_nombre: string | null;
  fecha_cierre: string | null;
  monto: number | null;
}
interface Cotizacion {
  id: string; token: string; estado: string;
  enviada_at: string | null; respondida_at: string | null;
  compra: Compra | null;
}

const ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  enviada:   { label: 'Pendiente',  color: AMBER,     bg: '#FFFBEB' },
  vista:     { label: 'Sin responder', color: BLUE,   bg: '#EFF6FF' },
  aprobada:  { label: 'Aprobada',   color: GREEN,     bg: '#ECFDF5' },
  rechazada: { label: 'Rechazada',  color: '#DC2626', bg: '#FEF2F2' },
  postulada: { label: 'Postulada',  color: MUTED,     bg: '#F3F4F6' },
  ganada:    { label: 'Ganada ✓',   color: GREEN,     bg: '#ECFDF5' },
  perdida:   { label: 'Perdida',    color: MUTED,     bg: '#F3F4F6' },
  desierta:  { label: 'Desierta',   color: MUTED,     bg: '#F3F4F6' },
};

function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}
function pesos(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

export default function BandejaClientePage() {
  const [lista,   setLista]   = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const token = localStorage.getItem('cliente_token');
    if (!token) { window.location.href = '/app/cliente/login'; return; }

    fetch('/api/cliente/bandeja', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          if (d.error === 'No autenticado' || d.error === 'Token inválido') {
            localStorage.removeItem('cliente_token');
            window.location.href = '/app/cliente/login';
            return;
          }
          setError(d.error);
        } else {
          setLista(Array.isArray(d) ? d : []);
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const pendientes = lista.filter(c => c.estado === 'enviada' || c.estado === 'vista');
  const resto      = lista.filter(c => c.estado !== 'enviada' && c.estado !== 'vista');

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, sans-serif', color: MUTED }}>Cargando…</div>
  );

  return (
    <div style={{
      minHeight: '100vh', background: BG, color: TEXT,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    }}>

      {/* Header */}
      <header style={{
        background: `linear-gradient(135deg,#00297A 0%,${BLUE} 100%)`,
        color: WHITE, padding: '16px 16px 14px',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, color: WHITE, fontSize: '0.95rem',
            }}>M</div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', opacity: 0.9 }}>Mercado Público</span>
            <button
              onClick={() => { localStorage.removeItem('cliente_token'); window.location.href = '/app/cliente/login'; }}
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: 6, color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem',
                padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Salir
            </button>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Mis cotizaciones</h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.71rem', opacity: 0.55 }}>
            {pendientes.length > 0 ? `${pendientes.length} pendiente${pendientes.length > 1 ? 's' : ''} de respuesta` : 'Todo al día'}
          </p>
        </div>
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 16px' }}>
        {error && (
          <p style={{ color: '#DC2626', background: '#FEF2F2', borderRadius: 10,
            padding: '12px 14px', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>
        )}

        {lista.length === 0 ? (
          <div style={{ background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
            padding: '44px 20px', textAlign: 'center', marginTop: 10 }}>
            <p style={{ color: MUTED, fontSize: '0.9rem', margin: 0 }}>
              Aún no tienes cotizaciones recibidas.
            </p>
          </div>
        ) : (
          <>
            {/* Pendientes */}
            {pendientes.length > 0 && (
              <>
                <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700,
                  color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pendientes de respuesta
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {pendientes.map(c => <CotCard key={c.id} c={c} />)}
                </div>
              </>
            )}

            {/* Historial */}
            {resto.length > 0 && (
              <>
                <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700,
                  color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Historial
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {resto.map(c => <CotCard key={c.id} c={c} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CotCard({ c }: { c: Cotizacion }) {
  const cfg      = ESTADO[c.estado] ?? { label: c.estado, color: MUTED, bg: '#F3F4F6' };
  const pendiente = c.estado === 'enviada' || c.estado === 'vista';

  return (
    <Link href={`/app/cotizacion-cliente/${c.token}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: WHITE, borderRadius: 14,
        border: `1.5px solid ${pendiente ? BLUE : BORDER}`,
        padding: '13px 14px', cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: '0.88rem', fontWeight: 700, color: TEXT, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {c.compra?.nombre ?? 'Cotización'}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: '0.71rem', color: MUTED }}>
              {c.compra?.organismo_nombre ?? '—'}
              {c.compra?.fecha_cierre ? ` · Cierre ${fechaCorta(c.compra.fecha_cierre)}` : ''}
            </p>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 99,
              fontSize: '0.68rem', fontWeight: 700,
              color: cfg.color, background: cfg.bg,
            }}>{cfg.label}</span>
            {c.compra?.monto ? (
              <p style={{ margin: '4px 0 0', fontSize: '0.71rem', color: BLUE, fontWeight: 700 }}>
                {pesos(c.compra.monto)}
              </p>
            ) : null}
          </div>
        </div>
        {pendiente && (
          <div style={{
            marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.71rem', color: MUTED }}>
              Recibida {fechaCorta(c.enviada_at)}
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: BLUE }}>Revisar →</span>
          </div>
        )}
      </div>
    </Link>
  );
}
