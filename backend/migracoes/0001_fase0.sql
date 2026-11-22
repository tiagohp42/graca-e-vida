-- Fase 0: saber quando um pedido foi retirado do mural (estado "Retirado do mural").
-- Desfazer: backend/migracoes/0001_fase0_desfazer.sql
ALTER TABLE pedidos_oracao ADD COLUMN IF NOT EXISTS retirado_em timestamptz;
