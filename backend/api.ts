/* Comunidade Graça e Vida · API do site (Neon Function "api")
 *
 * Público (sem login):
 *   GET  /?acao=mural      pedidos aprovados do mural
 *   GET  /?acao=eventos    eventos publicados de hoje em diante
 *   GET  /?acao=teste      checa a ligação com o banco
 *   POST /                 formulários: { tipo: "visitante" | "inscricao" | "oracao" | "orei", ... }
 *   POST /mural/live       consulta selada do Realtime para o mural ao vivo
 *
 * Convite (Authorization: Bearer <JWT>, qualquer conta logada):
 *   GET  /convite?token=...        o link ainda vale?
 *   POST /convite/aceitar          { token } -> entra para a equipe com o nível do convite
 *
 * Admin (Authorization: Bearer <JWT do Neon Auth>; dono em SUPER_ADMIN_IDS ou membro ativo da tabela equipe).
 * O que cada nível pode fazer está em NIVEIS.
 *   GET  /admin/eu, /admin/historico
 *   GET  /admin/equipe · POST /admin/convites, /admin/convites/:id/revogar,
 *        /admin/equipe/adicionar, /admin/equipe/acao                       (só super)
 *   GET  /admin/eventos · POST /admin/eventos, /admin/eventos/:id/arte, /admin/eventos/:id/excluir
 *   GET  /admin/:tabela            visitantes | inscricoes | oracao
 *   POST /admin/oracao/:id         { aprovado?: boolean, visibilidade?: "Mural" | "Privado" }
 *   POST /admin/exportar/:tabela   gera CSV no Object Storage e devolve link temporário
 */
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { Pool } from "pg";
import { attachDatabasePool } from "@neon/functions";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createRealtime, rawSql } from "@neon/realtime/server";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";
import { createHash, randomBytes } from "node:crypto";

const FUSO = "America/Sao_Paulo";
const ORIGENS = [/^https:\/\/(www\.)?gracaevida\.com$/, /^https:\/\/tiagohp42\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);

const realtime = createRealtime({
  secret: (process.env.REALTIME_SECRET || process.env.NEON_REALTIME_SECRET)!,
  db: new URL(process.env.DATABASE_URL!).pathname.slice(1),
});

const files = new Files({ adapter: neon({ bucket: "assets" }) });
// Artes dos eventos: bucket público, lido direto pelo site
const artes = new Files({ adapter: neon({ bucket: "eventos" }) });

const jwks = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));
const issuer = new URL(process.env.NEON_AUTH_BASE_URL!).origin;
// Super admins pelo id da conta no Neon Auth (o e-mail sozinho não basta: o cadastro não verifica e-mail)
const SUPER = (process.env.SUPER_ADMIN_IDS || "").split(",").map((e) => e.trim()).filter(Boolean);
const CONVITE_DIAS = 7;

/* ---------- utilidades ---------- */
function txt(v: unknown, max = 200): string {
  return String(v ?? "").trim().slice(0, max);
}
function data(v: unknown): string | null {
  const s = txt(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
function primeiroNome(nome: string): string {
  return nome.split(/\s+/)[0] || "";
}
function dm(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO }).format(d);
}

// Limite simples por IP (por isolate): 10 envios por minuto
const envios = new Map<string, number[]>();
function limiteOk(ip: string): boolean {
  const agora = Date.now();
  const lista = (envios.get(ip) || []).filter((t) => agora - t < 60_000);
  if (lista.length >= 10) return false;
  lista.push(agora);
  envios.set(ip, lista);
  if (envios.size > 5000) envios.clear();
  return true;
}
function ipDe(c: Context): string {
  return (c.req.header("x-forwarded-for") || "").split(",")[0].trim() || "?";
}

/* ---------- mural ---------- */
type LinhaMural = { id: string; autor_publico: string; pedido: string; criado_em: Date; oracoes: number };

const SQL_MURAL =
  "SELECT id, autor_publico, pedido, criado_em, oracoes FROM pedidos_oracao " +
  "WHERE visibilidade = 'Mural' AND aprovado ORDER BY criado_em DESC LIMIT 60";

async function mural() {
  const { rows } = await pool.query<LinhaMural>(SQL_MURAL);
  return rows.map((r) => ({ id: String(r.id), autor: r.autor_publico, texto: r.pedido, data: dm(r.criado_em), oracoes: r.oracoes }));
}

