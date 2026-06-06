import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const EXCEL_PATH = join(__dirname, '../data/OFERTA_ECONOMICA_2026_1.xlsx');

const USUARIO_GUIDO = {
  email: 'guido@imprentayvestuario.cl',
  empresa_nombre: 'Imprenta y Vestuario GUIDO',
  rut: '16000000-0',
  rubros_json: ['impresión', 'folletería', 'estampado', 'prendas', 'grabados'],
  region: 14,
};

const MARGEN_DEFAULT = 20;

// Primera sección del Excel no tiene header explícito — contiene banderas, prendas y estampados
const CATEGORIA_INICIAL = 'prendas_difusion';
const FILA_DATOS_INICIO = 6; // índice 0-based de la primera fila de producto

function normalizarCategoria(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');
}

function extraerProductos(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const productos = [];
  let categoriaActual = CATEGORIA_INICIAL;

  for (let i = FILA_DATOS_INICIO; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Fila de categoría: un solo string, sin ser total ni footer
    const esCabecera =
      row.length === 1 &&
      typeof row[0] === 'string' &&
      !row[0].startsWith('TOTAL') &&
      !row[0].startsWith('IVA') &&
      !row[0].startsWith('Plazo') &&
      !row[0].startsWith('Oferente') &&
      !row[0].startsWith('Fecha');

    if (esCabecera) {
      categoriaActual = normalizarCategoria(row[0]);
      continue;
    }

    // Fila de producto: [número, nombre, unidad, precio]
    const esProducto =
      row.length >= 4 &&
      typeof row[0] === 'number' &&
      typeof row[1] === 'string' &&
      typeof row[3] === 'number';

    if (esProducto) {
      productos.push({
        codigo_producto: String(row[0]),
        nombre: row[1].trim(),
        precio_base: row[3],
        categoria: categoriaActual,
        margen_default: MARGEN_DEFAULT,
      });
    }
  }

  return productos;
}

async function upsertUsuario() {
  const { data, error } = await supabase
    .from('users')
    .upsert(USUARIO_GUIDO, { onConflict: 'email' })
    .select('id')
    .single();

  if (error) throw new Error(`Error creando usuario: ${error.message}`);
  return data.id;
}

async function insertarProductos(userId, productos) {
  let insertados = 0;
  let duplicados = 0;
  let errores = 0;

  for (const producto of productos) {
    const { error } = await supabase
      .from('catalogo_empresas')
      .insert({ ...producto, user_id: userId });

    if (!error) {
      insertados++;
    } else if (error.code === '23505') {
      duplicados++;
    } else {
      console.error(`  Error en "${producto.nombre}": ${error.message}`);
      errores++;
    }
  }

  return { insertados, duplicados, errores };
}

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const productos = extraerProductos(ws);

  console.log(`Productos extraídos del Excel: ${productos.length}`);

  const userId = await upsertUsuario();
  console.log(`Usuario Guido → id: ${userId}`);

  const { insertados, duplicados, errores } = await insertarProductos(userId, productos);
  console.log(`Insertados: ${insertados} | Duplicados ignorados: ${duplicados} | Errores: ${errores}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
