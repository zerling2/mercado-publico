export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const CATEGORIAS = [
  {
    id: 'impresion',
    nombre: 'Impresión y gráfica',
    keywords: [
      'impresion', 'impreso', 'imprimir', 'folleto', 'folleteria', 'afiche',
      'diptico', 'triptico', 'pendon', 'banner', 'señaletica', 'rotulo',
      'sticker', 'calcomania', 'vinilo', 'gigantografia', 'ploteo',
      'serigraf', 'litograf', 'tipograf', 'lona impresa', 'impresora',
      'toner', 'cartucho', 'tinta',
    ],
  },
  {
    id: 'vestuario',
    nombre: 'Vestuario y uniformes',
    keywords: [
      'vestuario', 'uniforme', 'indumentaria', 'polera', 'camiseta', 'camisa',
      'ropa', 'jockey', 'pechera', 'chaleco', 'pantalon', 'zapato', 'zapatilla',
      'calzado', 'gorra', 'delantal', 'parka', 'buzo', 'chomba', 'polerón',
      'corbata', 'prenda', 'impermeable', 'cortaviento', 'overol', 'mameluco',
    ],
  },
  {
    id: 'publicidad',
    nombre: 'Publicidad y difusión',
    keywords: [
      'publicidad', 'difusion', 'marketing', 'promocional', 'estandarte',
      'bandera', 'letrero', 'cartel', 'propaganda', 'prensa', 'pauta',
      'avisaje', 'spot', 'cuña radial', 'aviso', 'comunicacion institucional',
    ],
  },
  {
    id: 'reconocimientos',
    nombre: 'Reconocimientos y premios',
    keywords: [
      'reconocimiento', 'premio', 'medalla', 'trofeo', 'galvano', 'placa',
      'diploma', 'distincion', 'souvenir', 'taza', 'mug', 'regalo', 'obsequio',
      'incentivo', 'pin', 'insignia', 'condecorac', 'certificado de honor',
    ],
  },
  {
    id: 'oficina',
    nombre: 'Materiales de oficina',
    keywords: [
      'papeleria', 'carpeta', 'archivador', 'boligrafo', 'lapiz', 'cuaderno',
      'agenda', 'resma', 'papel bond', 'sobre', 'etiqueta', 'sello',
      'tijera', 'perforadora', 'grapadora', 'clip', 'fastener', 'block',
      'cinta adhesiva', 'corrector', 'marcador', 'resaltador', 'ligas',
      'suministros de oficina', 'insumos de oficina', 'utiles de oficina',
    ],
  },
  {
    id: 'alimentacion',
    nombre: 'Alimentación y catering',
    keywords: [
      'alimentacion', 'alimento', 'comida', 'catering', 'cafe', 'colacion',
      'bebestible', 'bebida', 'agua purificada', 'despensa', 'snack',
      'almuerzo', 'desayuno', 'once', 'refrigerio', 'fruta', 'verdura',
      'viveres', 'racion', 'servicio de alimentacion', 'lunch', 'coffebreak',
    ],
  },
  {
    id: 'embalaje',
    nombre: 'Embalaje y envases',
    keywords: [
      'embalaje', 'envase', 'bolsa', 'empaque', 'contenedor', 'packaging',
      'sachet', 'carton corrugado', 'burbuja', 'stretch', 'pallet',
      'fardo', 'caja de carton', 'bolsa plastica', 'film', 'zuncho',
    ],
  },
  {
    id: 'limpieza',
    nombre: 'Limpieza y aseo',
    keywords: [
      'limpieza', 'aseo', 'detergente', 'desinfectante', 'sanitizante',
      'higiene', 'baño', 'escoba', 'trapeador', 'mopa', 'cloro', 'lejia',
      'jabon', 'papel higienico', 'toalla nova', 'bolsa de basura',
      'cera de piso', 'lustrador', 'ambientador', 'dispensador',
      'productos de limpieza', 'articulos de aseo',
    ],
  },
  {
    id: 'tecnologia',
    nombre: 'Tecnología y equipos',
    keywords: [
      'computador', 'laptop', 'notebook', 'scanner', 'tablet', 'monitor',
      'teclado', 'mouse', 'servidor', 'celular', 'telefono', 'proyector',
      'cargador', 'disco duro', 'memoria', 'usb', 'cable datos', 'switch',
      'router', 'software', 'licencia', 'impresora', 'multifuncional',
      'equipo computacional', 'equipo tecnologico', 'dispositivo',
      'hardware', 'ups', 'rack de servidor', 'camara ip', 'dvr',
    ],
  },
  {
    id: 'mobiliario',
    nombre: 'Mobiliario y equipamiento',
    keywords: [
      'mobiliario', 'mueble', 'silla', 'mesa', 'escritorio', 'estante',
      'locker', 'rack', 'armario', 'archivero', 'cajonera', 'vitrina',
      'sofa', 'sillon', 'butaca', 'estanteria', 'pizarron', 'pizarra',
      'muebleria', 'recepcion', 'sala de espera', 'panel divisorio',
      'cortina', 'persiana', 'alfombra',
    ],
  },
  {
    id: 'construccion',
    nombre: 'Construcción y mantención',
    keywords: [
      'construccion', 'mantencion', 'pintura', 'herramienta', 'reparacion',
      'instalacion', 'obra', 'gasfiteria', 'electricidad', 'vidrio',
      'ceramica', 'cemento', 'fierro', 'madera', 'cerradura', 'soldadura',
      'plomeria', 'techado', 'cielo falso', 'pavimento', 'concreto',
      'revestimiento', 'demolicion', 'habilitacion', 'remodelacion',
      'infraestructura', 'jardineria', 'poda', 'paisajismo',
    ],
  },
  {
    id: 'salud',
    nombre: 'Salud y seguridad',
    keywords: [
      'salud', 'medico', 'enfermeria', 'farmacia', 'medicamento', 'implemento',
      'epp', 'seguridad', 'casco', 'guante de latex', 'mascarilla',
      'alcohol gel', 'termometro', 'botiquin', 'extintor', 'emergencia',
      'primeros auxilios', 'antiparras', 'protector auditivo', 'arnes',
      'insumo medico', 'insumo clinico', 'dental', 'equipamiento clinico',
    ],
  },
  {
    id: 'transporte',
    nombre: 'Transporte y combustible',
    keywords: [
      'transporte', 'furgon', 'camion', 'vehiculo', 'traslado', 'flete',
      'locomocion', 'bus', 'micro', 'van', 'combustible', 'bencina',
      'petroleo', 'diesel', 'gasolina', 'lubricante', 'aceite motor',
      'neumatico', 'llanta', 'courier', 'encomienda', 'despacho',
      'arriendo de vehiculo', 'servicio de transporte', 'taxi', 'uber',
    ],
  },
  {
    id: 'capacitacion',
    nombre: 'Capacitación y formación',
    keywords: [
      'capacitacion', 'curso', 'taller', 'formacion', 'entrenamiento',
      'induccion', 'charla', 'diplomado', 'certificacion', 'adiestramiento',
      'coaching', 'mentoria', 'relator', 'instructor', 'dictacion',
      'capacitar', 'programa de formacion', 'aprendizaje',
    ],
  },
  {
    id: 'eventos',
    nombre: 'Eventos y ceremonias',
    keywords: [
      'evento', 'jornada', 'seminario', 'conferencia', 'reunion', 'coloquio',
      'congreso', 'ceremonia', 'acto', 'lanzamiento', 'celebracion',
      'aniversario', 'inauguracion', 'graduacion', 'animacion', 'show',
      'espectaculo', 'protocolo', 'recepcion', 'banquete', 'coctel',
      'servicio de eventos', 'produccion de evento', 'audio video evento',
    ],
  },
  {
    id: 'audiovisual',
    nombre: 'Fotografía y multimedia',
    keywords: [
      'fotografia', 'video', 'audiovisual', 'filmacion', 'grabacion',
      'streaming', 'transmision en vivo', 'camara', 'sonido', 'audio',
      'amplificacion', 'pantalla led', 'iluminacion escena', 'produccion audiovisual',
      'edicion', 'postproduccion', 'fotografo', 'camarografo',
    ],
  },
];
