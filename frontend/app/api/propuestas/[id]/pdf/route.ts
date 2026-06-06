import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ProductoPropuesto {
  nombre: string;
  categoria: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

function formatCLP(n: number): string {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const NEGRO  = rgb(0.07, 0.07, 0.07);
const GRIS   = rgb(0.42, 0.45, 0.50);
const AZUL   = rgb(0.11, 0.31, 0.87);
const FONDO  = rgb(0.95, 0.96, 0.98);
const LINEA  = rgb(0.88, 0.89, 0.91);

async function generarPDF(
  empresa: { empresa_nombre: string; email: string; region: number },
  compra: { codigo: string; nombre: string; estado: string | null; fecha_cierre: string | null },
  productos: ProductoPropuesto[],
  total: number
): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);

  const { height } = page.getSize();
  const L = 50;   // margen izquierdo
  const R = 545;  // margen derecho
  const W = R - L;
  let y = height - 50;

  const write = (text: string, x: number, yPos: number, size: number, font = regular, color = NEGRO) => {
    page.drawText(text, { x, y: yPos, size, font, color, maxWidth: R - x });
  };

  // ── Encabezado ───────────────────────────────────────────────────────────
  write(empresa.empresa_nombre, L, y, 18, bold);
  y -= 16;
  write(`${empresa.email}  ·  Región ${empresa.region}`, L, y, 9, regular, GRIS);
  y -= 14;
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.5, color: LINEA });
  y -= 22;

  // ── Título ───────────────────────────────────────────────────────────────
  write('PROPUESTA DE COTIZACIÓN', L, y, 16, bold, AZUL);
  y -= 14;
  const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  write(`Generada el ${fecha}`, L, y, 9, regular, GRIS);
  y -= 26;

  // ── Datos compra ─────────────────────────────────────────────────────────
  write('COMPRA ÁGIL', L, y, 10, bold);
  y -= 14;

  const labelW = 110;
  const filas: [string, string][] = [
    ['Código',         compra.codigo],
    ['Estado',         compra.estado ?? '—'],
    ['Cierre',         compra.fecha_cierre
      ? new Date(compra.fecha_cierre).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—'],
  ];

  for (const [label, valor] of filas) {
    write(`${label}:`, L, y, 9, regular, GRIS);
    write(valor, L + labelW, y, 9, regular, NEGRO);
    y -= 13;
  }

  // Nombre de la compra (puede ser largo)
  write('Descripción:', L, y, 9, regular, GRIS);
  const nombreLineas = compra.nombre.match(/.{1,70}/g) ?? [compra.nombre];
  for (const linea of nombreLineas.slice(0, 3)) {
    write(linea, L + labelW, y, 9, regular, NEGRO);
    y -= 12;
  }
  y -= 10;

  // ── Tabla productos ───────────────────────────────────────────────────────
  write('PRODUCTOS', L, y, 10, bold);
  y -= 14;

  const COL = { prod: L, cant: L + 230, precio: L + 300, sub: L + 400 };
  const COL_W = { prod: 220, cant: 60, precio: 95, sub: W - 400 };
  const ROW = 18;

  // Cabecera
  page.drawRectangle({ x: L, y: y - 4, width: W, height: ROW, color: FONDO });
  write('Producto',     COL.prod,   y, 8, bold, GRIS);
  write('Cant.',        COL.cant,   y, 8, bold, GRIS);
  write('Precio unit.', COL.precio, y, 8, bold, GRIS);
  write('Subtotal',     COL.sub,    y, 8, bold, GRIS);
  y -= ROW;
  page.drawLine({ start: { x: L, y: y + 2 }, end: { x: R, y: y + 2 }, thickness: 0.4, color: LINEA });

  // Filas
  for (let i = 0; i < productos.length; i++) {
    const p = productos[i];
    if (i % 2 === 0) page.drawRectangle({ x: L, y: y - 4, width: W, height: ROW, color: rgb(0.98, 0.98, 0.99) });
    write(p.nombre.substring(0, 38),        COL.prod,   y, 8, regular, NEGRO);
    write(String(p.cantidad),               COL.cant,   y, 8, regular, NEGRO);
    write(formatCLP(p.precio_unitario),     COL.precio, y, 8, regular, NEGRO);
    write(formatCLP(p.subtotal),            COL.sub,    y, 8, regular, NEGRO);
    y -= ROW;
  }

  // Fila total
  y -= 4;
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.5, color: NEGRO });
  y -= 14;
  write('TOTAL', COL.prod, y, 10, bold, NEGRO);
  write(formatCLP(total), COL.sub, y, 10, bold, NEGRO);

  // ── Pie ──────────────────────────────────────────────────────────────────
  const pieY = 35;
  page.drawLine({ start: { x: L, y: pieY + 12 }, end: { x: R, y: pieY + 12 }, thickness: 0.4, color: LINEA });
  write('Propuesta generada por Mercado Público Dashboard', L + W / 2 - 130, pieY, 8, regular, GRIS);

  const bytes = await doc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_KEY no configurada' }, { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data: propuesta, error: e1 } = await supabase
    .from('propuestas')
    .select('user_id, compra_agil_id, productos_propuestos_json, monto_total')
    .eq('id', params.id)
    .single();

  if (e1 || !propuesta) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 });
  }

  const [{ data: compra }, { data: usuario }] = await Promise.all([
    supabase
      .from('compras_agiles')
      .select('codigo, nombre, estado, fecha_cierre')
      .eq('id', propuesta.compra_agil_id)
      .single(),
    supabase
      .from('users')
      .select('empresa_nombre, email, region')
      .eq('id', propuesta.user_id)
      .single(),
  ]);

  if (!compra || !usuario) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 404 });
  }

  const productos = (propuesta.productos_propuestos_json ?? []) as ProductoPropuesto[];
  const pdfBytes = await generarPDF(usuario, compra, productos, propuesta.monto_total);

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="propuesta-${compra.codigo}.pdf"`,
    },
  });
}
