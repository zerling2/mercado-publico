import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CATEGORIAS = [
  {
    id: 'impresion',
    nombre: 'Impresión y gráfica',
    emoji: '🖨️',
    keywords: ['impresion', 'impreso', 'imprimir', 'folleto', 'folleteria', 'afiche', 'diptico', 'triptico', 'pendon', 'banner', 'señaletica'],
  },
  {
    id: 'vestuario',
    nombre: 'Vestuario y uniformes',
    emoji: '👔',
    keywords: ['vestuario', 'uniforme', 'indumentaria', 'prenda', 'polera', 'camiseta', 'ropa', 'jockey', 'pechera', 'chaleco', 'pantalon'],
  },
  {
    id: 'publicidad',
    nombre: 'Publicidad y difusión',
    emoji: '📢',
    keywords: ['publicidad', 'difusion', 'marketing', 'promocional', 'estandarte', 'bandera', 'letrero', 'cartel'],
  },
  {
    id: 'reconocimientos',
    nombre: 'Reconocimientos y premios',
    emoji: '🏆',
    keywords: ['reconocimiento', 'premio', 'medalla', 'trofeo', 'galvano', 'placa', 'diploma', 'distincion', 'souvenir', 'taza', 'mug'],
  },
  {
    id: 'oficina',
    nombre: 'Materiales de oficina',
    emoji: '📎',
    keywords: ['oficina', 'papel', 'toner', 'cartucho', 'papeleria', 'carpeta', 'archivador', 'boligrafo', 'lapiz', 'cuaderno', 'agenda'],
  },
  {
    id: 'alimentacion',
    nombre: 'Alimentación y catering',
    emoji: '🍽️',
    keywords: ['alimentacion', 'alimento', 'comida', 'catering', 'cafe', 'colacion', 'bebestible', 'bebida', 'agua', 'despensa', 'snack'],
  },
  {
    id: 'embalaje',
    nombre: 'Embalaje y envases',
    emoji: '📦',
    keywords: ['embalaje', 'envase', 'bolsa', 'empaque', 'plastico', 'contenedor', 'packaging', 'sachet'],
  },
  {
    id: 'limpieza',
    nombre: 'Limpieza y aseo',
    emoji: '🧹',
    keywords: ['limpieza', 'aseo', 'detergente', 'desinfectante', 'sanitizante', 'higiene', 'baño'],
  },
  {
    id: 'tecnologia',
    nombre: 'Tecnología y equipos',
    emoji: '💻',
    keywords: ['computador', 'laptop', 'impresora', 'scanner', 'tablet', 'equipo', 'monitor', 'teclado', 'mouse', 'servidor'],
  },
  {
    id: 'mobiliario',
    nombre: 'Mobiliario y equipamiento',
    emoji: '🪑',
    keywords: ['mobiliario', 'mueble', 'silla', 'mesa', 'escritorio', 'estante', 'locker', 'rack', 'armario'],
  },
  {
    id: 'construccion',
    nombre: 'Construcción y mantención',
    emoji: '🔧',
    keywords: ['construccion', 'mantencion', 'pintura', 'herramienta', 'reparacion', 'instalacion', 'mantimiento', 'obra'],
  },
  {
    id: 'salud',
    nombre: 'Salud y seguridad',
    emoji: '🏥',
    keywords: ['salud', 'medico', 'enfermeria', 'farmacia', 'medicamento', 'implemento', 'epp', 'seguridad', 'casco', 'guante'],
  },
];

export async function GET() {
  const { data: compras, error } = await sb()
    .from('compras_agiles')
    .select('nombre')
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nombres = (compras ?? []).map(c => normalizar(c.nombre ?? ''));

  const resultado = CATEGORIAS.map(cat => {
    const count = nombres.filter(n => cat.keywords.some(kw => n.includes(kw))).length;
    return { ...cat, count };
  })
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return NextResponse.json(resultado);
}
