import axios from 'axios';
import { CONFIG } from '../config.js';

const API_V1 = 'https://api.mercadopublico.cl/servicios/v1/publico';
const API_V2 = 'https://api2.mercadopublico.cl';
const TICKET = CONFIG.mercadoPublico.ticket;

export async function fetchComprasAgiles() {
  try {
    const response = await axios.get(`${API_V2}/v2/compra-agil`, {
      params: {
        ticket: TICKET,
        region: CONFIG.mercadoPublico.region,
        estado: 'abierta',
        ttl_cambio_ms: 3600000,
      },
    });

    // La estructura real puede variar — loguear para ajustar el parser
    const raw = response.data;
    const lista = raw?.Listado ?? raw?.listado ?? raw?.data ?? raw ?? [];
    const arr = Array.isArray(lista) ? lista : [];
    console.log(`✅ Compras ágiles obtenidas: ${arr.length}`);
    return arr;
  } catch (error) {
    console.error('❌ Error fetching compras ágiles:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Body:', JSON.stringify(error.response.data).slice(0, 300));
    }
    return [];
  }
}

export async function fetchLicitaciones() {
  try {
    const response = await axios.get(`${API_V1}/licitaciones.json`, {
      params: {
        ticket: TICKET,
        CodigoRegion: CONFIG.mercadoPublico.region,
        Estado: 'vigente',
      },
    });

    const raw = response.data;
    const lista = raw?.Listado ?? raw?.listado ?? raw?.data ?? raw ?? [];
    const arr = Array.isArray(lista) ? lista : [];
    console.log(`✅ Licitaciones obtenidas: ${arr.length}`);
    return arr;
  } catch (error) {
    console.error('❌ Error fetching licitaciones:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Body:', JSON.stringify(error.response.data).slice(0, 300));
    }
    return [];
  }
}

export async function fetchOrdenesCompra() {
  try {
    const response = await axios.get(`${API_V1}/OrdenCompra.json`, {
      params: {
        ticket: TICKET,
        CodigoRegion: CONFIG.mercadoPublico.region,
      },
    });

    const raw = response.data;
    const lista = raw?.Listado ?? raw?.listado ?? raw?.data ?? raw ?? [];
    const arr = Array.isArray(lista) ? lista : [];
    console.log(`✅ Órdenes de compra obtenidas: ${arr.length}`);
    return arr;
  } catch (error) {
    console.error('❌ Error fetching órdenes:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Body:', JSON.stringify(error.response.data).slice(0, 300));
    }
    return [];
  }
}
