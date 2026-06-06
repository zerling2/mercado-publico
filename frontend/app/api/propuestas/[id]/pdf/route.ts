import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';

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

function generarPDF(
  usuario: { empresa_nombre: string; email: string; region: number },
  compra: { codigo: string; nombre: string; estado: string | null; monto: number | null; fecha_cierre: string | null },
  productos: ProductoPropuesto[],
  total: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const azul = '#1d4ed8';
    const gris = '#6b7280';
    const negro = '#111827';
    const pageWidth = 495; // 595 - 2×50

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.fontSize(20).font('Helvetica-Bold').fillColor(negro)
      .text(usuario.empresa_nombre, 50, 50);

    doc.fontSize(9).font('Helvetica').fillColor(gris)
      .text(`${usuario.email}  ·  Región ${usuario.region}`, 50, doc.y + 2);

    doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).strokeColor('#e5e7eb').stroke();

    // ── Título propuesta ─────────────────────────────────────────────────────
    const fechaHoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.moveDown(1.5);
    doc.fontSize(16).font('Helvetica-Bold').fillColor(azul)
      .text('PROPUESTA DE COTIZACIÓN');
    doc.fontSize(9).font('Helvetica').fillColor(gris)
      .text(`Generada el ${fechaHoy}`);

    // ── Datos de la compra ───────────────────────────────────────────────────
    doc.moveDown(1.2);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(negro).text('COMPRA ÁGIL');
    doc.moveDown(0.3);

    const infoCompra = [
      ['Código', compra.codigo],
      ['Descripción', compra.nombre],
      ['Estado', compra.estado ?? '—'],
      ['Monto estimado', compra.monto != null ? formatCLP(compra.monto) : '—'],
      ['Fecha de cierre', compra.fecha_cierre
        ? new Date(compra.fecha_cierre).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—'],
    ];

    doc.fontSize(9).font('Helvetica').fillColor(negro);
    for (const [label, valor] of infoCompra) {
      doc.text(`${label}:`, 50, doc.y, { continued: true, width: 110 });
      doc.font('Helvetica').fillColor(negro).text(valor, { width: pageWidth - 110 });
      doc.font('Helvetica').fillColor(negro);
    }

    // ── Tabla de productos ───────────────────────────────────────────────────
    doc.moveDown(1.2);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(negro).text('PRODUCTOS');
    doc.moveDown(0.5);

    const COL = { producto: 50, cant: 290, precioUnit: 360, subtotal: 450 };
    const COL_W = { producto: 230, cant: 60, precioUnit: 85, subtotal: 85 };
    const ROW_H = 18;

    // Cabecera tabla
    let y = doc.y;
    doc.rect(50, y - 2, pageWidth, ROW_H).fill('#f3f4f6');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151');
    doc.text('Producto', COL.producto, y, { width: COL_W.producto, lineBreak: false });
    doc.text('Cant.', COL.cant, y, { width: COL_W.cant, align: 'center', lineBreak: false });
    doc.text('Precio unit.', COL.precioUnit, y, { width: COL_W.precioUnit, align: 'right', lineBreak: false });
    doc.text('Subtotal', COL.subtotal, y, { width: COL_W.subtotal, align: 'right', lineBreak: false });
    y += ROW_H + 2;

    // Filas
    doc.font('Helvetica').fillColor(negro).fontSize(8);
    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      if (i % 2 === 0) doc.rect(50, y - 2, pageWidth, ROW_H).fill('#fafafa');

      doc.fillColor(negro);
      doc.text(p.nombre, COL.producto, y, { width: COL_W.producto, lineBreak: false });
      doc.text(String(p.cantidad), COL.cant, y, { width: COL_W.cant, align: 'center', lineBreak: false });
      doc.text(formatCLP(p.precio_unitario), COL.precioUnit, y, { width: COL_W.precioUnit, align: 'right', lineBreak: false });
      doc.text(formatCLP(p.subtotal), COL.subtotal, y, { width: COL_W.subtotal, align: 'right', lineBreak: false });
      y += ROW_H;
    }

    // Fila total
    y += 4;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#d1d5db').stroke();
    y += 6;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(negro);
    doc.text('TOTAL', COL.producto, y, { width: COL_W.producto + COL_W.cant + COL_W.precioUnit, lineBreak: false });
    doc.text(formatCLP(total), COL.subtotal, y, { width: COL_W.subtotal, align: 'right', lineBreak: false });

    // ── Pie ──────────────────────────────────────────────────────────────────
    doc.fontSize(8).font('Helvetica').fillColor(gris);
    const pieY = doc.page.height - 60;
    doc.moveTo(50, pieY).lineTo(545, pieY).strokeColor('#e5e7eb').stroke();
    doc.text('Propuesta generada por Mercado Público Dashboard', 50, pieY + 8, {
      width: pageWidth,
      align: 'center',
    });

    doc.end();
  });
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

  // Cargar propuesta
  const { data: propuesta, error: e1 } = await supabase
    .from('propuestas')
    .select('user_id, compra_agil_id, productos_propuestos_json, monto_total')
    .eq('id', params.id)
    .single();

  if (e1 || !propuesta) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 });
  }

  // Cargar compra y usuario en paralelo
  const [{ data: compra }, { data: usuario }] = await Promise.all([
    supabase
      .from('compras_agiles')
      .select('codigo, nombre, estado, monto, fecha_cierre')
      .eq('id', propuesta.compra_agil_id)
      .single(),
    supabase
      .from('users')
      .select('empresa_nombre, email, region')
      .eq('id', propuesta.user_id)
      .single(),
  ]);

  if (!compra || !usuario) {
    return NextResponse.json({ error: 'Datos incompletos para generar el PDF' }, { status: 404 });
  }

  const productos = (propuesta.productos_propuestos_json ?? []) as ProductoPropuesto[];
  const buffer = await generarPDF(usuario, compra, productos, propuesta.monto_total);

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="propuesta-${compra.codigo}.pdf"`,
    },
  });
}
