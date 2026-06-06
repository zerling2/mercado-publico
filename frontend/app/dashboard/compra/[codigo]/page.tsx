import Link from 'next/link';
import type { CSSProperties } from 'react';
import { supabaseServer as supabase } from '../../../../lib/supabase-server';
import PropostaEditor, { type ProductoPropuesto, type ItemCatalogo } from '../../../components/PropostaEditor';

const EMAIL_GUIDO = 'guido@imprentayvestuario.cl';

interface CompraAgil {
  id: string;
  codigo: string;
  nombre: string;
  estado: string | null;
  monto: number | null;
  region: string | null;
  fecha_publicacion: string | null;
  fecha_cierre: string | null;
}

function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchProductos(nombreCompra: string, catalogo: ItemCatalogo[]): ProductoPropuesto[] {
  const textoCompra = normalizarTexto(nombreCompra);
  const palabrasCompra = new Set(textoCompra.split(' ').filter(w => w.length >= 4));

  const scored = catalogo
    .map(item => {
      const palabrasItem = normalizarTexto(item.nombre).split(' ').filter(w => w.length >= 4);
      // Cuántas palabras del producto aparecen en el texto de la compra
      const hits = palabrasItem.filter(w => palabrasCompra.has(w)).length;
      // Cuántas palabras de la compra aparecen en el nombre del producto
      const hitsReverso = [...palabrasCompra].filter(w =>
        normalizarTexto(item.nombre).includes(w)
      ).length;
      return { item, score: Math.max(hits, hitsReverso) };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return scored.map(({ item }) => {
    const precio = Math.round(item.precio_base * (1 + item.margen_default / 100));
    return {
      catalogo_id: item.id,
      nombre: item.nombre,
      categoria: item.categoria ?? '',
      cantidad: 1,
      precio_unitario: precio,
      subtotal: precio,
    };
  });
}

async function getCompra(codigo: string): Promise<CompraAgil | null> {
  const { data } = await supabase
    .from('compras_agiles')
    .select('id, codigo, nombre, estado, monto, region, fecha_publicacion, fecha_cierre')
    .eq('codigo', codigo)
    .limit(1)
    .single();
  return data ?? null;
}

async function getCatalogo(userId: string): Promise<ItemCatalogo[]> {
  const { data } = await supabase
    .from('catalogo_empresas')
    .select('id, nombre, categoria, precio_base, margen_default')
    .eq('user_id', userId)
    .order('nombre');
  return data ?? [];
}

async function getUsuarioId(): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', EMAIL_GUIDO)
    .single();
  return data?.id ?? null;
}

export default async function CompraDetallePage({
  params,
}: {
  params: { codigo: string };
}) {
  const codigo = decodeURIComponent(params.codigo);
  const [compra, userId] = await Promise.all([getCompra(codigo), getUsuarioId()]);

  if (!compra) {
    return (
      <main style={main}>
        <Link href="/dashboard" style={backLink}>← Volver</Link>
        <p style={{ color: '#999', marginTop: '2rem' }}>Compra no encontrada.</p>
      </main>
    );
  }

  const catalogo = userId ? await getCatalogo(userId) : [];
  const productosMatch = matchProductos(compra.nombre, catalogo);

  return (
    <main style={main}>
      <Link href="/dashboard" style={backLink}>← Dashboard</Link>

      {/* Cabecera de la compra */}
      <div style={cabecera}>
        <div>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Compra Ágil
          </p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{compra.codigo}</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>{compra.nombre}</p>
        </div>
        <div style={metaGrid}>
          <MetaDato label="Estado" valor={compra.estado} />
          <MetaDato
            label="Monto estimado"
            valor={compra.monto != null ? `$${compra.monto.toLocaleString('es-CL')}` : null}
          />
          <MetaDato label="Región" valor={compra.region} />
          <MetaDato
            label="Cierre"
            valor={compra.fecha_cierre
              ? new Date(compra.fecha_cierre).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
              : null}
          />
        </div>
      </div>

      {/* Propuesta */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '1.75rem 0 0.75rem' }}>
        Propuesta de cotización
        {productosMatch.length > 0 && (
          <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6b7280', marginLeft: '0.5rem' }}>
            ({productosMatch.length} productos sugeridos automáticamente)
          </span>
        )}
      </h2>

      {!userId ? (
        <p style={{ color: '#9ca3af' }}>Usuario no configurado.</p>
      ) : (
        <PropostaEditor
          userId={userId}
          compraId={compra.id}
          productosIniciales={productosMatch}
          catalogoCompleto={catalogo}
        />
      )}
    </main>
  );
}

function MetaDato({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{valor ?? '—'}</div>
    </div>
  );
}

const main: CSSProperties = { maxWidth: 860, margin: '0 auto', padding: '2rem 1rem' };
const backLink: CSSProperties = { fontSize: '0.85rem', color: '#6b7280', textDecoration: 'none' };
const cabecera: CSSProperties = { background: '#fff', borderRadius: 8, padding: '1.25rem 1.5rem', marginTop: '1rem' };
const metaGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' };
