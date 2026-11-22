// Teste da Fase 0 (filtros, páginas, situação dos pedidos, ficha, excluir, CSV).
// Roda contra a branch de teste: node --env-file=.env.teste scripts/teste-fase0.mjs
import pg from "pg";

if (process.env.NEON_BRANCH === "production") throw new Error("Este teste cria dados: rode só numa branch de teste (.env.teste)");
const AUTH = process.env.NEON_AUTH_BASE_URL;
const API = `https://${process.env.NEON_BRANCH_ID}-api${process.env.NEON_FUNCTION_HOST_SUFFIX}`;
const ORIGIN = "https://www.gracaevida.com";
let falhas = 0;
const ok = (cond, msg) => { if (!cond) falhas++; console.log(cond ? "OK  " : "FALHOU", msg); };

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const email = process.env.TEST_ADMIN_EMAIL.toLowerCase();
const nivel = (n) => db.query(
  "INSERT INTO equipe (email,user_id,nome,nivel) VALUES ($1,'ba474f2c-2c33-490a-b821-ac8c6b49d9dd','Admin Teste',$2) ON CONFLICT (email) DO UPDATE SET nivel=$2, bloqueado=false, logout_em=NULL",
  [email, n]);
await nivel("super");

// Dados de teste: 23 pedidos no mural, 1 anônimo, 1 privado
await db.query("DELETE FROM pedidos_oracao WHERE pedido LIKE '[TESTE]%'");
for (let i = 1; i <= 23; i++) {
  await db.query("INSERT INTO pedidos_oracao (nome, anonimo, autor_publico, pedido, visibilidade, criado_em) VALUES ($1,false,'Pessoa',$2,'Mural', now() - make_interval(days => $3))",
    [`[TESTE] Pessoa ${i}`, `[TESTE] pedido mural ${i}`, i]);
}
await db.query("INSERT INTO pedidos_oracao (nome, anonimo, autor_publico, pedido, visibilidade) VALUES (NULL,true,'Anônimo','[TESTE] pedido anônimo','Mural')");
const { rows: [priv] } = await db.query("INSERT INTO pedidos_oracao (nome, anonimo, autor_publico, pedido, visibilidade) VALUES ('[TESTE] Privada',false,'Privada','[TESTE] pedido privado; com ponto e vírgula','Privado') RETURNING id");

const r = await fetch(AUTH + "/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify({ email, password: process.env.TEST_ADMIN_PASSWORD }) });
const cookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
const token = (await fetch(AUTH + "/token", { headers: { Cookie: cookie, Origin: ORIGIN } }).then((x) => x.json())).token;
ok(r.ok && token, "login na branch de teste");
const api = (c, init = {}) => fetch(API + c, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }).then(async (x) => ({ status: x.status, json: await x.json().catch(() => null) }));

let j = (await api("/admin/oracao?q=%5BTESTE%5D")).json;
ok(j.total === 25 && j.linhas.length === 20 && j.paginas === 2, `busca + página 1: ${j.total} no total, ${j.linhas.length} na página, ${j.paginas} páginas`);
ok(new Date(j.linhas[0].criado_em) >= new Date(j.linhas[19].criado_em), "mais recentes primeiro");
j = (await api("/admin/oracao?q=%5BTESTE%5D&pagina=2")).json;
ok(j.linhas.length === 5, "página 2 traz os 5 restantes");
j = (await api("/admin/oracao?q=%5BTESTE%5D&visibilidade=Privado")).json;
ok(j.total === 1 && j.linhas[0].estado === "privado", "filtro Privado + situação 'privado'");
j = (await api("/admin/oracao?q=pedido%20an%C3%B4nimo")).json;
ok(j.total === 1 && j.linhas[0].anonimo === true && j.linhas[0].nome === null, "pedido anônimo vem sem nome (o painel mostra 'Anônimo')");
const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const ha5 = new Date(Date.now() - 5 * 864e5).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
j = (await api(`/admin/oracao?q=%5BTESTE%5D&de=${ha5}&ate=${hoje}`)).json;
ok(j.total >= 6 && j.total <= 7, `filtro de período (últimos 5 dias): ${j.total}`);
j = (await api("/admin/oracao?q=%5BTESTE%5D&estado=aguardando")).json;
ok(j.total === 24, "situação 'Aguardando aprovação': 24 do mural");

