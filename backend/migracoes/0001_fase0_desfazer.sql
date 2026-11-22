-- Desfaz a 0001_fase0.sql (perde só a data de retirada do mural)
ALTER TABLE pedidos_oracao DROP COLUMN IF EXISTS retirado_em;
