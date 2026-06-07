'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const BLUE  = '#003DA5';
const GREEN = '#059669';
const TEXT  = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const BG    = '#F9FAFB';
const WHITE = '#FFFFFF';

interface Contacto {
  id: string;
  nombre: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
}

export default function ContactosPage() {
  const { id: empresa_id } = useParams<{ id: string }>();

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [email,     setEmail]     = useState('');
  const [nombre,    setNombre]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState('');
  const [error,     setError]     = useState('');

  const fetchContactos = () => {
    setLoading(true);
    fetch(`/api/usuario-cliente?empresa_id=${empresa_id}`)
      .then(r => r.json())
      .then(d => { setContactos(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchContactos(); }, [empresa_id]);

  const invitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setError('');
    const res = await fetch('/api/usuario-cliente', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, empresa_id }),
    }).then(r => r.json());
    setSaving(false);
    if (res.error) { setError(res.error); }
    else { setMsg('Invitación enviada — el contacto recibirá un email para crear su cuenta.'); setEmail(''); setNombre(''); fetchContactos(); }
  };

  const revocar = async (id: string) => {
    await fetch('/api/usuario-cliente', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchContactos();
  };

  return (
    <div style={{ minHeight: '100vh', background: BG,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: TEXT }}>

      <header style={{ background: `linear-gradient(135deg,#00297A 0%,${BLUE} 100%)`,
        color: WHITE, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/app/asesor/empresa"
          style={{ color: WHITE, textDecoration: 'none', background: 'rgba(255,255,255,0.15)',
            borderRadius: 6, padding: '5px 10px', fontSize: '0.85rem' }}>←</Link>
        <div>
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Acceso del cliente</h1>
          <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>Gestiona quién puede ver las cotizaciones</p>
        </div>
      </header>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px' }}>

        {/* Invite form */}
        <div style={{ background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`,
          padding: '16px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '0.9rem' }}>Invitar contacto</p>
          <form onSubmit={invitar}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbSt}>Nombre</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Nombre del contacto"
                  style={inpSt} />
              </div>
              <div>
                <label style={lbSt}>Email *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="contacto@empresa.cl"
                  style={inpSt} />
              </div>
            </div>
            {error && <p style={{ margin: '0 0 10px', color: '#DC2626', fontSize: '0.82rem' }}>{error}</p>}
            {msg   && <p style={{ margin: '0 0 10px', color: GREEN,   fontSize: '0.82rem' }}>{msg}</p>}
            <button type="submit" disabled={saving}
              style={{ height: 42, borderRadius: 10, border: 'none', padding: '0 20px',
                background: BLUE, color: WHITE, fontFamily: 'inherit',
                fontSize: '0.85rem', fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </form>
        </div>

        {/* Contacts list */}
        <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700,
          color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Contactos con acceso ({contactos.filter(c => c.activo).length})
        </p>

        {loading ? (
          <p style={{ color: MUTED, fontSize: '0.85rem' }}>Cargando…</p>
        ) : contactos.length === 0 ? (
          <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`,
            padding: '24px', textAlign: 'center' }}>
            <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>Sin contactos aún.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contactos.map(c => (
              <div key={c.id} style={{ background: WHITE, borderRadius: 12,
                border: `1px solid ${BORDER}`, padding: '12px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                opacity: c.activo ? 1 : 0.45 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>
                    {c.nombre ?? '(sin nombre)'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: MUTED }}>{c.email ?? '—'}</p>
                </div>
                {c.activo && (
                  <button onClick={() => revocar(c.id)}
                    style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8,
                      color: '#DC2626', fontSize: '0.75rem', padding: '4px 10px',
                      cursor: 'pointer', fontFamily: 'inherit' }}>
                    Revocar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const lbSt: React.CSSProperties = {
  display: 'block', marginBottom: 4,
  fontSize: '0.68rem', fontWeight: 700, color: MUTED,
  textTransform: 'uppercase', letterSpacing: '0.04em',
};
const inpSt: React.CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  height: 40, borderRadius: 9, border: '1.5px solid #E5E7EB',
  padding: '0 10px', fontSize: '0.87rem', fontFamily: 'inherit',
  color: '#111827', outline: 'none', background: '#FAFAFA',
};
