import { createClient } from '@supabase/supabase-js';

// Solo para uso en Server Components — nunca importar desde cliente
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
