import { NextRequest, NextResponse } from 'next/server';

const API_V2 = 'https://api2.mercadopublico.cl';

export async function GET(
  _req: NextRequest,
  { params }: { params: { codigo: string; docId: string } }
) {
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  if (!ticket) return NextResponse.json({ error: 'sin ticket' }, { status: 500 });

  const { codigo, docId } = params;
  const base = `${API_V2}/v2/compra-agil/${encodeURIComponent(codigo)}/documentos/${docId}`;

  // Try authentication approaches in order
  const attempts: Array<() => Promise<Response>> = [
    () => fetch(base, { headers: { ticket } }),
    () => fetch(`${base}?ticket=${encodeURIComponent(ticket)}`),
    () => fetch(base, { headers: { 'x-api-key': ticket } }),
    () => fetch(base, { headers: { Authorization: `Bearer ${ticket}` } }),
  ];

  for (const attempt of attempts) {
    try {
      const r = await attempt();
      if (r.ok) {
        const ct = r.headers.get('content-type') ?? 'application/octet-stream';
        const cd = r.headers.get('content-disposition');
        const respHeaders: Record<string, string> = { 'Content-Type': ct };
        if (cd) respHeaders['Content-Disposition'] = cd;
        return new NextResponse(r.body, { headers: respHeaders });
      }
    } catch { /* try next */ }
  }

  return NextResponse.json(
    { error: 'Documento no accesible via API. Puede descargarlo directamente desde el portal de Mercado Público.' },
    { status: 404 }
  );
}
