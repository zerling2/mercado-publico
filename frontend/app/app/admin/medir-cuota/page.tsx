'use client';

import { useState } from 'react';

const AZUL = '#1B2A6B';
const VERDE = '#22C55E';
const ROJO  = '#EF4444';
const GRIS  = '#6B7280';

type Resultado = {
  ts: string; req: number; pagina: number;
  status: number | string; items: number; detalle?: string;
};

type Respuesta = {
  resumen: {
    exitosos: number; total_requests: number; primer_429: string;
    duracion_seg: string; rpm_sostenido: string;
    pagina_inicio: number; pagina_fin: number;
  };
  resultados: Resultado[];
  error?: string;
};

export default function MedirCuotaPage() {
  const [ticket, setTicket]       = useState('');
  const [estado, setEstado]       = useState<'idle' | 'corriendo' | 'listo' | 'error'>('idle');
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [paginaInicio, setPaginaInicio] = useState(1);

  async function medir() {
    if (!ticket.trim()) { alert('Ingresa el ticket primero'); return; }
    setEstado('corriendo');
    setRespuesta(null);
    try {
      const url = `/api/admin/medir-cuota?limite=12&espera_ms=1100&pagina_inicio=${paginaInicio}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${ticket.trim()}` },
      });
      const data: Respuesta = await r.json();
      if (data.error) { setEstado('error'); setRespuesta(data); return; }
      setRespuesta(data);
      setEstado('listo');
      if (data.resumen) {
        setPaginaInicio(data.resumen.pagina_fin + 1);
      }
    } catch (e) {
      setRespuesta({ error: String(e) } as Respuesta);
      setEstado('error');
    }
  }

  const res = respuesta?.resumen;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: AZUL, borderRadius: 12, padding: '16px 20px', marginBottom: 20, color: '#fff' }}>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase' }}>Admin</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700 }}>Medir cuota API MP</h1>
        </div>

        {/* Ticket input */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #E5E7EB' }}>
          <label style={{ fontSize: 12, color: GRIS, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            TICKET MERCADO PÚBLICO
          </label>
          <input
            value={ticket}
            onChange={e => setTicket(e.target.value)}
            placeholder="3C884C3E-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #D1D5DB', borderRadius: 8,
              padding: '10px 12px', fontSize: 13, fontFamily: 'monospace',
              outline: 'none',
            }}
          />
          <p style={{ margin: '8px 0 0', fontSize: 11, color: GRIS }}>
            Página de inicio: {paginaInicio} — cada llamada mide 12 páginas (~15s)
          </p>
        </div>

        {/* Botón */}
        <button
          onClick={medir}
          disabled={estado === 'corriendo'}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: estado === 'corriendo' ? GRIS : AZUL,
            color: '#fff', fontSize: 16, fontWeight: 700,
            border: 'none', cursor: estado === 'corriendo' ? 'not-allowed' : 'pointer',
            marginBottom: 20,
          }}
        >
          {estado === 'corriendo' ? '⏳ Midiendo... (~15s)' : estado === 'listo' ? '▶ Medir siguiente bloque' : '▶ Iniciar medición'}
        </button>

        {/* Resumen */}
        {res && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #E5E7EB' }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: GRIS, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Resumen</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Exitosos (200)', res.exitosos],
                ['Total requests', res.total_requests],
                ['Primer 429', res.primer_429],
                ['Duración', `${res.duracion_seg}s`],
                ['Req/min', res.rpm_sostenido],
                ['Páginas', `${res.pagina_inicio}–${res.pagina_fin}`],
              ].map(([label, val]) => (
                <div key={label as string} style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 12px' }}>
                  <p style={{ margin: 0, fontSize: 10, color: GRIS }}>{label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: AZUL }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabla de resultados */}
        {respuesta?.resultados && respuesta.resultados.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
            <p style={{ margin: 0, padding: '12px 16px', fontSize: 12, color: GRIS, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #E5E7EB' }}>
              Detalle por request
            </p>
            {respuesta.resultados.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', padding: '8px 16px',
                borderBottom: i < respuesta.resultados.length - 1 ? '1px solid #F3F4F6' : 'none',
                gap: 12,
              }}>
                <span style={{ fontSize: 11, color: GRIS, minWidth: 24 }}>#{r.req}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, minWidth: 40,
                  color: r.status === 200 ? VERDE : r.status === 429 ? ROJO : '#F59E0B',
                }}>
                  {r.status}
                </span>
                <span style={{ fontSize: 11, color: GRIS, flex: 1 }}>pág {r.pagina} · {r.items} items</span>
                {r.detalle && (
                  <span style={{ fontSize: 10, color: ROJO, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.detalle}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {estado === 'error' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, color: ROJO, fontWeight: 700, fontSize: 14 }}>Error</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: ROJO }}>{respuesta?.error ?? 'Error desconocido'}</p>
          </div>
        )}

        {/* Instrucción siguiente bloque */}
        {estado === 'listo' && res && res.primer_429 === 'ninguno' && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#166534' }}>
              ✓ Sin 429 en este bloque. Toca <strong>Medir siguiente bloque</strong> para continuar desde página {res.pagina_fin + 1}.
            </p>
          </div>
        )}

        {estado === 'listo' && res && res.primer_429 !== 'ninguno' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#991B1B' }}>
              ⚠ Se detectó rate limiting (429) en este bloque. Primer 429: {res.primer_429}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
