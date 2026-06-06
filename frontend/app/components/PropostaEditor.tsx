'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface ProductoPropuesto {
  catalogo_id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface ItemCatalogo {
  id: string;
  nombre: string;
  categoria: string | null;
  precio_base: number;
  margen_default: number;
}

interface Props {
  userId: string;
  compraId: string;
  productosIniciales: ProductoPropuesto[];
  catalogoCompleto: ItemCatalogo[];
}

export default function PropostaEditor({ userId, compraId, productosIniciales, catalogoCompleto }: Props) {
  const router = useRouter();
  const [productos, setProductos] = useState<ProductoPropuesto[]>(productosIniciales);
  const [editando, setEditando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState<'aceptada' | 'rechazada' | null>(null);
  const [propuestaId, setPropuestaId] = useState<string | null>(null);

  const total = productos.reduce((sum, p) => sum + p.subtotal, 0);

  const actualizarCantidad = (idx: number, cantidad: number) => {
    if (cantidad < 1) return;
    setProductos(prev => prev.map((p, i) =>
      i === idx ? { ...p, cantidad, subtotal: cantidad * p.precio_unitario } : p
    ));
  };

  const actualizarPrecio = (idx: number, precio: number) => {
    if (precio < 0) return;
    setProductos(prev => prev.map((p, i) =>
      i === idx ? { ...p, precio_unitario: precio, subtotal: p.cantidad * precio } : p
    ));
  };

  const eliminarProducto = (idx: number) => {
    setProductos(prev => prev.filter((_, i) => i !== idx));
  };

  const agregarDesideCatalogo = (item: ItemCatalogo) => {
    const yaExiste = productos.some(p => p.catalogo_id === item.id);
    if (yaExiste) return;
    const precio = Math.round(item.precio_base * (1 + item.margen_default / 100));
    setProductos(prev => [...prev, {
      catalogo_id: item.id,
      nombre: item.nombre,
      categoria: item.categoria ?? '',
      cantidad: 1,
      precio_unitario: precio,
      subtotal: precio,
    }]);
    setBusqueda('');
  };

  const guardar = async (estado: 'aceptada' | 'rechazada') => {
    setGuardando(true);
    try {
      const res = await fetch('/api/propuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          compra_agil_id: compraId,
          estado,
          productos_propuestos_json: estado === 'rechazada' ? [] : productos,
          monto_total: estado === 'rechazada' ? 0 : total,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');
      setPropuestaId(data.id ?? null);
      setGuardado(estado);
      setEditando(false);
    } catch (err) {
      alert(`Error al guardar: ${err instanceof Error ? err.message : 'desconocido'}`);
    } finally {
      setGuardando(false);
    }
  };

  const catalogoFiltrado = busqueda.length >= 2
    ? catalogoCompleto
        .filter(i =>
          i.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
          !productos.some(p => p.catalogo_id === i.id)
        )
        .slice(0, 8)
    : [];

  if (guardado) {
    return (
      <div style={card}>
        <p style={{ textAlign: 'center', padding: '2rem 2rem 1rem', color: guardado === 'aceptada' ? '#15803d' : '#9ca3af' }}>
          {guardado === 'aceptada' ? '✅ Propuesta guardada correctamente.' : '❌ Compra marcada como rechazada.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', padding: '0 2rem 2rem', flexWrap: 'wrap' }}>
          {guardado === 'aceptada' && propuestaId && (
            <a href={`/api/propuestas/${propuestaId}/pdf`} target="_blank" rel="noopener noreferrer" style={btnPDF}>
              📥 Descargar PDF
            </a>
          )}
          <button onClick={() => router.push('/dashboard')} style={btnSecundario}>
            ← Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabla de productos */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Productos propuestos</span>
          {!editando && (
            <button onClick={() => setEditando(true)} style={btnSecundario}>✏️ Editar</button>
          )}
        </div>

        {productos.length === 0 ? (
          <p style={{ padding: '1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
            Sin productos aún. Buscá en el catálogo abajo.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={th}>Producto</th>
                <th style={{ ...th, textAlign: 'center', width: 90 }}>Cant.</th>
                <th style={{ ...th, textAlign: 'right', width: 120 }}>Precio unit.</th>
                <th style={{ ...th, textAlign: 'right', width: 120 }}>Subtotal</th>
                {editando && <th style={{ ...th, width: 40 }} />}
              </tr>
            </thead>
            <tbody>
              {productos.map((p, i) => (
                <tr key={p.catalogo_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}>
                    <div style={{ fontSize: '0.875rem' }}>{p.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{p.categoria}</div>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {editando ? (
                      <input
                        type="number"
                        min={1}
                        value={p.cantidad}
                        onChange={e => actualizarCantidad(i, Number(e.target.value))}
                        style={inputNum}
                      />
                    ) : p.cantidad}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {editando ? (
                      <input
                        type="number"
                        min={0}
                        value={p.precio_unitario}
                        onChange={e => actualizarPrecio(i, Number(e.target.value))}
                        style={{ ...inputNum, width: 90 }}
                      />
                    ) : `$${p.precio_unitario.toLocaleString('es-CL')}`}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 500 }}>
                    ${p.subtotal.toLocaleString('es-CL')}
                  </td>
                  {editando && (
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button onClick={() => eliminarProducto(i)} style={btnEliminar}>×</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f9fafb' }}>
                <td colSpan={editando ? 3 : 2} style={{ ...td, fontWeight: 700 }}>Total</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>
                  ${total.toLocaleString('es-CL')}
                </td>
                {editando && <td />}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Buscador de catálogo */}
      {editando && (
        <div style={{ ...card, padding: '1rem 1.25rem', position: 'relative' }}>
          <input
            type="text"
            placeholder="Buscar en catálogo para agregar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={inputBusqueda}
          />
          {catalogoFiltrado.length > 0 && (
            <div style={dropdown}>
              {catalogoFiltrado.map(item => (
                <button
                  key={item.id}
                  onClick={() => agregarDesideCatalogo(item)}
                  style={dropdownItem}
                >
                  <span style={{ fontSize: '0.875rem' }}>{item.nombre}</span>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    ${Math.round(item.precio_base * (1 + item.margen_default / 100)).toLocaleString('es-CL')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => guardar('aceptada')}
          disabled={guardando || productos.length === 0}
          style={btnAceptar}
        >
          {guardando ? 'Guardando...' : '✅ Aceptar propuesta'}
        </button>
        <button
          onClick={() => guardar('rechazada')}
          disabled={guardando}
          style={btnRechazar}
        >
          ❌ Rechazar oportunidad
        </button>
      </div>
    </div>
  );
}

const card = { background: '#fff', borderRadius: 8, overflow: 'hidden', marginBottom: '1rem' };
const th = { padding: '0.65rem 1rem', textAlign: 'left' as const, fontWeight: 600, fontSize: '0.8rem', color: '#374151' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', verticalAlign: 'middle' as const };
const inputNum = { width: 56, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'center' as const, fontSize: '0.875rem' };
const inputBusqueda = { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' as const };
const dropdown = { position: 'absolute' as const, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10, maxHeight: 240, overflowY: 'auto' as const };
const dropdownItem = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', textAlign: 'left' as const };
const btnEliminar = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 };
const btnAceptar = { padding: '0.65rem 1.5rem', background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 };
const btnRechazar = { padding: '0.65rem 1.5rem', background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 8, fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 };
const btnSecundario = { padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer' };
const btnPDF = { padding: '0.5rem 1.25rem', background: '#1d4ed8', color: '#fff', borderRadius: 6, fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 };
