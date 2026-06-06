import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mercado Público Dashboard',
  description: 'Dashboard de Compras Ágiles para PyMEs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f5f7' }}>
        {children}
      </body>
    </html>
  );
}
