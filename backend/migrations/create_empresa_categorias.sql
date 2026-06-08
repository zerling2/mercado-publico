-- Tabla canónica de categorías por empresa
-- Fuente: 'catalogo' (derivado de productos) | 'manual' (asignado por asesor)
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS empresa_categorias (
  empresa_id  uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  categoria_id text NOT NULL,
  fuente       text NOT NULL DEFAULT 'manual',
  updated_at   timestamptz DEFAULT now(),
  PRIMARY KEY (empresa_id, categoria_id)
);

CREATE INDEX IF NOT EXISTS idx_empresa_categorias_empresa
  ON empresa_categorias(empresa_id);

CREATE INDEX IF NOT EXISTS idx_empresa_categorias_categoria
  ON empresa_categorias(categoria_id);
