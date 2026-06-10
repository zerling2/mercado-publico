'use client';

import { useState } from 'react';

const AZUL  = '#1B2A6B';
const VERDE = '#22C55E';
const ROJO  = '#EF4444';
const GRIS  = '#6B7280';

type Fila = { pagina: number; idx: number; codigo: string; fecha_pub: string; fecha_cierre: string };
type PaginaResult = { num: number; items: Fila[]; error?: string };
type Respuesta = {
  veredicto: string;
  total_items: number;
  quebrantos_encontrados: number;
  primeros_quebrantos: { anterior: string; actual: string }[];
  paginas: PaginaResult[];
  error?: string;
};

export default function VerificarOrdenPage() {
  const [ticket, setTicket] = useState('');
  const [estado, setEstado] = useState<'idle' | 'corriendo' | 'listo' | 'error'>('idle');
  const [data, setData]     = useState<Respuesta | null>(null);

  async function verificar() {
    if (!ticket.trim()) { alert('Ingresa el ticket primero'); return; }
    setEstado('corriendo');
    setData(null);
    try {
      const r    = await fetch('/api/admin/verificar-orden', {
        headers: { Authorization: `Bearer ${ticket.trim()}` },
      });
      const text = await r.text();
      let json: Respuesta;
      try { json = JSON.parse(text); }
      catch { throw new Error(`Respuesta inesperada: ${text.slice(0, 200)}`); }
      setData(json);
      setEstado(json.error ? 'error' : 'listo');
    } catch (e) {
      setData({ error: String(e) } as Respuesta);
      setEstado('error');
    }
  }

  const ok = data?.veredicto === 'ORDEN CRONOLÓGICO DESCENDENTE CONFIRMADO';

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: AZUL, borderRadius: 12, padding: '16px 20px', marginBottom: 20, color: '#fff' }}>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase' }}>Admin</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700 }}>Verificar orden API MP</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.7 }}>Consulta páginas 1–3 y verifica orden cronológico</p>
        </div>

        {/* Ticket */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #E5E7EB' }}>
          <label style={{ fontSize: 12, color: GRIS, fontWeight: 600, display: 'block', marginBottom: 8 }}>TICKET</label>
          <input
            value={ticket}
            onChange={e => setTicket(e.target.value)}
            placeholder="3C884C3E-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D1D5DB', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
          />
        </div>

        {/* Botón */}
        <button
          onClick={verificar}
          disabled={estado === 'corriendo'}
          style={{ width: '100%', padding: 14, borderRadius: 12, background: estado === 'corriendo' ? GRIS : AZUL, color: '#fff', fontSize: 16, fontWeight: 700, border: 'none', cursor: estado === 'corriendo' ? 'not-allowed' : 'pointer', marginBottom: 20 }}
        >
          {estado === 'corriendo' ? '⏳ Consultando 3 páginas (~8s)...' : '▶ Verificar orden'}
        </button>

        {/* Veredicto */}
        {data?.veredicto && (
          <div style={{ background: ok ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${ok ? '#BBF7D0' : '#FECACA'}`, borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: ok ? '#166534' : '#991B1B' }}>
              {ok ? '✅' : '⚠️'} {data.veredicto}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: GRIS }}>
              {data.total_items} items analizados · {data.quebrantos_encontrados} quiebres de orden
            </p>
          </div>
        )}

        {/* Quebrantos */}
        {(data?.primeros_quebrantos?.length ?? 0) > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
            <p style={{ margin: 0, padding: '12px 16px', fontSize: 12, color: GRIS, fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #F3F4F6' }}>Primeros quiebres</p>
            {data!.primeros_quebrantos.map((q, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: i < data!.primeros_quebrantos.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <p style={{ margin: 0, fontSize: 11, color: GRIS }}>Anterior: <span style={{ color: '#374151', fontFamily: 'monospace' }}>{q.anterior}</span></p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: ROJO }}>Actual (más reciente): <span style={{ fontFamily: 'monospace' }}>{q.actual}</span></p>
              </div>
            ))}
          </div>
        )}

        {/* Tablas por página */}
        {data?.paginas?.map(pg => (
          <div key={pg.num} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
            <p style={{ margin: 0, padding: '10px 16px', fontSize: 12, fontWeight: 600, color: AZUL, borderBottom: '1px solid #F3F4F6', background: '#F8FAFC' }}>
              Página {pg.num} — {pg.items.length} items {pg.error ? `· Error: ${pg.error}` : ''}
            </p>
            {pg.items.slice(0, 10).map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 16px', borderBottom: '1px solid #F9FAFB', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, color: GRIS, minWidth: 20 }}>{it.idx + 1}</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', minWidth: 130 }}>{it.codigo}</span>
                <span style={{ fontSize: 11, color: GRIS, flex: 1 }}>{it.fecha_pub?.slice(0, 10)}</span>
                <span style={{ fontSize: 11, color: GRIS }}>{it.fecha_cierre?.slice(0, 10)}</span>
              </div>
            ))}
            {pg.items.length > 10 && (
              <p style={{ margin: 0, padding: '8px 16px', fontSize: 11, color: GRIS }}>… y {pg.items.length - 10} items más</p>
            )}
          </div>
        ))}

        {/* Error */}
        {estado === 'error' && data?.error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, color: ROJO, fontSize: 13 }}>{data.error}</p>
          </div>
        )}

      </div>
    </div>
  );
}
