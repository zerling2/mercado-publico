'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const BLUE = '#003DA5'; const BLUE_D = '#00297A';
const WHITE = '#FFFFFF'; const TEXT = '#111827'; const MUTED = '#6B7280';
const BORDER = '#E5E7EB'; const RED = '#DC2626';

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function ClienteLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { data, error: err } = await supabase().auth.signInWithPassword({ email, password });
    if (err || !data.session) {
      setError(err?.message ?? 'Error de autenticación');
      setLoading(false);
      return;
    }
    localStorage.setItem('cliente_token', data.session.access_token);
    router.push('/app/cliente/bandeja');
  };

  return (
    <div style={{ minHeight: '100vh',
      background: `linear-gradient(160deg, ${BLUE_D} 0%, ${BLUE} 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '0 24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>

      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)',
            fontSize: '1.6rem', fontWeight: 900, color: WHITE, marginBottom: 12 }}>
            M
          </div>
          <p style={{ color: WHITE, fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>
            Mercado Público
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '4px 0 0' }}>
            Portal de cotizaciones
          </p>
        </div>

        <form onSubmit={login} style={{ background: WHITE, borderRadius: 18,
          padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 800, color: TEXT }}>
            Ingresar
          </h2>

          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="nombre@empresa.cl"
              style={inputSt} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelSt}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              style={inputSt} />
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: `1px solid #FCA5A5`, borderRadius: 8,
              padding: '8px 12px', marginBottom: 14, color: RED, fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', height: 48, borderRadius: 11, border: 'none',
              background: BLUE, color: WHITE, fontFamily: 'inherit',
              fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>

          <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.75rem', margin: '14px 0 0' }}>
            Acceso enviado por tu asesor por correo electrónico
          </p>
        </form>
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: 'block', marginBottom: 5,
  fontSize: '0.75rem', fontWeight: 600, color: MUTED,
};

const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const,
  height: 44, borderRadius: 9, border: `1.5px solid ${BORDER}`,
  padding: '0 13px', fontSize: '0.92rem', fontFamily: 'inherit',
  color: TEXT, outline: 'none',
};
