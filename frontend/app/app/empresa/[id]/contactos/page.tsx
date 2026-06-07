'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BLUE = '#003DA5'; const BLUE_D = '#00297A';
const GREEN = '#059669'; const RED = '#DC2626';
const TEXT = '#111827'; const MUTED = '#6B7280';
const BORDER = '#E5E7EB'; const BG = '#F9FAFB'; const WHITE = '#FFFFFF';

interface Contacto {
  id: string;
  auth_user_id: string;
  nombre: string | null;
  email: string;
  activo: boolean;
  created_at: string;
}

export default function ContactosPage({ params }: { params: { id: string } }) {
  const { id: empresaId } = params;
  const router = useRouter();

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [email, setEmail]       = useState('');
  const [nombre, setNombre]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');

  const cargar = async () => {
    setLoading(true);
    const d = await fetch(`/api/usuario-cliente?empresa_id=${empresaId}`).then(r => r.json());
    setContactos(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [empresaId]);

  const invitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setErr('');
    const res = await fetch('/api/usuario-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa_id: empresaId, email, nombre }),
    }).then(r => r.json());

    if (res.error) {
      setErr(res.error);
    } else {
      setMsg(res.reactivated ? 'Acceso reactivado.' : 'Invitación enviada por email.');
      setEmail(''); setNombre('');
      await cargar();
    }
    setSaving(false);
  };

  const revocar = async (id: string) => {
    await fetch('/api/usuario-cliente', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await cargar();
  };

  return (
    <div style={{ minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      color: TEXT }}>

      <header style={{ background: `linear-gradient(135deg,${BLUE_D} 0%,${BLUE} 100%)`,
        color: WHITE, padding: '11px 16px',
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: WHITE,
            borderRadius: 6, padding: '5px 10px', fontSize: '0.9rem', cursor: 'pointer' }}>
          ←
        </button>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem' }}>Acceso cliente</p>
          <p style={{ margin: 0, fontSize: '0.68rem', opacity: 0.6 }}>
            Gestiona quién puede ver las cotizaciones de esta empresa
          </p>
        </div>
      </header>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px 16px' }}>

        {/* Invite form */}
        <div style={{ background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
          padding: '18px 16px', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700 }}>
            Invitar contacto
          </h3>
          <form onSubmit={invitar}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelSt}>Nombre</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Juan Pérez"
                  style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Correo electrónico *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="juan@empresa.cl"
                  style={inputSt} />
              </div>
            </div>

            {msg && <p style={{ margin: '0 0 8px', color: GREEN, fontSize: '0.82rem' }}>{msg}</p>}
            {err && <p style={{ margin: '0 0 8px', color: RED, fontSize: '0.82rem' }}>{err}</p>}

            <button type="submit" disabled={saving}
              style={{ height: 40, borderRadius: 9, border: 'none', cursor: 'pointer',
                background: BLUE, color: WHITE, fontFamily: 'inherit',
                fontSize: '0.88rem', fontWeight: 700, padding: '0 20px',
                opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </form>
        </div>

        {/* Contact list */}
        <div>
          <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 700,
            color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Contactos con acceso ({loading ? '…' : contactos.filter(c => c.activo).length})
          </p>
          {loading ? (
            <p style={{ color: MUTED, fontSize: '0.85rem' }}>Cargando…</p>
          ) : contactos.filter(c => c.activo).length === 0 ? (
            <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
              padding: '24px', textAlign: 'center' }}>
              <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>
                Sin contactos aún. Invita a alguien arriba.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contactos.filter(c => c.activo).map(c => (
                <div key={c.id} style={{ background: WHITE, borderRadius: 12,
                  border: `1px solid ${BORDER}`, padding: '12px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {c.nombre && (
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>{c.nombre}</p>
                    )}
                    <p style={{ margin: c.nombre ? '2px 0 0' : 0, color: MUTED, fontSize: '0.8rem' }}>
                      {c.email}
                    </p>
                  </div>
                  <button onClick={() => revocar(c.id)}
                    style={{ height: 32, borderRadius: 7, border: `1.5px solid ${BORDER}`,
                      background: WHITE, color: RED, fontFamily: 'inherit',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: '0 12px' }}>
                    Revocar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelSt: React.CSSProperties = {
  display: 'block', marginBottom: 4,
  fontSize: '0.72rem', fontWeight: 600, color: MUTED,
};

const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const,
  height: 40, borderRadius: 8, border: `1.5px solid ${BORDER}`,
  padding: '0 11px', fontSize: '0.88rem', fontFamily: 'inherit',
  color: TEXT, outline: 'none',
};
