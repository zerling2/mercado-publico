import axios from 'axios';
import { CONFIG } from '../config.js';

const API_V1 = 'http://api.mercadopublico.cl/servicios/v1/publico';
const API_V2 = 'https://api2.mercadopublico.cl';
const TICKET = CONFIG.mercadoPublico.ticket;

// Auth: header 'ticket' (doc sección 3.1)
// Respuesta: { success, payload: { items[], paginacion } }
export async function fetchComprasAgiles() {
  try {
    const response = await axios.get(`${API_V2}/v2/compra-agil`, {
      headers: { ticket: TICKET },
      params: { ttl_cambio_ms: 3600000 },
    });

    const raw = response.data;
    console.log('📦 Compras ágiles — estructura recibida:', JSON.stringify(raw).slice(0, 600));

    const items = raw?.payload?.items ?? [];
    console.log(`✅ Compras ágiles obtenidas: ${items.length}`);
    return items;
  } catch (error) {
    console.error('❌ Error fetching compras ágiles:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Body:', JSON.stringify(error.response.data).slice(0, 500));
    }
    return [];
  }
}

// Auth: query param 'ticket' (doc introducción)
// Respuesta: { Cantidad, Listado: [] }
export async function fetchLicitaciones() {
  try {
    const response = await axios.get(`${API_V1}/licitaciones.json`, {
      params: { ticket: TICKET },
    });

    const raw = response.data;
    console.log('📦 Licitaciones — estructura recibida:', JSON.stringify(raw).slice(0, 600));

    const lista = raw?.Listado ?? [];
    console.log(`✅ Licitaciones obtenidas: ${lista.length}`);
    return lista;
  } catch (error) {
    console.error('❌ Error fetching licitaciones:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Body:', JSON.stringify(error.response.data).slice(0, 500));
    }
    return [];
  }
}

// Auth: query param 'ticket' (doc introducción)
// Respuesta: { Cantidad, Listado: [] }
export async function fetchOrdenesCompra() {
  try {
    const response = await axios.get(`${API_V1}/OrdenCompra.json`, {
      params: { ticket: TICKET },
    });

    const raw = response.data;
    console.log('📦 Órdenes — estructura recibida:', JSON.stringify(raw).slice(0, 600));

    const lista = raw?.Listado ?? [];
    console.log(`✅ Órdenes de compra obtenidas: ${lista.length}`);
    return lista;
  } catch (error) {
    console.error('❌ Error fetching órdenes:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Body:', JSON.stringify(error.response.data).slice(0, 500));
    }
    return [];
  }
}
