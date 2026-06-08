-- Agregar campo categorias a compras_agiles
-- Ejecutar en Supabase SQL Editor

ALTER TABLE compras_agiles
  ADD COLUMN IF NOT EXISTS categorias text[];

CREATE INDEX IF NOT EXISTS idx_compras_agiles_categorias
  ON compras_agiles USING GIN(categorias);

-- Comentario: el campo se pobla via /api/admin/backfill-categorias
-- y se actualiza automáticamente al recalcular categorias-licitaciones.