/* ---------- formulários ---------- */
async function salvar(d: Record<string, unknown>): Promise<string | null> {
  if (d.tipo === "visitante") {
    const nome = txt(d.nome, 120), whatsapp = txt(d.whatsapp, 20);
    if (!nome || !whatsapp || d.consentimento !== true) return "faltam-dados";
    const pedido = txt(d.pedido, 600);
    await pool.query(
      `WITH v AS (
         INSERT INTO visitantes (nome, whatsapp, email, nascimento, bairro, origem, quer_visita, quer_celula, quer_batismo,
           quer_jesus, quer_oracao, endereco, melhor_horario, pedido, mensagem, consentimento)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true) RETURNING id)
       INSERT INTO pedidos_oracao (nome, anonimo, autor_publico, pedido, visibilidade, origem)
       SELECT $1, false, $16, $14, 'Privado', 'visitante' FROM v WHERE $11 AND $14 <> ''`,
      [nome, whatsapp, txt(d.email, 120), data(d.nascimento), txt(d.bairro, 80), txt(d.origem, 60),
        d.visita === true, d.celula === true, d.batismo === true, d.jesus === true, d.oracao === true,
        txt(d.endereco, 160), txt(d.melhorHorario, 120), pedido, txt(d.mensagem, 1000), primeiroNome(nome) || "Anônimo"],
    );
    return null;
  }
  if (d.tipo === "inscricao") {
    const nome = txt(d.nome, 120), whatsapp = txt(d.whatsapp, 20), evento = txt(d.evento, 120);
    if (!nome || !whatsapp || !evento || d.consentimento !== true) return "faltam-dados";
    const pessoas = Math.max(1, Math.min(10, parseInt(String(d.pessoas), 10) || 1));
    await pool.query(
      "INSERT INTO inscricoes (evento, nome, whatsapp, email, pessoas, obs, consentimento) VALUES ($1,$2,$3,$4,$5,$6,true)",
      [evento, nome, whatsapp, txt(d.email, 120), pessoas, txt(d.obs, 600)],
    );
    return null;
  }
  if (d.tipo === "oracao") {
    const pedido = txt(d.pedido, 600);
    if (!pedido) return "faltam-dados";
    const nome = txt(d.nome, 80);
    const anonimo = d.anonimo === true || !nome;
    await pool.query(
      "INSERT INTO pedidos_oracao (nome, anonimo, autor_publico, pedido, visibilidade) VALUES ($1,$2,$3,$4,$5)",
      [anonimo ? null : nome, anonimo, anonimo ? "Anônimo" : primeiroNome(nome), pedido, d.visibilidade === "Privado" ? "Privado" : "Mural"],
    );
    return null;
  }
  if (d.tipo === "orei") {
    const id = txt(d.id, 20);
    if (/^\d+$/.test(id)) {
      await pool.query(
        "UPDATE pedidos_oracao SET oracoes = oracoes + 1 WHERE id = $1 AND visibilidade = 'Mural' AND aprovado",
        [id],
      );
    }
    return null;
  }
  return "tipo-desconhecido";
}

/* ---------- admin ---------- */
type Usuario = { id: string; email: string; nome: string; iat: number };
type Nivel = "super" | "admin" | "editor" | "tesouraria" | "lider" | "midia";
type Permissoes = {
  tabelas: string[];      // abas de cadastros que pode ver
  mural: boolean;         // aprovar/tirar pedidos do mural
  eventos: boolean;       // criar e editar eventos
  exportar: boolean;      // exportar CSV das tabelas que vê
  usuarios: boolean;      // gerenciar a equipe (só super)
};
type Admin = Usuario & { super: boolean; dono: boolean; nivel: Nivel; perm: Permissoes };

const NIVEIS: Record<Nivel, Permissoes> = {
  super: { tabelas: ["oracao", "visitantes", "inscricoes"], mural: true, eventos: true, exportar: true, usuarios: true },
  admin: { tabelas: ["oracao", "visitantes", "inscricoes"], mural: true, eventos: true, exportar: true, usuarios: false },
  editor: { tabelas: ["oracao"], mural: true, eventos: true, exportar: false, usuarios: false },
  tesouraria: { tabelas: ["inscricoes"], mural: false, eventos: false, exportar: true, usuarios: false },
  lider: { tabelas: ["visitantes"], mural: false, eventos: false, exportar: false, usuarios: false },
  midia: { tabelas: [], mural: false, eventos: true, exportar: false, usuarios: false },
};
const NOMES_NIVEL = Object.keys(NIVEIS) as Nivel[];

