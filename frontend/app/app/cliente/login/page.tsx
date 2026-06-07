'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const BLUE  = '#003DA5';
const TEXT  = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const BG    = '#F9FAFB';
const WHITE = '#FFFFFF';

export default function ClienteLoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Email o contraseña incorrectos');
      setLoading(false);
      return;
    }
    if (data.session) {
      localStorage.setItem('cliente_token', data.session.access_token);
      window.location.href = '/app/cliente/bandeja';
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', color: WHITE, fontSize: '1.5rem', fontWeight: 900,
          }}>M</div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: TEXT }}>
            Portal de cotizaciones
          </h1>
          <p style={{ margin: '5px 0 0', color: MUTED, fontSize: '0.82rem' }}>
            Mercado Público · Asesoría empresarial
          </p>
        </div>

        {/* Card */}
        <div style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, padding: '26px 22px' }}>
          <form onSubmit={login}>
            <label style={labelSt}>Email</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@empresa.cl"
              style={{ ...inputSt, marginBottom: 14 }}
            />

            <label style={labelSt}>Contraseña</label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...inputSt, marginBottom: error ? 12 : 20 }}
            />

            {error && (
              <p style={{
                margin: '0 0 14px', padding: '9px 12px', borderRadius: 8,
                background: '#FEF2F2', color: '#DC2626', fontSize: '0.82rem',
              }}>{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', height: 48, borderRadius: 12, border: 'none',
                background: BLUE, color: WHITE, fontFamily: 'inherit',
                fontSize: '0.95rem', fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: 'block', marginBottom: 5,
  fontSize: '0.72rem', fontWeight: 700, color: MUTED,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};
const inputSt: React.CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  height: 44, borderRadius: 10, border: `1.5px solid ${BORDER}`,
  padding: '0 12px', fontSize: '0.9rem', fontFamily: 'inherit',
  color: TEXT, outline: 'none', background: '#FAFAFA',
};
