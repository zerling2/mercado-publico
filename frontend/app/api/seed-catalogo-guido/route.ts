import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GUIDO's catalog from OFERTA ECONÓMICA 2026
const PRODUCTOS = [
  // IMPRESIÓN / VESTUARIO
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'BANDAS REINA', unidad: '1', precio_base: 12000 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'BANDERAS 135X80 ESTAMPADAS', unidad: '1', precio_base: 16500 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'BANDERAS 3X1.80 ESTAMPADAS', unidad: '1', precio_base: 81000 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'BANDERINES CON DISEÑO 10 MTS', unidad: '1', precio_base: 60000 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'BOLSAS PUBLICITARIAS HASTA 28X34', unidad: '1', precio_base: 1800 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'BOLSAS PUBLICITARIAS HASTA 40X40', unidad: '1', precio_base: 3500 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'CARPETAS', unidad: '1', precio_base: 4000 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'ESTAMPADO PREMIUM', unidad: '1', precio_base: 5000 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'ESTAMPADO PRENDAS CLARAS Y OSCURAS', unidad: '1', precio_base: 3000 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'ESTAMPADO SUBLIMACIÓN', unidad: '1', precio_base: 2000 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'ESTANDARTES', unidad: '1', precio_base: 70000 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'JOCKEY DENIM', unidad: '1', precio_base: 5600 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'JOCKEY GABARDINA', unidad: '1', precio_base: 5300 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'JOCKEY MALLA', unidad: '1', precio_base: 4500 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'LANDYARD', unidad: '1', precio_base: 2500 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'PECHERAS GABARDINA', unidad: '1', precio_base: 11000 },
  { categoria: 'IMPRESION_VESTUARIO', nombre: 'PECHERAS MEZCLILLA', unidad: '1', precio_base: 15000 },
  // GRABADOS
  { categoria: 'GRABADOS', nombre: 'CHAPAS', unidad: '1', precio_base: 1200 },
  { categoria: 'GRABADOS', nombre: 'COPAS PREMIACIÓN 20 CMS', unidad: '1', precio_base: 15000 },
  { categoria: 'GRABADOS', nombre: 'COPAS PREMIACIÓN 30 CMS', unidad: '1', precio_base: 25000 },
  { categoria: 'GRABADOS', nombre: 'COPAS PREMIACIÓN 40 CMS', unidad: '1', precio_base: 35000 },
  { categoria: 'GRABADOS', nombre: 'CUADROS CON GRABADO 20X25', unidad: '1', precio_base: 20000 },
  { categoria: 'GRABADOS', nombre: 'CUADROS CON GRABADO 30X40', unidad: '1', precio_base: 40000 },
  { categoria: 'GRABADOS', nombre: 'GALVANOS CRISTAL', unidad: '20 CMS', precio_base: 24000 },
  { categoria: 'GRABADOS', nombre: 'GALVANOS MADERA', unidad: '20X25 CMS', precio_base: 18500 },
  { categoria: 'GRABADOS', nombre: 'GRABADO EN ACRILICO HASTA 10X10 CMS', unidad: '1', precio_base: 3500 },
  { categoria: 'GRABADOS', nombre: 'GRABADO EN ALUMINIO HASTA 10X10 CMS', unidad: '1', precio_base: 5000 },
  { categoria: 'GRABADOS', nombre: 'GRABADO EN CRISTAL HASTA 10X10 CMS', unidad: '1', precio_base: 5500 },
  { categoria: 'GRABADOS', nombre: 'GRABADO EN MADERA HASTA 10X10 CMS', unidad: '1', precio_base: 4500 },
  { categoria: 'GRABADOS', nombre: 'GRABADOS MINUTO DIVERSAS SUPERFICIES', unidad: '1', precio_base: 2000 },
  { categoria: 'GRABADOS', nombre: 'LLAVEROS ECOCUERO C/ GRABADO 1 CARA', unidad: '1', precio_base: 3000 },
  { categoria: 'GRABADOS', nombre: 'LLAVEROS MADERA C/ GRABADO 1 CARA', unidad: '1', precio_base: 3000 },
  { categoria: 'GRABADOS', nombre: 'LLAVEROS METALICOS C/ GRABADO 1 CARA', unidad: '1', precio_base: 3000 },
  { categoria: 'GRABADOS', nombre: 'MEDALLAS 5CM C/CINTA ESTAMPADA', unidad: '1', precio_base: 4500 },
  { categoria: 'GRABADOS', nombre: 'MEDALLAS 7CM C/CINTA ESTAMPADA', unidad: '1', precio_base: 5000 },
  { categoria: 'GRABADOS', nombre: 'PLACAS DE IDENTIFICACIÓN', unidad: '1', precio_base: 4500 },
  { categoria: 'GRABADOS', nombre: 'PLACAS PARA VARIOS', unidad: '1', precio_base: 4500 },
  // IMPRESIONES
  { categoria: 'IMPRESIONES', nombre: 'A2 1 CARA COUCHE', unidad: '1', precio_base: 3500 },
  { categoria: 'IMPRESIONES', nombre: 'A3 1 CARA COUCHE', unidad: '1', precio_base: 2500 },
  { categoria: 'IMPRESIONES', nombre: 'A4 1 CARA COUCHE', unidad: '1', precio_base: 1500 },
  { categoria: 'IMPRESIONES', nombre: 'ADHESIVO STICKERS HASTA 50MM', unidad: '1', precio_base: 150 },
  { categoria: 'IMPRESIONES', nombre: 'BANDERAS VELA 70X2MTS', unidad: '1', precio_base: 55000 },
  { categoria: 'IMPRESIONES', nombre: 'BOND', unidad: 'A4', precio_base: 100 },
  { categoria: 'IMPRESIONES', nombre: 'CREDENCIALES PVC 1 CARA', unidad: '1', precio_base: 3000 },
  { categoria: 'IMPRESIONES', nombre: 'DIPTICOS', unidad: 'A4', precio_base: 500 },
  { categoria: 'IMPRESIONES', nombre: 'FLAYER', unidad: '1/4 A4', precio_base: 130 },
  { categoria: 'IMPRESIONES', nombre: 'IMANTADOS IMPRESOS HASTA 9X6 CMS', unidad: '1', precio_base: 500 },
  { categoria: 'IMPRESIONES', nombre: 'IMPRESIONES VARIAS', unidad: '1', precio_base: 1000 },
  { categoria: 'IMPRESIONES', nombre: 'KRAF', unidad: '1', precio_base: 1000 },
  { categoria: 'IMPRESIONES', nombre: 'PENDON ROLLER 80X2MTS', unidad: '1', precio_base: 55000 },
  { categoria: 'IMPRESIONES', nombre: 'STICKERS HASTA 50MM', unidad: '1', precio_base: 150 },
  { categoria: 'IMPRESIONES', nombre: 'TARJETAS PRESENTACION 1 CARA', unidad: '1', precio_base: 100 },
  { categoria: 'IMPRESIONES', nombre: 'TELA PVC', unidad: '1mt2', precio_base: 10000 },
  { categoria: 'IMPRESIONES', nombre: 'TERMINACIONES OJETILLOS Y BOLSILLOS', unidad: '1', precio_base: 1000 },
  { categoria: 'IMPRESIONES', nombre: 'TRIPTICOS', unidad: 'A4', precio_base: 500 },
  { categoria: 'IMPRESIONES', nombre: 'WINDOW VISION', unidad: '1mt2', precio_base: 12000 },
  // SOUVENIRS
  { categoria: 'SOUVENIRS', nombre: 'AGENDAS ECOLOGICAS', unidad: '1', precio_base: 6000 },
  { categoria: 'SOUVENIRS', nombre: 'BOLIGRAFOS BAMBO', unidad: '1', precio_base: 1500 },
  { categoria: 'SOUVENIRS', nombre: 'BOLIGRAFOS ECOLOGICOS', unidad: '1', precio_base: 1000 },
  { categoria: 'SOUVENIRS', nombre: 'BOTELLAS', unidad: '1', precio_base: 3500 },
  { categoria: 'SOUVENIRS', nombre: 'CARPETAS ECOLOGICA', unidad: '1', precio_base: 3500 },
  { categoria: 'SOUVENIRS', nombre: 'CUADERNILLO ESTIMULACIÓN ADULTOS MAYORES', unidad: '1', precio_base: 4000 },
  { categoria: 'SOUVENIRS', nombre: 'CUADERNOS', unidad: '1', precio_base: 5000 },
  { categoria: 'SOUVENIRS', nombre: 'GOURMET', unidad: '1', precio_base: 3000 },
  { categoria: 'SOUVENIRS', nombre: 'IMANTADOS VARIOS', unidad: '1', precio_base: 1100 },
  { categoria: 'SOUVENIRS', nombre: 'LIBRETAS', unidad: '1', precio_base: 4000 },
  { categoria: 'SOUVENIRS', nombre: 'MATE BAMBO (BOMBILLA INCLUIDA)', unidad: '1', precio_base: 14000 },
  { categoria: 'SOUVENIRS', nombre: 'MATE LOZA (BOMBILLA INCLUIDA)', unidad: '1', precio_base: 6500 },
  { categoria: 'SOUVENIRS', nombre: 'MATE PORCELANA (BOMBILLA INCLUIDA)', unidad: '1', precio_base: 6000 },
  { categoria: 'SOUVENIRS', nombre: 'MEMO SET', unidad: '1', precio_base: 4000 },
  { categoria: 'SOUVENIRS', nombre: 'MUG', unidad: '1', precio_base: 10000 },
  { categoria: 'SOUVENIRS', nombre: 'PARAGUAS', unidad: '1', precio_base: 9000 },
  { categoria: 'SOUVENIRS', nombre: 'PENDRIVE BAMBO', unidad: '1', precio_base: 10000 },
  { categoria: 'SOUVENIRS', nombre: 'PENDRIVE CARTON', unidad: '1', precio_base: 9000 },
  { categoria: 'SOUVENIRS', nombre: 'SOMMELIER', unidad: '1', precio_base: 3000 },
  { categoria: 'SOUVENIRS', nombre: 'SOUVENIR BAMBO', unidad: '1', precio_base: 4000 },
  { categoria: 'SOUVENIRS', nombre: 'SOUVENIR DE TELA', unidad: '1', precio_base: 3000 },
  { categoria: 'SOUVENIRS', nombre: 'SOUVENIR ECOLOGICOS', unidad: '1', precio_base: 3000 },
  { categoria: 'SOUVENIRS', nombre: 'TAZONES BAMBO', unidad: '1', precio_base: 12000 },
  { categoria: 'SOUVENIRS', nombre: 'TAZONES CERAMICA', unidad: '1', precio_base: 3500 },
  { categoria: 'SOUVENIRS', nombre: 'TECNOLOGICOS', unidad: '1', precio_base: 4000 },
  { categoria: 'SOUVENIRS', nombre: 'TERMOS', unidad: '1', precio_base: 10000 },
  // PLOTTER CORTE
  { categoria: 'PLOTTER_CORTE', nombre: 'ALUMINIO Y VINILO', unidad: '1mt2', precio_base: 100000 },
  { categoria: 'PLOTTER_CORTE', nombre: 'FROSTER 60X1MTS', unidad: '1mt2', precio_base: 20000 },
  { categoria: 'PLOTTER_CORTE', nombre: 'INSTALACIONES', unidad: '1mt2', precio_base: 20000 },
  { categoria: 'PLOTTER_CORTE', nombre: 'LETRAS VOLUMETRICAS', unidad: '1mt2', precio_base: 50000 },
  { categoria: 'PLOTTER_CORTE', nombre: 'PVC Y VINILO', unidad: '1mt2', precio_base: 50000 },
  { categoria: 'PLOTTER_CORTE', nombre: 'VINILO CUBRIENTE 60X1M', unidad: '1mt2', precio_base: 20000 },
  // VARIOS
  { categoria: 'VARIOS', nombre: 'ANILLADO', unidad: 'HASTA 40 HOJAS', precio_base: 2000 },
  { categoria: 'VARIOS', nombre: 'CENEFAS', unidad: '1mt2', precio_base: 10000 },
  { categoria: 'VARIOS', nombre: 'CORONAS REINAS', unidad: '1', precio_base: 20000 },
  { categoria: 'VARIOS', nombre: 'DISEÑOS', unidad: '1', precio_base: 20000 },
  { categoria: 'VARIOS', nombre: 'MARCOS PARA FOTOGRAFIAS 20X30', unidad: '1', precio_base: 12000 },
  { categoria: 'VARIOS', nombre: 'MINI PENDON', unidad: '1/A3', precio_base: 15000 },
  { categoria: 'VARIOS', nombre: 'PALOMAS COMPLETAS', unidad: '1/60X120', precio_base: 45000 },
  { categoria: 'VARIOS', nombre: 'PLASTIFICADO', unidad: '1 HOJA', precio_base: 1000 },
];

export async function POST() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Find GUIDO by RUT
  const { data: guido, error: userErr } = await sb
    .from('users')
    .select('id')
    .eq('rut', '114241482')
    .maybeSingle();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!guido) return NextResponse.json({ error: 'Usuario GUIDO no encontrado. Verifica que el RUT 114241482 esté en la tabla users.' }, { status: 404 });

  const userId = guido.id;

  // Clear existing catalog for GUIDO and re-seed
  await sb.from('catalogo_empresas').delete().eq('user_id', userId);

  const rows = PRODUCTOS.map((p, i) => ({
    user_id: userId,
    codigo_producto: String(i + 1),
    nombre: p.nombre,
    categoria: p.categoria,
    unidad: p.unidad,
    precio_base: p.precio_base,
    margen_default: 20,
  }));

  const { error: insertErr } = await sb.from('catalogo_empresas').insert(rows);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    user_id: userId,
    productos_insertados: rows.length,
    categorias: [...new Set(PRODUCTOS.map(p => p.categoria))],
  });
}
