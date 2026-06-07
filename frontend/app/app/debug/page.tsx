'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<string>('Ejecutando...');

  useEffect(() => {
    const lines: string[] = [];

    const clienteToken = localStorage.getItem('cliente_token');
    const asesorToken  = localStorage.getItem('asesor_token');

    lines.push(`cliente_token: ${clienteToken ? clienteToken.slice(0, 30) + '...' : 'NO EXISTE'}`);
    lines.push(`asesor_token:  ${asesorToken  ? asesorToken.slice(0,  30) + '...' : 'NO EXISTE'}`);

    const token = clienteToken ?? asesorToken;
    if (!token) {
      lines.push('\n⚠️ Sin token — debes loggearte primero');
      setResult(lines.join('\n'));
      return;
    }

    Promise.all([
      fetch('/api/auth/perfil', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/cliente/bandeja', { headers: { Authorization: `Bearer ${token}` } }).then(async r => ({ status: r.status, body: await r.json() })),
    ]).then(([perfil, bandeja]) => {
      lines.push(`\n/api/auth/perfil:`);
      lines.push(JSON.stringify(perfil, null, 2));
      lines.push(`\n/api/cliente/bandeja (HTTP ${bandeja.status}):`);
      lines.push(JSON.stringify(bandeja.body, null, 2));
      setResult(lines.join('\n'));
    }).catch(e => {
      lines.push(`\nError: ${e.message}`);
      setResult(lines.join('\n'));
    });
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', fontSize: '0.75rem',
      background: '#0f172a', color: '#e2e8f0', minHeight: '100vh', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      <p style={{ color: '#94a3b8', marginTop: 0 }}>— Debug page (temporal) —</p>
      {result}
    </div>
  );
}
