-- ================================================================
-- MERCADO PÚBLICO MARKET INTELLIGENCE
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- 1. Enriquecer compras_agiles con campos del API
ALTER TABLE compras_agiles 
  ADD COLUMN IF NOT EXISTS organismo_rut TEXT,
  ADD COLUMN IF NOT EXISTS organismo_nombre TEXT,
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS lugar_entrega TEXT,
  ADD COLUMN IF NOT EXISTS plazo_entrega_dias INTEGER,
  ADD COLUMN IF NOT EXISTS productos_extraidos BOOLEAN DEFAULT false;

-- 2. Productos solicitados en cada compra ágil (base del mercado)
CREATE TABLE IF NOT EXISTS compra_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_agil_id UUID NOT NULL REFERENCES compras_agiles(id) ON DELETE CASCADE,
  codigo_mp BIGINT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  cantidad NUMERIC,
  unidad_medida TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compra_productos_compra_id ON compra_productos(compra_agil_id);
CREATE INDEX IF NOT EXISTS idx_compra_productos_nombre_fts ON compra_productos 
  USING gin(to_tsvector('spanish', nombre || ' ' || coalesce(descripcion, '')));

-- 3. Perfil de organismos compradores
CREATE TABLE IF NOT EXISTS organismos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  unidad_compra TEXT,
  region_num INTEGER,
  nombre_region TEXT,
  total_compras INTEGER DEFAULT 0,
  presupuesto_total_clp BIGINT DEFAULT 0,
  ultima_compra_at DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Resultados de matching IA: empresa × compra × ítem
CREATE TABLE IF NOT EXISTS compra_matchings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_agil_id UUID NOT NULL REFERENCES compras_agiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  compra_producto_id UUID REFERENCES compra_productos(id) ON DELETE CASCADE,
  catalogo_producto_id UUID REFERENCES catalogo_empresas(id) ON DELETE SET NULL,
  estado TEXT NOT NULL CHECK (estado IN ('cotizable', 'calculado', 'fuera')),
  precio_sugerido INTEGER,
  confianza NUMERIC(3,2),
  notas_ia TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(compra_agil_id, user_id, compra_producto_id)
);
CREATE INDEX IF NOT EXISTS idx_matchings_user ON compra_matchings(user_id);
CREATE INDEX IF NOT EXISTS idx_matchings_compra ON compra_matchings(compra_agil_id);

-- Vista: mercado de productos (qué compra el Estado y cuánto paga)
CREATE OR REPLACE VIEW mercado_productos AS
SELECT 
  cp.nombre,
  count(*) AS total_solicitudes,
  sum(cp.cantidad) AS unidades_totales,
  avg(ca.monto)::bigint AS presupuesto_promedio_compra,
  min(ca.fecha_publicacion) AS primera_vez,
  max(ca.fecha_publicacion) AS ultima_vez,
  array_agg(DISTINCT ca.region ORDER BY ca.region) AS regiones
FROM compra_productos cp
JOIN compras_agiles ca ON ca.id = cp.compra_agil_id
GROUP BY cp.nombre
ORDER BY total_solicitudes DESC;

-- Vista: perfil de organismos (qué organismos compran qué)
CREATE OR REPLACE VIEW organismo_perfil AS
SELECT
  o.nombre,
  o.nombre_region,
  o.total_compras,
  o.presupuesto_total_clp,
  o.ultima_compra_at
FROM organismos o
ORDER BY o.total_compras DESC;
