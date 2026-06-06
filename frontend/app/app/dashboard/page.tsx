import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

async function getPrimerUsuario(): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const { data } = await supabase
    .from('users')
    .select('id')
    .order('created_at')
    .limit(1)
    .single();
  return data?.id ?? null;
}

export default async function DashboardIndexPage() {
  const userId = await getPrimerUsuario();
  if (userId) {
    redirect(`/app/dashboard/${userId}`);
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#003DA5' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Mercado Público</h1>
        <p style={{ color: '#666', fontSize: '1rem' }}>No hay usuarios configurados aún.</p>
      </div>
    </main>
  );
}
