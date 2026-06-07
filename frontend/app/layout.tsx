import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mercado Público Dashboard',
  description: 'Dashboard de Compras Ágiles para PyMEs',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#003DA5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f5f7' }}>
        {children}
      </body>
    </html>
  );
}
