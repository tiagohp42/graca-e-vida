/* Comunidade Graça e Vida · API do site (Neon Function "api")
 *
 * Público (sem login):
 *   GET  /?acao=mural      pedidos aprovados do mural
 *   GET  /?acao=teste      checa a ligação com o banco
 *   POST /                 formulários: { tipo: "visitante" | "inscricao" | "oracao" | "orei", ... }
 *   POST /mural/live       consulta selada do Realtime para o mural ao vivo
 *
 * Admin (Authorization: Bearer <JWT do Neon Auth>, e-mail em ADMIN_EMAILS):
 *   GET  /admin/eu
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

const FUSO = "America/Sao_Paulo";
const ORIGENS = [/^https:\/\/tiagohp42\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);

const realtime = createRealtime({
  secret: (process.env.REALTIME_SECRET || process.env.NEON_REALTIME_SECRET)!,
  db: new URL(process.env.DATABASE_URL!).pathname.slice(1),
});

const files = new Files({ adapter: neon({ bucket: "assets" }) });

const jwks = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));
const issuer = new URL(process.env.NEON_AUTH_BASE_URL!).origin;
const ADMINS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

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
type Admin = { id: string; email: string };

async function admin(c: Context): Promise<Admin | null> {
  const h = c.req.header("authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  try {
    const { payload } = await jwtVerify(h.slice(7), jwks, { issuer });
    const email = String(payload.email || "").toLowerCase();
    if (!payload.sub || !email || !ADMINS.includes(email)) return null;
    return { id: payload.sub, email };
  } catch {
    return null;
  }
}

const TABELAS: Record<string, { sql: string }> = {
  visitantes: { sql: "SELECT * FROM visitantes ORDER BY criado_em DESC LIMIT 500" },
  inscricoes: { sql: "SELECT * FROM inscricoes ORDER BY criado_em DESC LIMIT 500" },
  oracao: { sql: "SELECT * FROM pedidos_oracao ORDER BY criado_em DESC LIMIT 500" },
};

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const cel = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((k) => cel(r[k])).join(","))].join("\n");
}

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

app.use("/admin/*", async (c, next) => {
  const a = await admin(c);
  if (!a) return c.json({ ok: false, erro: "nao-autorizado" }, 401);
  c.set("admin" as never, a as never);
  await next();
});

app.get("/admin/eu", (c) => c.json({ ok: true, admin: c.get("admin" as never) }));

app.get("/admin/:tabela", async (c) => {
  const t = TABELAS[c.req.param("tabela")];
  if (!t) return c.json({ ok: false, erro: "tabela-desconhecida" }, 404);
  const { rows } = await pool.query(t.sql);
  return c.json({ ok: true, linhas: rows });
});

app.post("/admin/oracao/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.json({ ok: false, erro: "id-invalido" }, 400);
  const d = await c.req.json<{ aprovado?: boolean; visibilidade?: string }>().catch(() => ({}) as Record<string, unknown>);
  const vis = d.visibilidade === "Mural" || d.visibilidade === "Privado" ? d.visibilidade : null;
  const apr = typeof d.aprovado === "boolean" ? d.aprovado : null;
  const { rows } = await pool.query(
    "UPDATE pedidos_oracao SET aprovado = COALESCE($2, aprovado), visibilidade = COALESCE($3, visibilidade) WHERE id = $1 RETURNING *",
    [id, apr, vis],
  );
  return rows[0] ? c.json({ ok: true, linha: rows[0] }) : c.json({ ok: false, erro: "nao-encontrado" }, 404);
});

app.post("/admin/exportar/:tabela", async (c) => {
  const nome = c.req.param("tabela");
  const t = TABELAS[nome];
  if (!t) return c.json({ ok: false, erro: "tabela-desconhecida" }, 404);
  const a = c.get("admin" as never) as Admin;
  const { rows } = await pool.query(t.sql);
  const chave = `exportacoes/${nome}/${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  await files.upload(chave, csv(rows), { contentType: "text/csv; charset=utf-8" });
  await pool.query("INSERT INTO exportacoes (tabela, chave, linhas, feito_por) VALUES ($1,$2,$3,$4)", [nome, chave, rows.length, a.email]);
  const url = await files.url(chave, { expiresIn: 600 });
  return c.json({ ok: true, chave, linhas: rows.length, url });
});

export default app;
