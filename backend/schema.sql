-- Comunidade Graça e Vida · tabelas do banco (Neon / Lakebase Postgres)
-- Aplicar com: npm run db:migrate  (pode rodar mais de uma vez)

CREATE TABLE IF NOT EXISTS visitantes (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  nome           text NOT NULL,
  whatsapp       text NOT NULL,
  email          text,
  nascimento     date,
  bairro         text,
  origem         text,
  quer_visita    boolean NOT NULL DEFAULT false,
  quer_celula    boolean NOT NULL DEFAULT false,
  quer_batismo   boolean NOT NULL DEFAULT false,
  quer_jesus     boolean NOT NULL DEFAULT false,
  quer_oracao    boolean NOT NULL DEFAULT false,
  endereco       text,
  melhor_horario text,
  pedido         text,
  mensagem       text,
  consentimento  boolean NOT NULL,
  status         text NOT NULL DEFAULT 'Novo'
);

CREATE TABLE IF NOT EXISTS inscricoes (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  evento        text NOT NULL,
  nome          text NOT NULL,
  whatsapp      text NOT NULL,
  email         text,
  pessoas       int NOT NULL DEFAULT 1 CHECK (pessoas BETWEEN 1 AND 10),
  obs           text,
  consentimento boolean NOT NULL,
  confirmado    boolean NOT NULL DEFAULT false
);

-- "autor_publico" é só o primeiro nome (ou "Anônimo"): é o que o mural mostra.
-- O nome completo fica em "nome" e nunca sai na consulta pública.
CREATE TABLE IF NOT EXISTS pedidos_oracao (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  nome          text,
  anonimo       boolean NOT NULL DEFAULT false,
  autor_publico text NOT NULL,
  pedido        text NOT NULL,
  visibilidade  text NOT NULL CHECK (visibilidade IN ('Mural', 'Privado')),
  aprovado      boolean NOT NULL DEFAULT false,
  oracoes       int NOT NULL DEFAULT 0,
  origem        text NOT NULL DEFAULT 'oracao'
);

CREATE INDEX IF NOT EXISTS pedidos_oracao_mural_idx
  ON pedidos_oracao (criado_em DESC) WHERE visibilidade = 'Mural' AND aprovado;

-- Exportações em CSV guardadas no bucket "assets" (Object Storage)
CREATE TABLE IF NOT EXISTS exportacoes (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  tabela     text NOT NULL,
  chave      text NOT NULL,
  linhas     int NOT NULL,
  feito_por  text NOT NULL
);

-- Equipe com acesso à área /admin/. Os super admins ficam em SUPER_ADMIN_EMAILS (variável da Function).
CREATE TABLE IF NOT EXISTS equipe (
  email         text PRIMARY KEY,
  user_id       text NOT NULL,
  nome          text,
  adicionado_em timestamptz NOT NULL DEFAULT now(),
  convite_id    bigint
);

-- Links de cadastro da equipe: guardamos só o hash do token. Valem 7 dias e uma vez só.
CREATE TABLE IF NOT EXISTS convites (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash  text NOT NULL UNIQUE,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  criado_por  text NOT NULL,
  expira_em   timestamptz NOT NULL,
  usado_em    timestamptz,
  usado_por   text,
  revogado    boolean NOT NULL DEFAULT false
);
