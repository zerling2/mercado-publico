import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

type Params = { user_id: string; compra_codigo: string };

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  header: { marginBottom: 20 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#6B7280', marginBottom: 2 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { width: 110, color: '#6B7280' },
  infoValue: { flex: 1 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6',
    padding: '6 8', borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: '7 8', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  colItem: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  colEstado: { flex: 1.2, textAlign: 'center' },
  headerText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6B7280' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, padding: '4 8' },
  totalLabel: { width: 120, textAlign: 'right', color: '#6B7280' },
  totalValue: { width: 90, textAlign: 'right' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: 2, padding: '6 8', backgroundColor: '#EFF6FF', borderRadius: 4 },
  grandTotalLabel: { width: 120, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#003DA5' },
  grandTotalValue: { width: 90, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#003DA5', fontSize: 12 },
  comentario: { padding: 10, backgroundColor: '#F9FAFB', borderRadius: 4, marginTop: 4 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40,
    textAlign: 'center', fontSize: 8, color: '#9CA3AF' },
});

function pesos(n: number) {
  return `$${n.toLocaleString('es-CL')}`;
}

function fechaCorta(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { user_id, compra_codigo } = params;

  // Load compra
  const { data: compra } = await sb()
    .from('compras_agiles')
    .select('id, codigo, nombre, organismo_nombre, monto, region, fecha_cierre, descripcion, lugar_entrega, plazo_entrega_dias')
    .eq('codigo', compra_codigo)
    .maybeSingle();

  if (!compra) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });

  // Load user (empresa)
  const { data: usuario } = await sb()
    .from('users')
    .select('empresa_nombre, rut')
    .eq('id', user_id)
    .maybeSingle();

  // Load items + matchings
  const { data: productos } = await sb()
    .from('compra_productos')
    .select('id, nombre, cantidad, unidad_medida')
    .eq('compra_agil_id', compra.id);

  const { data: matchings } = await sb()
    .from('compra_matchings')
    .select('compra_producto_id, estado, precio_sugerido, catalogo_producto_id')
    .eq('compra_agil_id', compra.id)
    .eq('user_id', user_id);

  const catalogoIds = matchings?.map(m => m.catalogo_producto_id).filter(Boolean) ?? [];
  const { data: catalogoItems } = catalogoIds.length
    ? await sb().from('catalogo_empresas').select('id, precio_base').in('id', catalogoIds)
    : { data: [] };
  const catalogoMap = new Map((catalogoItems ?? []).map(c => [c.id, c]));
  const matchMap = new Map((matchings ?? []).map(m => [m.compra_producto_id, m]));

  // Load comment
  const { data: rel } = await sb()
    .from('relevancia_compras')
    .select('comentario')
    .eq('user_id', user_id)
    .eq('compra_agil_id', compra.id)
    .maybeSingle();

  // Build rows
  const items = (productos ?? []).map(p => {
    const m = matchMap.get(p.id);
    const cat = m?.catalogo_producto_id ? catalogoMap.get(m.catalogo_producto_id) : null;
    const precio = m?.precio_sugerido ?? cat?.precio_base ?? 0;
    const cantidad = p.cantidad ?? 1;
    return {
      nombre: p.nombre,
      cantidad,
      unidad: p.unidad_medida ?? 'u',
      precio,
      total: precio * cantidad,
      estado: m?.estado ?? 'sin_análisis',
    };
  });

  const subtotal = items.reduce((s, r) => s + r.total, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  const hoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cotización</Text>
          <Text style={styles.subtitle}>{usuario?.empresa_nombre ?? ''} · RUT {usuario?.rut ?? ''}</Text>
          <Text style={styles.subtitle}>Fecha: {hoy}</Text>
        </View>

        {/* Compra info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Licitación</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.infoValue}>{compra.nombre}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Organismo</Text>
            <Text style={styles.infoValue}>{compra.organismo_nombre ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Código</Text>
            <Text style={styles.infoValue}>{compra.codigo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cierre</Text>
            <Text style={styles.infoValue}>{fechaCorta(compra.fecha_cierre)}</Text>
          </View>
          {compra.lugar_entrega && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lugar de entrega</Text>
              <Text style={styles.infoValue}>{compra.lugar_entrega}</Text>
            </View>
          )}
          {compra.plazo_entrega_dias && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plazo entrega</Text>
              <Text style={styles.infoValue}>{compra.plazo_entrega_dias} días</Text>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ítems cotizados</Text>

          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colItem, styles.headerText]}>Ítem</Text>
            <Text style={[styles.colQty, styles.headerText]}>Cant.</Text>
            <Text style={[styles.colPrice, styles.headerText]}>Precio unit.</Text>
            <Text style={[styles.colTotal, styles.headerText]}>Total</Text>
          </View>

          {items.map((it, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colItem}>{it.nombre}</Text>
              <Text style={styles.colQty}>{it.cantidad} {it.unidad}</Text>
              <Text style={styles.colPrice}>{it.precio > 0 ? pesos(it.precio) : 'Por definir'}</Text>
              <Text style={styles.colTotal}>{it.total > 0 ? pesos(it.total) : '—'}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal neto</Text>
            <Text style={styles.totalValue}>{pesos(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA 19%</Text>
            <Text style={styles.totalValue}>{pesos(iva)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>{pesos(total)}</Text>
          </View>
        </View>

        {/* Comment */}
        {rel?.comentario && (
          <View style={[styles.section, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <View style={styles.comentario}>
              <Text>{rel.comentario}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {usuario?.empresa_nombre ?? ''} — Cotización generada el {hoy}
        </Text>

      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cotizacion-${compra_codigo}.pdf"`,
    },
  });
}