async function usuario(c: Context): Promise<Usuario | null> {
  const h = c.req.header("authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  try {
    const { payload } = await jwtVerify(h.slice(7), jwks, { issuer });
    if (!payload.sub) return null;
    return { id: payload.sub, email: String(payload.email || "").toLowerCase(), nome: String(payload.name || ""), iat: payload.iat || 0 };
  } catch {
    return null;
  }
}

async function admin(c: Context): Promise<Admin | null> {
  const u = await usuario(c);
  if (!u) return null;
  if (SUPER.includes(u.id)) return { ...u, super: true, dono: true, nivel: "super", perm: NIVEIS.super };
  const { rows } = await pool.query<{ nivel: Nivel; bloqueado: boolean; logout_em: Date | null }>(
    "SELECT nivel, bloqueado, logout_em FROM equipe WHERE user_id = $1", [u.id],
  );
  const m = rows[0];
  if (!m || m.bloqueado) return null;
  // Forçar logout / senha nova: tokens emitidos antes disso não valem mais
  if (m.logout_em && u.iat * 1000 < m.logout_em.getTime()) return null;
  return { ...u, super: m.nivel === "super", dono: false, nivel: m.nivel, perm: NIVEIS[m.nivel] || NIVEIS.midia };
}

const quem = (c: Context) => c.get("admin" as never) as Admin;

async function registrar(a: Admin, acao: string, alvo?: string | null, detalhes?: Record<string, unknown>) {
  await pool.query(
    "INSERT INTO atividades (user_id, email, acao, alvo, detalhes) VALUES ($1,$2,$3,$4,$5)",
    [a.id, a.email, acao, alvo ?? null, detalhes ? JSON.stringify(detalhes) : null],
  );
}

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

// O que cada nível enxerga de cada tabela
function consulta(tabela: string, a: Admin): string | null {
  if (!a.perm.tabelas.includes(tabela)) return null;
  if (tabela === "visitantes") {
    return a.nivel === "lider"
      ? "SELECT id, criado_em, nome, whatsapp, bairro, quer_celula, melhor_horario, status FROM visitantes WHERE quer_celula ORDER BY criado_em DESC LIMIT 500"
      : "SELECT * FROM visitantes ORDER BY criado_em DESC LIMIT 500";
  }
  if (tabela === "oracao") {
    return a.nivel === "editor"
      ? "SELECT id, criado_em, autor_publico AS nome, pedido, visibilidade, aprovado, oracoes, origem FROM pedidos_oracao WHERE visibilidade = 'Mural' ORDER BY criado_em DESC LIMIT 500"
      : "SELECT * FROM pedidos_oracao ORDER BY criado_em DESC LIMIT 500";
  }
  if (tabela === "inscricoes") return "SELECT * FROM inscricoes ORDER BY criado_em DESC LIMIT 500";
  return null;
}

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const cel = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((k) => cel(r[k])).join(","))].join("\n");
}

/* ---------- eventos ---------- */
const ARTE_URL = (process.env.AWS_ENDPOINT_URL_S3 || "").replace(/\/$/, "") + "/eventos/";
const ARTE_TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const ARTE_MAX = 5 * 1024 * 1024;

type Evento = { id: string; titulo: string; descricao: string | null; data: string; horario: string | null; local: string | null; vagas: number | null; arte_chave: string | null; publicado: boolean };
const SQL_EVENTO = "SELECT id, titulo, descricao, to_char(data, 'YYYY-MM-DD') AS data, horario, local, vagas, arte_chave, publicado FROM eventos";
const comArte = (e: Evento) => ({ ...e, id: String(e.id), arte: e.arte_chave ? ARTE_URL + e.arte_chave : null });

/* ---------- rotas ---------- */
const app = new Hono();

app.use("*", cors({
  origin: (o) => (ORIGENS.some((re) => re.test(o)) ? o : null),
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS"],
}));

app.onError((err, c) => {
  console.error(err);
  return c.json({ ok: false, erro: "falha" }, 500);
});

