import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });

export const CONFIG = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  mercadoPublico: {
    ticket: process.env.MERCADO_PUBLICO_TICKET,
    region: process.env.REGION_FILTER || '14',
  },
};
