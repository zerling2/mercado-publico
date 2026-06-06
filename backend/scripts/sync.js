import { supabase } from '../lib/supabase.js';
import {
  fetchComprasAgiles,
  fetchLicitaciones,
  fetchOrdenesCompra,
} from '../lib/mercado-publico-api.js';

async function syncComprasAgiles() {
  console.log('🔄 Sincronizando compras ágiles...');
  const compras = await fetchComprasAgiles();

  if (compras.length === 0) {
    console.log('⚠️ No hay compras ágiles para sincronizar');
    return 0;
  }

  let inserted = 0;
  for (const compra of compras) {
    try {
      const { error } = await supabase
        .from('compras_agiles')
        .upsert({
          codigo: compra.codigo,
          nombre: compra.nombre,
          estado: compra.estado,
          monto: compra.monto,
          region: compra.region,
          fecha_publicacion: compra.fechaPublicacion,
          fecha_cierre: compra.fechaCierre,
          proveedor_cotizando_json: compra.proveedoresCotizando || [],
        });

      if (!error) inserted++;
    } catch (err) {
      console.error(`Error inserting compra ${compra.codigo}:`, err.message);
    }
  }

  console.log(`✅ ${inserted} compras ágiles sincronizadas`);
  return inserted;
}

async function syncLicitaciones() {
  console.log('🔄 Sincronizando licitaciones...');
  const licitaciones = await fetchLicitaciones();

  if (licitaciones.length === 0) {
    console.log('⚠️ No hay licitaciones para sincronizar');
    return 0;
  }

  let inserted = 0;
  for (const lic of licitaciones) {
    try {
      const { error } = await supabase
        .from('licitaciones')
        .upsert({
          codigo: lic.codigo,
          nombre: lic.nombre,
          monto: lic.monto,
          organismo: lic.organismo,
          proveedor_ganador: lic.proveedorGanador,
          fecha_publicacion: lic.fechaPublicacion,
          estado: lic.estado,
        });

      if (!error) inserted++;
    } catch (err) {
      console.error(`Error inserting licitación ${lic.codigo}:`, err.message);
    }
  }

  console.log(`✅ ${inserted} licitaciones sincronizadas`);
  return inserted;
}

async function syncOrdenesCompra() {
  console.log('🔄 Sincronizando órdenes de compra...');
  const ordenes = await fetchOrdenesCompra();

  if (ordenes.length === 0) {
    console.log('⚠️ No hay órdenes para sincronizar');
    return 0;
  }

  let inserted = 0;
  for (const orden of ordenes) {
    try {
      const { error } = await supabase
        .from('ordenes_compra')
        .upsert({
          codigo: orden.codigo,
          monto: orden.monto,
          organismo: orden.organismo,
          proveedor: orden.proveedor,
          fecha_adjudicacion: orden.fechaAdjudicacion,
          items_json: orden.items || [],
        });

      if (!error) inserted++;
    } catch (err) {
      console.error(`Error inserting orden ${orden.codigo}:`, err.message);
    }
  }

  console.log(`✅ ${inserted} órdenes de compra sincronizadas`);
  return inserted;
}

async function logSync(tabla, insertados, estado) {
  const { error } = await supabase.from('sync_log').insert({
    tabla,
    registros_insertados: insertados,
    estado,
  });

  if (error) console.error('Error logging sync:', error.message);
}

async function main() {
  console.log('\n========== SINCRONIZACIÓN INICIADA ==========');
  console.log(new Date().toISOString());

  try {
    const comprasInsertadas = await syncComprasAgiles();
    await logSync('compras_agiles', comprasInsertadas, 'exitoso');

    const licitacionesInsertadas = await syncLicitaciones();
    await logSync('licitaciones', licitacionesInsertadas, 'exitoso');

    const ordenesInsertadas = await syncOrdenesCompra();
    await logSync('ordenes_compra', ordenesInsertadas, 'exitoso');

    console.log('\n========== SINCRONIZACIÓN COMPLETADA ==========\n');
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    await logSync('general', 0, 'error');
  }
}

main();