app.get("/", async (c) => {
  const acao = c.req.query("acao");
  if (acao === "mural") return c.json({ ok: true, pedidos: await mural() });
  if (acao === "eventos") {
    const { rows } = await pool.query<Evento>(
      SQL_EVENTO + " WHERE publicado AND data >= (now() AT TIME ZONE 'America/Sao_Paulo')::date ORDER BY data, id LIMIT 30",
    );
    return c.json({ ok: true, eventos: rows.map(comArte) });
  }
  if (acao === "teste") {
    await pool.query("SELECT 1");
    return c.json({ ok: true, mensagem: "Ligação com o banco funcionando." });
  }
  return c.json({ ok: false, erro: "acao-desconhecida" }, 400);
});

app.post("/", async (c) => {
  let d: Record<string, unknown>;
  try { d = JSON.parse(await c.req.text()); } catch { return c.json({ ok: false, erro: "dados-invalidos" }, 400); }
  if (!d || typeof d !== "object") return c.json({ ok: false, erro: "dados-invalidos" }, 400);
  if (!limiteOk(ipDe(c))) return c.json({ ok: false, erro: "muitos-envios" }, 429);
  const erro = await salvar(d);
  return erro ? c.json({ ok: false, erro }, 400) : c.json({ ok: true });
});

// O mural é público, então a consulta selada também é: só traz o que já aparece no site.
app.post("/mural/live", async (c) => {
  return c.json(await realtime.seal({ query: rawSql<LinhaMural>(SQL_MURAL) }));
});

app.get("/convite", async (c) => {
  const token = txt(c.req.query("token"), 100);
  const { rows } = await pool.query(
    "SELECT nivel FROM convites WHERE token_hash = $1 AND NOT revogado AND usado_em IS NULL AND expira_em > now()",
    [hashToken(token)],
  );
  return c.json({ ok: true, valido: rows.length > 0 });
});

app.post("/convite/aceitar", async (c) => {
  const u = await usuario(c);
  if (!u) return c.json({ ok: false, erro: "nao-autorizado" }, 401);
  const { token } = await c.req.json<{ token?: string }>().catch(() => ({ token: "" }));
  // Uma instrução só: usa o convite e cadastra na equipe com o nível do convite, ou não faz nada
  const { rows } = await pool.query(
    `WITH c AS (
       UPDATE convites SET usado_em = now(), usado_por = $2
       WHERE token_hash = $1 AND NOT revogado AND usado_em IS NULL AND expira_em > now()
       RETURNING id, nivel)
     INSERT INTO equipe (email, user_id, nome, convite_id, nivel)
     SELECT $2, $3, $4, id, nivel FROM c
     ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id, convite_id = EXCLUDED.convite_id, nivel = EXCLUDED.nivel, bloqueado = false
     RETURNING email, nivel`,
    [hashToken(txt(token, 100)), u.email, u.id, u.nome],
  );
  if (!rows[0]) return c.json({ ok: false, erro: "convite-invalido" }, 400);
  await pool.query("INSERT INTO atividades (user_id, email, acao, alvo, detalhes) VALUES ($1,$2,'entrou pelo convite',$2,$3)",
    [u.id, u.email, JSON.stringify({ nivel: rows[0].nivel })]);
  return c.json({ ok: true });
});

app.use("/admin/*", async (c, next) => {
  const a = await admin(c);
  if (!a) return c.json({ ok: false, erro: "nao-autorizado" }, 401);
  c.set("admin" as never, a as never);
  await next();
});

const soSuper = async (c: Context, next: () => Promise<void>) => {
  if (!quem(c).perm.usuarios) return c.json({ ok: false, erro: "so-super-admin" }, 403);
  await next();
};
const podeEventos = async (c: Context, next: () => Promise<void>) => {
  if (!quem(c).perm.eventos) return c.json({ ok: false, erro: "sem-permissao" }, 403);
  await next();
};

app.get("/admin/eu", (c) => {
  const a = quem(c);
  return c.json({ ok: true, admin: { id: a.id, email: a.email, super: a.super, dono: a.dono, nivel: a.nivel, perm: a.perm } });
});

/* Histórico: o super vê tudo; os outros, só o que fizeram */
app.get("/admin/historico", async (c) => {
  const a = quem(c);
  const { rows } = a.super
    ? await pool.query("SELECT quando, email, acao, alvo, detalhes FROM atividades ORDER BY quando DESC LIMIT 300")
    : await pool.query("SELECT quando, email, acao, alvo, detalhes FROM atividades WHERE user_id = $1 ORDER BY quando DESC LIMIT 300", [a.id]);
  return c.json({ ok: true, linhas: rows });
});

