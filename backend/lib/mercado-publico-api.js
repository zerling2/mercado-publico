import axios from 'axios';
import { CONFIG } from '../config.js';

const API_BASE = 'https://api2.mercadopublico.cl';
const TICKET = CONFIG.mercadoPublico.ticket;

export async function fetchComprasAgiles() {
  try {
    const response = await axios.get(
      `${API_BASE}/v2/compra-agil`,
      {
        headers: { 'X-API-KEY': TICKET },
        params: {
          region: CONFIG.mercadoPublico.region,
          estado: 'abierta',
          ttl_cambio_ms: 3600000,
        },
      }
    );
    console.log(`✅ Compras ágiles obtenidas: ${response.data.length || 0}`);
    return response.data || [];
  } catch (error) {
    console.error('❌ Error fetching compras ágiles:', error.message);
    return [];
  }
}

export async function fetchLicitaciones() {
  try {
    const response = await axios.get(
      'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json',
      {
        headers: { 'X-API-KEY': TICKET },
        params: {
          CodigoRegion: CONFIG.mercadoPublico.region,
          estado: 'vigente',
        },
      }
    );
    console.log(`✅ Licitaciones obtenidas: ${response.data.length || 0}`);
    return response.data || [];
  } catch (error) {
    console.error('❌ Error fetching licitaciones:', error.message);
    return [];
  }
}

export async function fetchOrdenesCompra() {
  try {
    const response = await axios.get(
      'https://api.mercadopublico.cl/servicios/v1/publico/OrdenCompra.json',
      {
        headers: { 'X-API-KEY': TICKET },
        params: {
          CodigoRegion: CONFIG.mercadoPublico.region,
        },
      }
    );
    console.log(`✅ Órdenes de compra obtenidas: ${response.data.length || 0}`);
    return response.data || [];
  } catch (error) {
    console.error('❌ Error fetching órdenes:', error.message);
    return [];
  }
}
