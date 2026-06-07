'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BLUE = '#003DA5'; const BLUE_D = '#00297A';
const GREEN = '#059669'; const AMBER = '#D97706'; const RED = '#DC2626';
const TEXT = '#111827'; const MUTED = '#6B7280';
const BORDER = '#E5E7EB'; const BG = '#F9FAFB'; const WHITE = '#FFFFFF';

interface Cotizacion {
  id: string;
  token: string;
  estado: string;
  enviada_at: string;
  respondida_at: string | null;
  postulada_at: string | null;
  notas: string | null;
  compra: {
    codigo: string;
    nombre: string;
    organismo_nombre: string | null;
    fecha_cierre: string | null;
  } | null;
}

interface BandejaData {
  empresa: { empresa_nombre: string; rut: string } | null;
  cotizaciones: Cotizacion[];
}

function estadoBadge(estado: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    enviada:   { label: 'Nueva',     bg: '#FFFBEB', color: AMBER },
    vista:     { label: 'Vista',     bg: '#EFF6FF', color: BLUE  },
    aprobada:  { label: 'Aprobada',  bg: '#ECFDF5', color: GREEN },
    rechazada: { label: 'Rechazada', bg: '#FEF2F2', color: RED   },
    postulada: { label: 'Postulada', bg: '#EFF6FF', color: BLUE  },
    ganada:    { label: 'Ganada',    bg: '#ECFDF5', color: GREEN },
    perdida:   { label: 'Perdida',   bg: '#FEF2F2', color: RED   },
    desierta:  { label: 'Desierta',  bg: '#FFFBEB', color: AMBER },
  };
  const s = map[estado] ?? { label: estado, bg: '#F3F4F6', color: MUTED };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '0.68rem',
      fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {s.label}
    </span>
  );
}

function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

async function subscribeToPush(token: string) {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission === 'denied') return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidKey) return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const subJson = sub.toJSON();
    await fetch('/api/push/suscribir', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys:     subJson.keys,
        tipo:     'cliente',
      }),
    });
  } catch {
    // Push not supported or permission denied — silent fail
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

export default function ClienteBandejaPage() {
  const router = useRouter();
  const [data, setData]     = useState<BandejaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    const token = localStorage.getItem('cliente_token');
    if (!token) { router.replace('/app/cliente/login'); return; }

    fetch('/api/cliente/bandeja', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (r.status === 401) { localStorage.removeItem('cliente_token'); router.replace('/app/cliente/login'); return; }
        const d = await r.json();
        if (d.error) { setError(d.error); } else { setData(d); }
        setLoading(false);

        // Register push in the background
        subscribeToPush(token);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router]);

  const logout = () => {
    localStorage.removeItem('cliente_token');
    router.replace('/app/cliente/login');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: '-apple-system, sans-serif', color: MUTED }}>
      Cargando…
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      fontFamily: '-apple-system, sans-serif', color: RED }}>
      <p>{error}</p>
      <button onClick={logout} style={logoutBtnSt}>Cerrar sesión</button>
    </div>
  );

  const cotizaciones = data?.cotizaciones ?? [];
  const pendientes   = cotizaciones.filter(c => ['enviada', 'vista'].includes(c.estado));
  const historial    = cotizaciones.filter(c => !['enviada', 'vista'].includes(c.estado));

  return (
    <div style={{ minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      color: TEXT }}>

      {/* Header */}
      <header style={{ background: `linear-gradient(135deg,${BLUE_D} 0%,${BLUE} 100%)`,
        color: WHITE, padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>Mis cotizaciones</p>
          {data?.empresa && (
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', opacity: 0.65 }}>
              {data.empresa.empresa_nombre}
            </p>
          )}
        </div>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)',
          border: 'none', color: WHITE, borderRadius: 7, padding: '6px 12px',
          fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>
          Salir
        </button>
      </header>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px' }}>

        {/* Pendientes */}
        {pendientes.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 700,
              color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Pendientes de respuesta ({pendientes.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendientes.map(c => (
                <CotizacionCard key={c.id} cot={c} />
              ))}
            </div>
          </section>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <section>
            <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 700,
              color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Historial
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {historial.map(c => (
                <CotizacionCard key={c.id} cot={c} />
              ))}
            </div>
          </section>
        )}

        {cotizaciones.length === 0 && (
          <div style={{ background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
            padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0 }}>
              Aún no tienes cotizaciones. Tu asesor te enviará una cuando esté lista.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CotizacionCard({ cot }: { cot: Cotizacion }) {
  const router = useRouter();
  const pending = ['enviada', 'vista'].includes(cot.estado);

  return (
    <button onClick={() => router.push(`/app/cotizacion-cliente/${cot.token}`)}
      style={{ background: WHITE, borderRadius: 14,
        border: `1.5px solid ${pending ? BORDER : BORDER}`,
        padding: '13px 16px', cursor: 'pointer', textAlign: 'left',
        display: 'flex', flexDirection: 'column', gap: 6, width: '100%',
        boxShadow: pending ? '0 2px 8px rgba(0,61,165,0.1)' : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem',
          color: TEXT, flex: 1, paddingRight: 8,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cot.compra?.nombre ?? cot.compra?.codigo ?? '—'}
        </p>
        {estadoBadge(cot.estado)}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: '0.73rem', color: MUTED }}>
        <span>{cot.compra?.organismo_nombre ?? '—'}</span>
        <span>·</span>
        <span>Enviada {fechaCorta(cot.enviada_at)}</span>
        {cot.compra?.fecha_cierre && (
          <>
            <span>·</span>
            <span>Cierra {fechaCorta(cot.compra.fecha_cierre)}</span>
          </>
        )}
      </div>
    </button>
  );
}

const logoutBtnSt: React.CSSProperties = {
  height: 40, borderRadius: 9, border: `1.5px solid ${BORDER}`,
  background: WHITE, color: TEXT, fontFamily: 'inherit',
  fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', padding: '0 20px',
};
