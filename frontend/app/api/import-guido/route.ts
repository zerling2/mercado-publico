import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const EXCEL_URL =
  'https://raw.githubusercontent.com/zerling2/mercado-publico/main/backend/data/OFERTA_ECONOMICA_2026_1.xlsx';

const USUARIO_GUIDO = {
  email: 'guido@imprentayvestuario.cl',
  empresa_nombre: 'Imprenta y Vestuario GUIDO',
  rut: '16000000-0',
  rubros_json: ['impresión', 'folletería', 'estampado', 'prendas', 'grabados'],
  region: 14,
};

const MARGEN_DEFAULT = 20;
const CATEGORIA_INICIAL = 'prendas_difusion';
const FILA_DATOS_INICIO = 6;

function normalizarCategoria(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');
}

interface Producto {
  codigo_producto: string;
  nombre: string;
  precio_base: number;
  categoria: string;
  margen_default: number;
}

function extraerProductos(ws: XLSX.WorkSheet): Producto[] {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  const productos: Producto[] = [];
  let categoriaActual = CATEGORIA_INICIAL;

  for (let i = FILA_DATOS_INICIO; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const esCabecera =
      row.length === 1 &&
      typeof row[0] === 'string' &&
      !String(row[0]).startsWith('TOTAL') &&
      !String(row[0]).startsWith('IVA') &&
      !String(row[0]).startsWith('Plazo') &&
      !String(row[0]).startsWith('Oferente') &&
      !String(row[0]).startsWith('Fecha');

    if (esCabecera) {
      categoriaActual = normalizarCategoria(String(row[0]));
      continue;
    }

    const esProducto =
      row.length >= 4 &&
      typeof row[0] === 'number' &&
      typeof row[1] === 'string' &&
      typeof row[3] === 'number';

    if (esProducto) {
      productos.push({
        codigo_producto: String(row[0]),
        nombre: String(row[1]).trim(),
        precio_base: row[3] as number,
        categoria: categoriaActual,
        margen_default: MARGEN_DEFAULT,
      });
    }
  }

  return productos;
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_KEY no configurada en Vercel' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const res = await fetch(EXCEL_URL);
  if (!res.ok) {
    return NextResponse.json(
      { error: `No se pudo descargar el Excel desde GitHub: ${res.status}` },
      { status: 500 }
    );
  }

  const buffer = await res.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const productos = extraerProductos(ws);

  const { data: userData, error: userError } = await supabase
    .from('users')
    .upsert(USUARIO_GUIDO, { onConflict: 'email' })
    .select('id')
    .single();

  if (userError) {
    return NextResponse.json(
      { error: `Error creando usuario: ${userError.message}` },
      { status: 500 }
    );
  }

  const userId = userData.id;
  let insertados = 0;
  let duplicados = 0;
  const errores: string[] = [];

  for (const producto of productos) {
    const { error } = await supabase
      .from('catalogo_empresas')
      .insert({ ...producto, user_id: userId });

    if (!error) {
      insertados++;
    } else if (error.code === '23505') {
      duplicados++;
    } else {
      errores.push(`${producto.nombre}: ${error.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    user_id: userId,
    productos_insertados: insertados,
    duplicados_ignorados: duplicados,
    ...(errores.length > 0 && { errores }),
  });
}