// Aprovar → No mural; tirar → Retirado do mural
const alvo = (await api("/admin/oracao?q=pedido%20mural%201%27&visibilidade=Mural")).json?.linhas?.[0] || (await api("/admin/oracao?q=pedido%20mural%2012")).json.linhas[0];
ok((await api(`/admin/oracao/${alvo.id}`, { method: "POST", body: JSON.stringify({ aprovado: true }) })).status === 200, "aprovar");
ok((await api(`/admin/oracao/${alvo.id}`)).json.linha.estado === "no_mural", "ficha: situação 'No mural'");
await api(`/admin/oracao/${alvo.id}`, { method: "POST", body: JSON.stringify({ aprovado: false }) });
const ficha = (await api(`/admin/oracao/${alvo.id}`)).json.linha;
ok(ficha.estado === "retirado" && ficha.retirado_em, "tirar do mural: situação 'Retirado do mural' com data");
j = (await api("/admin/oracao?q=%5BTESTE%5D&estado=retirado")).json;
ok(j.total === 1, "filtro 'Retirado do mural'");
ok((await api("/admin/oracao/999999999")).status === 404, "ficha de registro inexistente: 404");

// CSV com filtros: BOM, ponto e vírgula, data dd/mm/aaaa hh:mm, rótulos legíveis
const exp = (await api("/admin/exportar/oracao?q=%5BTESTE%5D&visibilidade=Privado", { method: "POST" })).json;
ok(exp.linhas === 1, "CSV respeita os filtros (1 linha)");
const bruto = new Uint8Array(await fetch(exp.url).then((x) => x.arrayBuffer()));
const texto = new TextDecoder().decode(bruto);
ok(bruto[0] === 0xef && bruto[1] === 0xbb && bruto[2] === 0xbf, "CSV começa com BOM (acentos certos no Excel)");
const [cab, lin] = texto.replace(/^﻿/, "").split("\r\n");
ok(cab.startsWith("Nº;Data;Nome;Anônimo"), "cabeçalho legível separado por ';': " + cab.slice(0, 40));
ok(/;\d{2}\/\d{2}\/\d{4} \d{2}:\d{2};/.test(lin), "data no formato dd/mm/aaaa hh:mm");
ok(lin.includes(";Privado;") && lin.includes('"[TESTE] pedido privado; com ponto e vírgula"'), "texto com ';' vem entre aspas");
ok(lin.includes("Formulário de oração") && lin.includes(";Não;"), "origem e Sim/Não legíveis");

// Excluir: Super/Admin sim, Editor não; fica no histórico sem o conteúdo
await nivel("editor");
ok((await api(`/admin/oracao/${priv.id}/excluir`, { method: "POST" })).status === 403, "Editor não exclui");
ok((await api(`/admin/oracao/${priv.id}`)).status === 404, "Editor não vê pedido privado nem pela ficha");
await nivel("tesouraria");
ok((await api("/admin/oracao")).status === 403, "Tesouraria não lê pedidos de oração pela API");
await nivel("super");
ok((await api(`/admin/oracao/${priv.id}/excluir`, { method: "POST" })).status === 200, "Super Admin exclui");
ok((await api(`/admin/oracao/${priv.id}`)).status === 404, "excluído some");
const hist = (await api("/admin/historico")).json.linhas;
const h = hist.find((x) => x.acao === "excluiu pedido de oração");
ok(h && !JSON.stringify(h).includes("pedido privado"), "histórico registra a exclusão sem o texto do pedido");
ok(hist.some((x) => x.acao === "tirou pedido do mural") && hist.some((x) => x.acao === "aprovou pedido no mural"), "histórico registra aprovar e tirar do mural");

await db.end();
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
