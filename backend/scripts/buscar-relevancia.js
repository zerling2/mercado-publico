import { supabase } from '../lib/supabase.js';

const EMAIL_USUARIO = 'guido@imprentayvestuario.cl';
const LIMITE_COMPRAS = 500;

// Términos con peso para detectar compras relevantes al rubro de GUIDO.
// Peso máximo acumulable: 100.
const PALABRAS_CLAVE = [
  // Núcleo del negocio
  { term: 'impresion',      peso: 15 },
  { term: 'imprimir',       peso: 12 },
  { term: 'impreso',        peso: 10 },
  { term: 'folleteria',     peso: 15 },
  { term: 'folleto',        peso: 12 },
  { term: 'estampado',      peso: 15 },
  { term: 'grabado',        peso: 15 },
  // Prendas y vestuario
  { term: 'indumentaria',   peso: 20 },
  { term: 'vestuario',      peso: 18 },
  { term: 'prenda',         peso: 15 },
  { term: 'uniforme',       peso: 15 },
  { term: 'polera',         peso: 15 },
  { term: 'camiseta',       peso: 12 },
  { term: 'jockey',         peso: 12 },
  { term: 'pechera',        peso: 12 },
  { term: 'ropa',           peso:  8 },
  // Difusión y publicidad
  { term: 'difusion',       peso: 20 },
  { term: 'publicidad',     peso: 15 },
  { term: 'bandera',        peso: 15 },
  { term: 'estandarte',     peso: 15 },
  { term: 'pendon',         peso: 15 },
  { term: 'banner',         peso: 12 },
  { term: 'flayer',         peso: 12 },
  { term: 'afiche',         peso: 12 },
  { term: 'diptico',        peso: 12 },
  { term: 'triptico',       peso: 12 },
  // Reconocimientos
  { term: 'reconocimiento', peso: 20 },
  { term: 'medalla',        peso: 15 },
  { term: 'trofeo',         peso: 15 },
  { term: 'galvano',        peso: 15 },
  { term: 'placa',          peso: 10 },
  { term: 'distincion',     peso: 12 },
  { term: 'premio',         peso: 10 },
  // Souvenirs / artículos promocionales
  { term: 'souvenir',       peso: 18 },
  { term: 'promocional',    peso: 15 },
  { term: 'corporativo',    peso: 10 },
  { term: 'taza',           peso: 12 },
  { term: 'mug',            peso: 12 },
  { term: 'agenda',         peso: 12 },
  { term: 'boligrafo',      peso: 10 },
  { term: 'credencial',     peso: 12 },
];

function normalizar(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcularRelevancia(nombreCompra) {
  const texto = normalizar(nombreCompra);
  let score = 0;
  const matches = [];

  for (const { term, peso } of PALABRAS_CLAVE) {
    if (texto.includes(term)) {
      score += peso;
      matches.push(term);
    }
  }

  return {
    score: Math.min(score, 100),
    matches,
  };
}

async function obtenerUsuario() {
  const { data, error } = await supabase
    .from('users')
    .select('id, rubros_json')
    .eq('email', EMAIL_USUARIO)
    .single();

  if (error) throw new Error(`Usuario no encontrado: ${error.message}`);
  return data;
}

async function obtenerCompras() {
  const { data, error } = await supabase
    .from('compras_agiles')
    .select('id, nombre, estado, monto, fecha_cierre')
    .order('fecha_publicacion', { ascending: false })
    .limit(LIMITE_COMPRAS);

  if (error) throw new Error(`Error cargando compras: ${error.message}`);
  return data ?? [];
}

async function upsertRelevancia(registros) {
  let insertados = 0;
  let actualizados = 0;
  let errores = 0;

  for (const reg of registros) {
    const { error } = await supabase
      .from('relevancia_compras')
      .upsert(reg, { onConflict: 'user_id,compra_agil_id' });

    if (!error) {
      insertados++;
    } else {
      console.error(`  Error en compra ${reg.compra_agil_id}: ${error.message}`);
      errores++;
    }
  }

  return { insertados, actualizados, errores };
}

async function main() {
  const usuario = await obtenerUsuario();
  console.log(`Usuario: ${EMAIL_USUARIO} (${usuario.id})`);

  const compras = await obtenerCompras();
  console.log(`Compras analizadas: ${compras.length}`);

  const relevantes = [];
  for (const compra of compras) {
    const { score, matches } = calcularRelevancia(compra.nombre);
    if (score > 0) {
      relevantes.push({
        user_id: usuario.id,
        compra_agil_id: compra.id,
        relevancia_score: score,
        razon_match: matches.join(', '),
        fecha_descubierta: new Date().toISOString(),
      });
    }
  }

  console.log(`Compras relevantes encontradas: ${relevantes.length}`);

  const { insertados, errores } = await upsertRelevancia(relevantes);
  console.log(`Guardadas: ${insertados} | Errores: ${errores}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
