import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
    keywords: ['impresion', 'impreso', 'imprimir', 'folleto', 'folleteria', 'afiche', 'diptico', 'triptico', 'pendon', 'banner', 'señaletica'],
  },
  {
    id: 'vestuario',
    nombre: 'Vestuario y uniformes',
    keywords: ['vestuario', 'uniforme', 'indumentaria', 'prenda', 'polera', 'camiseta', 'ropa', 'jockey', 'pechera', 'chaleco', 'pantalon'],
  },
  {
    id: 'publicidad',
    nombre: 'Publicidad y difusión',
    keywords: ['publicidad', 'difusion', 'marketing', 'promocional', 'estandarte', 'bandera', 'letrero', 'cartel'],
  },
  {
    id: 'reconocimientos',
    nombre: 'Reconocimientos y premios',
    keywords: ['reconocimiento', 'premio', 'medalla', 'trofeo', 'galvano', 'placa', 'diploma', 'distincion', 'souvenir', 'taza', 'mug'],
  },
  {
    id: 'oficina',
    nombre: 'Materiales de oficina',
    keywords: ['oficina', 'papel', 'toner', 'cartucho', 'papeleria', 'carpeta', 'archivador', 'boligrafo', 'lapiz', 'cuaderno', 'agenda'],
  },
  {
    id: 'alimentacion',
    nombre: 'Alimentación y catering',
    keywords: ['alimentacion', 'alimento', 'comida', 'catering', 'cafe', 'colacion', 'bebestible', 'bebida', 'agua', 'despensa', 'snack'],
  },
  {
    id: 'embalaje',
    nombre: 'Embalaje y envases',
    keywords: ['embalaje', 'envase', 'bolsa', 'empaque', 'plastico', 'contenedor', 'packaging', 'sachet'],
  },
  {
    id: 'limpieza',
    nombre: 'Limpieza y aseo',
    keywords: ['limpieza', 'aseo', 'detergente', 'desinfectante', 'sanitizante', 'higiene', 'baño'],
  },
  {
    id: 'tecnologia',
    nombre: 'Tecnología y equipos',
    keywords: ['computador', 'laptop', 'impresora', 'scanner', 'tablet', 'equipo', 'monitor', 'teclado', 'mouse', 'servidor'],
  },
  {
    id: 'mobiliario',
    nombre: 'Mobiliario y equipamiento',
    keywords: ['mobiliario', 'mueble', 'silla', 'mesa', 'escritorio', 'estante', 'locker', 'rack', 'armario'],
  },
  {
    id: 'construccion',
    nombre: 'Construcción y mantención',
    keywords: ['construccion', 'mantencion', 'pintura', 'herramienta', 'reparacion', 'instalacion', 'mantimiento', 'obra'],
  },
  {
    id: 'salud',
    nombre: 'Salud y seguridad',
    keywords: ['salud', 'medico', 'enfermeria', 'farmacia', 'medicamento', 'implemento', 'epp', 'seguridad', 'casco', 'guante'],
  },
];

export async function GET() {
  const { data: compras, error } = await sb()
    .from('compras_agiles')
    .select('nombre, fecha_cierre')
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();

  const items = (compras ?? []).map(c => ({
    nombre: normalizar(c.nombre ?? ''),
    activa: !c.fecha_cierre || new Date(c.fecha_cierre) > now,
  }));

  const totals = {
    total: items.length,
    activas: items.filter(i => i.activa).length,
    cerradas: items.filter(i => !i.activa).length,
  };

  const normCategorias = CATEGORIAS.map(cat => ({
    ...cat,
    normKeywords: cat.keywords.map(normalizar),
  }));

  const categorias = normCategorias.map(cat => {
    const matching = items.filter(i => cat.normKeywords.some(kw => i.nombre.includes(kw)));
    return {
      id: cat.id,
      nombre: cat.nombre,
      keywords: cat.keywords,
      count: matching.length,
      activas: matching.filter(i => i.activa).length,
      cerradas: matching.filter(i => !i.activa).length,
    };
  })
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);

  // licitaciones que matchean al menos una categoría (sin doble conteo)
  const allNormKws = normCategorias.flatMap(c => c.normKeywords);
  const enCategorias = items.filter(i => allNormKws.some(kw => i.nombre.includes(kw))).length;

  return NextResponse.json({ totals: { ...totals, enCategorias }, categorias });
}