/* ---------- usuários (só super) ---------- */
app.get("/admin/equipe", soSuper, async (c) => {
  const membros = await pool.query(
    `SELECT e.email, e.user_id, e.nome, e.nivel, e.bloqueado, e.adicionado_em,
       (SELECT max(s."updatedAt") FROM neon_auth.session s WHERE s."userId"::text = e.user_id) AS ultimo_acesso
     FROM equipe e ORDER BY e.adicionado_em`,
  );
  const donos = await pool.query(
    `SELECT id AS user_id, email, name AS nome FROM neon_auth."user" WHERE id::text = ANY($1)`, [SUPER],
  );
  const convites = await pool.query(
    `SELECT id, criado_em, criado_por, expira_em, usado_em, usado_por, nivel,
       CASE WHEN revogado THEN 'Cancelado' WHEN usado_em IS NOT NULL THEN 'Usado'
            WHEN expira_em <= now() THEN 'Vencido' ELSE 'Aguardando' END AS situacao
     FROM convites ORDER BY criado_em DESC LIMIT 50`,
  );
  return c.json({ ok: true, donos: donos.rows, membros: membros.rows, convites: convites.rows, niveis: NOMES_NIVEL });
});

app.post("/admin/convites", soSuper, async (c) => {
  const a = quem(c);
  const { nivel } = await c.req.json<{ nivel?: string }>().catch(() => ({ nivel: "" }));
  const n = (NOMES_NIVEL as string[]).includes(String(nivel)) ? String(nivel) : "admin";
  const token = randomBytes(24).toString("base64url");
  const { rows } = await pool.query(
    `INSERT INTO convites (token_hash, criado_por, expira_em, nivel) VALUES ($1, $2, now() + make_interval(days => $3), $4)
     RETURNING id, expira_em`,
    [hashToken(token), a.email, CONVITE_DIAS, n],
  );
  await registrar(a, "criou link de cadastro", null, { nivel: n, convite: rows[0].id });
  return c.json({ ok: true, id: rows[0].id, token, expira_em: rows[0].expira_em });
});

app.post("/admin/convites/:id/revogar", soSuper, async (c) => {
  const id = c.req.param("id") || "";
  if (!/^\d+$/.test(id)) return c.json({ ok: false, erro: "id-invalido" }, 400);
  const { rowCount } = await pool.query("UPDATE convites SET revogado = true WHERE id = $1 AND usado_em IS NULL AND NOT revogado", [id]);
  if (rowCount) await registrar(quem(c), "cancelou link de cadastro", null, { convite: id });
  return c.json({ ok: true });
});

/* Usuário criado direto pelo super admin (a conta é criada no Neon Auth pelo navegador do super admin) */
app.post("/admin/equipe/adicionar", soSuper, async (c) => {
  const d = await c.req.json<{ user_id?: string; email?: string; nome?: string; nivel?: string }>().catch(() => ({}) as Record<string, string>);
  const userId = txt(d.user_id, 100), nivel = String(d.nivel || "");
  if (!userId || !(NOMES_NIVEL as string[]).includes(nivel)) return c.json({ ok: false, erro: "dados-invalidos" }, 400);
  // Confere no Neon Auth que a conta existe e pega o e-mail de lá
  const { rows } = await pool.query(`SELECT email, name FROM neon_auth."user" WHERE id = $1`, [userId]);
  if (!rows[0]) return c.json({ ok: false, erro: "conta-nao-encontrada" }, 404);
  const email = String(rows[0].email).toLowerCase();
  await pool.query(
    `INSERT INTO equipe (email, user_id, nome, nivel) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id, nome = EXCLUDED.nome, nivel = EXCLUDED.nivel, bloqueado = false`,
    [email, userId, txt(d.nome, 80) || rows[0].name, nivel],
  );
  await registrar(quem(c), "criou usuário", email, { nivel });
  return c.json({ ok: true });
});

/* Ações sobre um membro. Senha, sessões, bloqueio e exclusão da conta no Neon Auth são feitos
   pelo navegador do super admin (papel "admin" no Neon Auth); aqui a equipe é atualizada e tudo fica no histórico. */
