import { supabase } from '../lib/supabase.js';
import {
  fetchComprasAgiles,
  fetchLicitaciones,
  fetchOrdenesCompra,
} from '../lib/mercado-publico-api.js';

// Campos según doc API v2 (payload.items[]):
//   codigo, nombre, estado.codigo, montos.monto_disponible_clp,
//   institucion.region, fechas.fecha_publicacion, fechas.fecha_cierre
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
      const { error } = await supabase.from('compras_agiles').upsert({
        codigo: compra.codigo,
        nombre: compra.nombre,
        estado: compra.estado?.codigo,
        monto: compra.montos?.monto_disponible_clp,
        region: compra.institucion?.region,
        fecha_publicacion: compra.fechas?.fecha_publicacion,
        fecha_cierre: compra.fechas?.fecha_cierre,
        proveedor_cotizando_json: [],
      });

      if (!error) inserted++;
      else console.error(`Error upsert compra ${compra.codigo}:`, error.message);
    } catch (err) {
      console.error(`Error inserting compra ${compra.codigo}:`, err.message);
    }
  }

  console.log(`✅ ${inserted}/${compras.length} compras ágiles sincronizadas`);
  return inserted;
}

// Campos según doc API v1 (Listado[]):
//   CodigoExterno, Nombre, MontoEstimado, Comprador.NombreOrganismo,
//   Fechas.FechaPublicacion, Estado
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
      const { error } = await supabase.from('licitaciones').upsert({
        codigo: lic.CodigoExterno,
        nombre: lic.Nombre,
        monto: lic.MontoEstimado,
        organismo: lic.Comprador?.NombreOrganismo,
        proveedor_ganador: null,
        fecha_publicacion: lic.Fechas?.FechaPublicacion,
        estado: lic.Estado,
      });

      if (!error) inserted++;
      else console.error(`Error upsert licitación ${lic.CodigoExterno}:`, error.message);
    } catch (err) {
      console.error(`Error inserting licitación ${lic.CodigoExterno}:`, err.message);
    }
  }

  console.log(`✅ ${inserted}/${licitaciones.length} licitaciones sincronizadas`);
  return inserted;
}

// Campos según doc API v1 (Listado[]):
//   Codigo, Total, Comprador.NombreOrganismo, Proveedor.Nombre,
//   Fechas.FechaEnvio, Items.Listado
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
      const { error } = await supabase.from('ordenes_compra').upsert({
        codigo: orden.Codigo,
        monto: orden.Total,
        organismo: orden.Comprador?.NombreOrganismo,
        proveedor: orden.Proveedor?.Nombre,
        fecha_adjudicacion: orden.Fechas?.FechaEnvio,
        items_json: orden.Items?.Listado ?? [],
      });

      if (!error) inserted++;
      else console.error(`Error upsert orden ${orden.Codigo}:`, error.message);
    } catch (err) {
      console.error(`Error inserting orden ${orden.Codigo}:`, err.message);
    }
  }

  console.log(`✅ ${inserted}/${ordenes.length} órdenes de compra sincronizadas`);
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

  // MVP: solo sincroniza Compras Ágiles. Licitaciones y Órdenes fase 2.
  try {
    const comprasInsertadas = await syncComprasAgiles();
    await logSync('compras_agiles', comprasInsertadas, 'exitoso');

    // const licitacionesInsertadas = await syncLicitaciones();
    // await logSync('licitaciones', licitacionesInsertadas, 'exitoso');

    // const ordenesInsertadas = await syncOrdenesCompra();
    // await logSync('ordenes_compra', ordenesInsertadas, 'exitoso');

    console.log('\n========== SINCRONIZACIÓN COMPLETADA ==========\n');
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    await logSync('general', 0, 'error');
  }
}

main();
