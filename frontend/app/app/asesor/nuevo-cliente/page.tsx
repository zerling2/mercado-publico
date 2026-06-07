'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NAVY   = '#001A4D';
const BLUE   = '#0047CC';
const WHITE  = '#FFFFFF';
const BORDER = '#D6E0F5';
const TEXT   = '#0A0F1E';
const MUTED  = '#5A6480';
const RED    = '#C01048';

export default function NuevoClientePage() {
  const router = useRouter();
  const [step, setStep]   = useState<'rut' | 'form'>('rut');
  const [rut, setRut]     = useState('');
  const [buscando, setBuscando] = useState(false);
  const [form, setForm]   = useState({ empresa_nombre: '', rut: '', email: '', rubros: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1: search RUT
  const buscarRut = async () => {
    if (!rut.trim()) return;
    setBuscando(true);
    const res = await fetch('/api/usuarios').then(r => r.json());
    const q = rut.replace(/[.\-]/g, '').toLowerCase();
    const found = Array.isArray(res)
      ? res.find((u: { rut: string; id: string }) =>
          u.rut.replace(/[.\-]/g, '').toLowerCase().includes(q))
      : null;
    setBuscando(false);

    if (found) {
      // Already in portfolio → go directly to seleccion
      router.push(`/app/seleccion/${found.id}`);
    } else {
      // Not found → show registration form
      setForm(f => ({ ...f, rut }));
      setStep('form');
    }
  };

  // Step 2: register and go
  const guardar = async () => {
    if (!form.empresa_nombre || !form.rut) { setError('Nombre y RUT son obligatorios'); return; }
    setSaving(true); setError('');
    const rubros_json = form.rubros.split(',').map(r => r.trim()).filter(Boolean);
    const res = await fetch('/api/usuarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rubros_json }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.error) { setError(json.error); return; }
    router.push(`/app/seleccion/${json.id}`);
  };

  return (
    <div style={{
      minHeight: '100vh', background: NAVY,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 16px 40px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, paddingTop: 40 }}>
        <button onClick={() => step === 'form' ? setStep('rut') : router.back()}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem', cursor: 'pointer', padding: 0, marginBottom: 20 }}>
          ← Volver
        </button>

        <h1 style={{ color: WHITE, fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px' }}>
          Cliente prospecto
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0 0 24px' }}>
          {step === 'rut'
            ? 'Ingresa el RUT de la empresa para buscarla o registrarla'
            : 'Completa los datos de la empresa para continuar'}
        </p>

        {step === 'rut' ? (
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.10)', padding: '22px 18px' }}>
            <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              display: 'block', marginBottom: 8 }}>
              RUT de la empresa
            </label>
            <input
              autoFocus
              value={rut}
              onChange={e => setRut(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarRut()}
              placeholder="Ej: 12.345.678-9"
              style={{
                width: '100%', boxSizing: 'border-box', height: 52, borderRadius: 12,
                border: '1.5px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.09)', color: WHITE,
                fontSize: '1rem', padding: '0 16px', outline: 'none',
                marginBottom: 14,
              }}
            />
            <button onClick={buscarRut} disabled={buscando || !rut.trim()}
              style={{
                width: '100%', height: 48, borderRadius: 12, border: 'none',
                background: rut.trim() ? BLUE : 'rgba(255,255,255,0.1)',
                color: rut.trim() ? WHITE : 'rgba(255,255,255,0.3)',
                fontFamily: 'inherit', fontSize: '0.92rem', fontWeight: 700,
                cursor: rut.trim() ? 'pointer' : 'default',
              }}>
              {buscando ? 'Buscando…' : 'Continuar →'}
            </button>
          </div>
        ) : (
          <div style={{ background: WHITE, borderRadius: 18, border: `1px solid ${BORDER}`,
            padding: '20px 18px' }}>
            <p style={{ margin: '0 0 14px', fontWeight: 800, color: NAVY, fontSize: '0.95rem' }}>
              Nueva empresa — completa sus datos
            </p>
            {[
              { key: 'empresa_nombre', label: 'Nombre empresa',     placeholder: 'Imprenta Ejemplo Ltda.' },
              { key: 'rut',            label: 'RUT',                 placeholder: '12.345.678-9' },
              { key: 'email',          label: 'Email (opcional)',    placeholder: '' },
              { key: 'rubros',         label: 'Productos que vende (separados por coma)',
                placeholder: 'escobas, artículos de limpieza, papel' },
              { key: 'region',         label: 'Región (opcional)',   placeholder: '' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: MUTED,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  display: 'block', marginBottom: 4 }}>
                  {label}
                </label>
                <input
                  style={{ width: '100%', boxSizing: 'border-box', height: 42, borderRadius: 10,
                    border: `1.5px solid ${BORDER}`, padding: '0 12px',
                    fontSize: '0.9rem', color: TEXT, outline: 'none', fontFamily: 'inherit' }}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            {error && (
              <p style={{ fontSize: '0.82rem', color: RED, margin: '4px 0 8px', fontWeight: 600 }}>
                {error}
              </p>
            )}
            <button onClick={guardar} disabled={saving}
              style={{ width: '100%', height: 46, borderRadius: 12, border: 'none',
                background: BLUE, color: WHITE, fontSize: '0.92rem', fontWeight: 700,
                cursor: 'pointer', marginTop: 6, fontFamily: 'inherit' }}>
              {saving ? 'Registrando…' : 'Registrar y buscar oportunidades →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