app.post("/admin/equipe/acao", soSuper, async (c) => {
  const a = quem(c);
  const d = await c.req.json<{ user_id?: string; acao?: string; nivel?: string }>().catch(() => ({}) as Record<string, string>);
  const userId = txt(d.user_id, 100);
  if (!userId || SUPER.includes(userId)) return c.json({ ok: false, erro: "nao-permitido" }, 400);
  const { rows } = await pool.query("SELECT email FROM equipe WHERE user_id = $1", [userId]);
  if (!rows[0]) return c.json({ ok: false, erro: "nao-encontrado" }, 404);
  const email = rows[0].email as string;
  switch (d.acao) {
    case "nivel": {
      if (!(NOMES_NIVEL as string[]).includes(String(d.nivel))) return c.json({ ok: false, erro: "nivel-invalido" }, 400);
      await pool.query("UPDATE equipe SET nivel = $2 WHERE user_id = $1", [userId, d.nivel]);
      await registrar(a, "mudou nível", email, { nivel: d.nivel });
      break;
    }
    case "bloquear":
      await pool.query("UPDATE equipe SET bloqueado = true, logout_em = now() WHERE user_id = $1", [userId]);
      await registrar(a, "bloqueou", email);
      break;
    case "desbloquear":
      await pool.query("UPDATE equipe SET bloqueado = false WHERE user_id = $1", [userId]);
      await registrar(a, "desbloqueou", email);
      break;
    case "logout":
      await pool.query("UPDATE equipe SET logout_em = now() WHERE user_id = $1", [userId]);
      await registrar(a, "forçou logout", email);
      break;
    case "senha":
      await pool.query("UPDATE equipe SET logout_em = now() WHERE user_id = $1", [userId]);
      await registrar(a, "redefiniu a senha", email);
      break;
    case "excluir":
      await pool.query("DELETE FROM equipe WHERE user_id = $1", [userId]);
      await registrar(a, "excluiu usuário", email);
      break;
    case "remover":
      await pool.query("DELETE FROM equipe WHERE user_id = $1", [userId]);
      await registrar(a, "tirou o acesso", email);
      break;
    default:
      return c.json({ ok: false, erro: "acao-desconhecida" }, 400);
  }
  return c.json({ ok: true });
});

/* ---------- eventos (admin, editor, mídia, super) ---------- */
app.get("/admin/eventos", podeEventos, async (c) => {
  const { rows } = await pool.query<Evento>(SQL_EVENTO + " ORDER BY data DESC, id DESC LIMIT 200");
  return c.json({ ok: true, eventos: rows.map(comArte) });
});

