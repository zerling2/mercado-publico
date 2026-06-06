export interface ItemCatalogo {
  id: string;
  nombre: string;
  categoria: string | null;
  precio_base: number;
  margen_default: number;
}

export interface ProductoSugerido {
  catalogo_id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMatch(nombreProducto: string, nombreCompra: string): number {
  const producto = normalizar(nombreProducto);
  const compra = normalizar(nombreCompra);
  const palabrasCompra = compra.split(' ').filter(p => p.length > 3);
  let score = 0;
  for (const palabra of palabrasCompra) {
    if (producto.includes(palabra)) score += 10;
  }
  return score;
}

export function sugerirProductos(
  nombreCompra: string,
  catalogo: ItemCatalogo[],
  limite = 3
): ProductoSugerido[] {
  return catalogo
    .map(item => ({ item, score: scoreMatch(item.nombre, nombreCompra) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(({ item }) => {
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
