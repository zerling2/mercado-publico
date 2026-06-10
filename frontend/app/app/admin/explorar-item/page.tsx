'use client';

import { useState } from 'react';

const AZUL = '#1B2A6B';
const GRIS = '#6B7280';
const ROJO = '#EF4444';

export default function ExplorarItemPage() {
  const [ticket, setTicket] = useState('');
  const [estado, setEstado] = useState<'idle' | 'corriendo' | 'listo' | 'error'>('idle');
  const [data, setData]     = useState<Record<string, unknown> | null>(null);

  async function explorar() {
    if (!ticket.trim()) { alert('Ingresa el ticket primero'); return; }
    setEstado('corriendo');
    setData(null);
    try {
      const r    = await fetch('/api/admin/explorar-item', {
        headers: { Authorization: `Bearer ${ticket.trim()}` },
      });
      const text = await r.text();
      let json: Record<string, unknown>;
      try { json = JSON.parse(text); }
      catch { throw new Error(`Respuesta inesperada: ${text.slice(0, 200)}`); }
      setData(json);
      setEstado('listo');
    } catch (e) {
      setData({ error: String(e) });
      setEstado('error');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        <div style={{ background: AZUL, borderRadius: 12, padding: '16px 20px', marginBottom: 20, color: '#fff' }}>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase' }}>Admin</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700 }}>Explorar item API MP</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.7 }}>JSON crudo de un item de compra ágil + endpoint de detalle</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #E5E7EB' }}>
          <label style={{ fontSize: 12, color: GRIS, fontWeight: 600, display: 'block', marginBottom: 8 }}>TICKET</label>
          <input
            value={ticket}
            onChange={e => setTicket(e.target.value)}
            placeholder="3C884C3E-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
          />
        </div>

        <button
          onClick={explorar}
          disabled={estado === 'corriendo'}
          style={{ width: '100%', padding: 14, borderRadius: 12, background: estado === 'corriendo' ? GRIS : AZUL, color: '#fff', fontSize: 16, fontWeight: 700, border: 'none', cursor: estado === 'corriendo' ? 'not-allowed' : 'pointer', marginBottom: 20 }}
        >
          {estado === 'corriendo' ? '⏳ Consultando...' : '▶ Explorar item'}
        </button>

        {estado === 'error' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p style={{ margin: 0, color: ROJO, fontSize: 13 }}>{String(data?.error ?? '')}</p>
          </div>
        )}

        {estado === 'listo' && data && (
          <>
            {/* Lista - primer item */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
              <p style={{ margin: 0, padding: '10px 16px', fontSize: 12, fontWeight: 600, color: AZUL, borderBottom: '1px solid #F3F4F6', background: '#F8FAFC' }}>
                Lista — primer_item (HTTP {String((data.lista as Record<string,unknown>)?.status ?? '')})
              </p>
              <pre style={{ margin: 0, padding: 16, fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#374151', lineHeight: 1.6 }}>
                {JSON.stringify((data.lista as Record<string,unknown>)?.primer_item, null, 2)}
              </pre>
            </div>

            {/* Detalle */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
              <p style={{ margin: 0, padding: '10px 16px', fontSize: 12, fontWeight: 600, color: AZUL, borderBottom: '1px solid #F3F4F6', background: '#F8FAFC' }}>
                Detalle (HTTP {String((data.detalle as Record<string,unknown>)?.status ?? '')})
              </p>
              <p style={{ margin: 0, padding: '4px 16px 8px', fontSize: 10, color: GRIS, fontFamily: 'monospace' }}>
                {String((data.detalle as Record<string,unknown>)?.url ?? '')}
              </p>
              <pre style={{ margin: 0, padding: 16, fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#374151', lineHeight: 1.6 }}>
                {JSON.stringify((data.detalle as Record<string,unknown>)?.raw, null, 2)}
              </pre>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