app.post("/admin/eventos", podeEventos, async (c) => {
  const a = quem(c);
  const d = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const titulo = txt(d.titulo, 120), dia = data(d.data);
  if (!titulo || !dia) return c.json({ ok: false, erro: "faltam-dados" }, 400);
  const vagas = d.vagas === "" || d.vagas == null ? null : Math.max(1, Math.min(100000, parseInt(String(d.vagas), 10) || 0)) || null;
  const valores = [titulo, txt(d.descricao, 1000) || null, dia, txt(d.horario, 40) || null, txt(d.local, 160) || null, vagas, d.publicado !== false];
  const id = txt(d.id, 20);
  let linha: Evento | undefined;
  if (/^\d+$/.test(id)) {
    ({ rows: [linha] } = await pool.query<Evento>(
      `UPDATE eventos SET titulo=$2, descricao=$3, data=$4, horario=$5, local=$6, vagas=$7, publicado=$8, atualizado_em=now()
       WHERE id = $1 RETURNING id`, [id, ...valores],
    ));
    if (!linha) return c.json({ ok: false, erro: "nao-encontrado" }, 404);
    await registrar(a, "editou evento", titulo, { evento: id });
  } else {
    ({ rows: [linha] } = await pool.query<Evento>(
      `INSERT INTO eventos (titulo, descricao, data, horario, local, vagas, publicado, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [...valores, a.email],
    ));
    await registrar(a, "criou evento", titulo, { evento: linha!.id });
  }
  return c.json({ ok: true, id: String(linha!.id) });
});

// Arte do evento: o corpo é a própria imagem (JPG, PNG ou WebP, até 5 MB), no bucket público "eventos"
app.post("/admin/eventos/:id/arte", podeEventos, async (c) => {
  const id = c.req.param("id") || "";
  if (!/^\d+$/.test(id)) return c.json({ ok: false, erro: "id-invalido" }, 400);
  const tipo = (c.req.header("content-type") || "").split(";")[0].trim();
  const ext = ARTE_TIPOS[tipo];
  if (!ext) return c.json({ ok: false, erro: "formato-invalido" }, 400);
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > ARTE_MAX) return c.json({ ok: false, erro: "tamanho-invalido" }, 400);
  const { rows } = await pool.query("SELECT titulo, arte_chave FROM eventos WHERE id = $1", [id]);
  if (!rows[0]) return c.json({ ok: false, erro: "nao-encontrado" }, 404);
  // Chave nova a cada envio, para o navegador não mostrar a arte antiga do cache
  const chave = `${id}/${randomBytes(6).toString("hex")}.${ext}`;
  await artes.upload(chave, bytes, { contentType: tipo, cacheControl: "public, max-age=31536000, immutable" });
  await pool.query("UPDATE eventos SET arte_chave = $2, atualizado_em = now() WHERE id = $1", [id, chave]);
  if (rows[0].arte_chave) await artes.delete(rows[0].arte_chave).catch(() => {});
  await registrar(quem(c), "trocou a arte do evento", rows[0].titulo, { evento: id });
  return c.json({ ok: true, arte: ARTE_URL + chave });
});

app.post("/admin/eventos/:id/excluir", podeEventos, async (c) => {
  const id = c.req.param("id") || "";
  if (!/^\d+$/.test(id)) return c.json({ ok: false, erro: "id-invalido" }, 400);
  const { rows } = await pool.query("DELETE FROM eventos WHERE id = $1 RETURNING titulo, arte_chave", [id]);
  if (!rows[0]) return c.json({ ok: false, erro: "nao-encontrado" }, 404);
  if (rows[0].arte_chave) await artes.delete(rows[0].arte_chave).catch(() => {});
  await registrar(quem(c), "excluiu evento", rows[0].titulo, { evento: id });
  return c.json({ ok: true });
});

/* ---------- cadastros ---------- */
app.get("/admin/:tabela", async (c) => {
  const sql = consulta(c.req.param("tabela"), quem(c));
  if (!sql) return c.json({ ok: false, erro: "sem-permissao" }, 403);
  const { rows } = await pool.query(sql);
  return c.json({ ok: true, linhas: rows });
});

app.post("/admin/oracao/:id", async (c) => {
  const a = quem(c);
  if (!a.perm.mural) return c.json({ ok: false, erro: "sem-permissao" }, 403);
  const id = c.req.param("id") || "";
  if (!/^\d+$/.test(id)) return c.json({ ok: false, erro: "id-invalido" }, 400);
  const d = await c.req.json<{ aprovado?: boolean; visibilidade?: string }>().catch(() => ({}) as Record<string, unknown>);
  const vis = d.visibilidade === "Mural" || d.visibilidade === "Privado" ? d.visibilidade : null;
  const apr = typeof d.aprovado === "boolean" ? d.aprovado : null;
  // O editor só mexe em pedidos do mural
  const { rows } = await pool.query(
    `UPDATE pedidos_oracao SET aprovado = COALESCE($2, aprovado), visibilidade = COALESCE($3, visibilidade)
     WHERE id = $1 AND ($4 OR visibilidade = 'Mural') RETURNING id, autor_publico, aprovado`,
    [id, apr, a.nivel === "editor" ? null : vis, a.nivel !== "editor"],
  );
  if (!rows[0]) return c.json({ ok: false, erro: "nao-encontrado" }, 404);
  await registrar(a, rows[0].aprovado ? "aprovou pedido no mural" : "tirou pedido do mural", rows[0].autor_publico, { pedido: id });
  return c.json({ ok: true, linha: rows[0] });
});

app.post("/admin/exportar/:tabela", async (c) => {
  const a = quem(c);
  const nome = c.req.param("tabela");
  const sql = consulta(nome, a);
  if (!sql || !a.perm.exportar) return c.json({ ok: false, erro: "sem-permissao" }, 403);
  const { rows } = await pool.query(sql);
  const chave = `exportacoes/${nome}/${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  await files.upload(chave, csv(rows), { contentType: "text/csv; charset=utf-8" });
  await pool.query("INSERT INTO exportacoes (tabela, chave, linhas, feito_por) VALUES ($1,$2,$3,$4)", [nome, chave, rows.length, a.email]);
  await registrar(a, "exportou CSV", nome, { linhas: rows.length });
  const url = await files.url(chave, { expiresIn: 600 });
  return c.json({ ok: true, chave, linhas: rows.length, url });
});

export default app;
