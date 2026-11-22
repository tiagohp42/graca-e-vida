// Teste dos níveis de acesso, ações do super admin, histórico e eventos.
// Uso: npm run test:niveis  (a conta TEST_ADMIN precisa ser Super Admin e ter papel "admin" no Neon Auth durante o teste)
const AUTH = process.env.NEON_AUTH_BASE_URL;
const API = `https://${process.env.NEON_BRANCH_ID}-api${process.env.NEON_FUNCTION_HOST_SUFFIX}`;
const ORIGIN = "https://www.gracaevida.com";
let falhas = 0;
const ok = (cond, msg) => { if (!cond) falhas++; console.log(cond ? "OK  " : "FALHOU", msg); };

async function sessao(email, password) {
  const r = await fetch(AUTH + "/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify({ email, password }) });
  const cookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  const token = r.ok ? (await fetch(AUTH + "/token", { headers: { Cookie: cookie, Origin: ORIGIN } }).then((x) => x.json())).token : null;
  return { status: r.status, cookie, token };
}
const authAdmin = (cookie, caminho, body) =>
  fetch(AUTH + "/admin/" + caminho, { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
async function api(caminho, token, init = {}) {
  const r = await fetch(API + caminho, { ...init, headers: { "Content-Type": "application/json", ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  return { status: r.status, json: await r.json().catch(() => null) };
}
const acao = (sup, user_id, a, extra = {}) => api("/admin/equipe/acao", sup, { method: "POST", body: JSON.stringify({ user_id, acao: a, ...extra }) });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const sup = await sessao(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
ok((await api("/admin/eu", sup.token)).json?.admin?.super === true, "conta de teste é Super Admin");

// Criar usuário direto (Neon Auth) e colocar na equipe como Tesouraria
const email = `nivel-teste-${Date.now()}@example.com`;
let senha = "Provisoria-" + Math.random().toString(36).slice(2, 10);
const criado = await authAdmin(sup.cookie, "create-user", { email, password: senha, name: "Nivel Teste", role: "user" });
const uid = criado.json?.user?.id;
ok(criado.status === 200 && uid, "super admin cria usuário com senha provisória");
ok((await api("/admin/equipe/adicionar", sup.token, { method: "POST", body: JSON.stringify({ user_id: uid, nivel: "tesouraria" }) })).status === 200, "usuário entra na equipe como Tesouraria");

let u = await sessao(email, senha);
let eu = (await api("/admin/eu", u.token)).json?.admin;
ok(eu?.nivel === "tesouraria", "nível Tesouraria");
ok((await api("/admin/inscricoes", u.token)).status === 200, "Tesouraria vê inscrições");
ok((await api("/admin/visitantes", u.token)).status === 403, "Tesouraria não vê visitantes");
ok((await api("/admin/exportar/inscricoes", u.token, { method: "POST" })).status === 200, "Tesouraria exporta inscrições");
ok((await api("/admin/eventos", u.token)).status === 403, "Tesouraria não mexe em eventos");
ok((await api("/admin/equipe", u.token)).status === 403, "Tesouraria não vê usuários");

await acao(sup.token, uid, "nivel", { nivel: "lider" });
const vis = await api("/admin/visitantes", u.token);
ok(vis.status === 200 && vis.json.linhas.every((l) => l.quer_celula === true && !("pedido" in l)), "Líder vê só visitantes que pediram célula, sem pedido de oração");
ok((await api("/admin/inscricoes", u.token)).status === 403, "Líder não vê inscrições");
ok((await api("/admin/exportar/visitantes", u.token, { method: "POST" })).status === 403, "Líder não exporta");

await acao(sup.token, uid, "nivel", { nivel: "editor" });
const ora = await api("/admin/oracao", u.token);
ok(ora.status === 200 && ora.json.linhas.every((l) => l.visibilidade === "Mural"), "Editor vê só pedidos do mural");
ok((await api("/admin/visitantes", u.token)).status === 403, "Editor não vê visitantes");

await acao(sup.token, uid, "nivel", { nivel: "midia" });
ok((await api("/admin/oracao", u.token)).status === 403, "Mídia não vê pedidos");
const ev = await api("/admin/eventos", u.token, { method: "POST", body: JSON.stringify({ titulo: "[TESTE] Evento da mídia", data: "2099-12-31", horario: "19h", local: "Templo", vagas: 50, descricao: "teste" }) });
ok(ev.status === 200 && ev.json.id, "Mídia cria evento");
// PNG 1x1
const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const arte = await api(`/admin/eventos/${ev.json.id}/arte`, u.token, { method: "POST", headers: { "Content-Type": "image/png" }, body: png });
ok(arte.status === 200 && arte.json.arte, "Mídia envia a arte do evento");
const pub = await fetch(`${API}/?acao=eventos`).then((r) => r.json());
const noSite = pub.eventos.find((e) => e.id === ev.json.id);
ok(!!noSite && noSite.arte, "evento aparece na lista pública com arte");
ok((await fetch(noSite.arte)).status === 200, "arte abre pelo endereço público do bucket");
ok((await api("/admin/eventos", u.token, { method: "POST", body: JSON.stringify({ id: ev.json.id, titulo: "[TESTE] Evento da mídia", data: "2099-12-31", publicado: false }) })).status === 200, "Mídia esconde o evento");
ok(!(await fetch(`${API}/?acao=eventos`).then((r) => r.json())).eventos.some((e) => e.id === ev.json.id), "evento escondido sai do site");
ok((await api(`/admin/eventos/${ev.json.id}/excluir`, u.token, { method: "POST" })).status === 200, "Mídia exclui o evento");

// Histórico
const hMeu = (await api("/admin/historico", u.token)).json.linhas;
ok(hMeu.length > 0 && hMeu.every((l) => l.email === email), "membro vê só o próprio histórico");
const hSup = (await api("/admin/historico", sup.token)).json.linhas;
ok(hSup.some((l) => l.email === email) && hSup.some((l) => l.acao === "mudou nível"), "super vê o histórico de todos");

// Forçar logout: o token antigo deixa de valer
await espera(1100);
ok((await authAdmin(sup.cookie, "revoke-user-sessions", { userId: uid })).status === 200, "encerrar sessões no Neon Auth");
await acao(sup.token, uid, "logout");
ok((await api("/admin/eu", u.token)).status === 401, "forçar logout invalida o token antigo");
await espera(1100);
u = await sessao(email, senha);
ok((await api("/admin/eu", u.token)).status === 200, "entra de novo depois do logout forçado");

// Redefinir senha
await espera(1100);
const nova = "NovaSenha-" + Math.random().toString(36).slice(2, 10);
ok((await authAdmin(sup.cookie, "set-user-password", { userId: uid, newPassword: nova })).status === 200, "super define senha provisória");
await acao(sup.token, uid, "senha");
ok((await sessao(email, senha)).status === 401, "senha antiga não entra mais");
ok((await api("/admin/eu", u.token)).status === 401, "token de antes da troca de senha não vale");
await espera(1100);
senha = nova;
u = await sessao(email, senha);
ok((await api("/admin/eu", u.token)).status === 200, "entra com a senha nova");

// Bloquear / desbloquear
ok((await authAdmin(sup.cookie, "ban-user", { userId: uid, banReason: "teste" })).status === 200, "bloquear no Neon Auth");
await acao(sup.token, uid, "bloquear");
ok((await sessao(email, senha)).status === 403, "conta bloqueada não entra");
ok((await api("/admin/eu", u.token)).status === 401, "conta bloqueada perde o acesso na hora");
await authAdmin(sup.cookie, "unban-user", { userId: uid });
await acao(sup.token, uid, "desbloquear");
await espera(1100);
u = await sessao(email, senha);
ok((await api("/admin/eu", u.token)).status === 200, "desbloqueada entra de novo");

// Ninguém mexe no dono
ok((await acao(sup.token, process.env.SUPER_ADMIN_IDS.split(",")[0], "bloquear")).status === 400, "dono não pode ser bloqueado pelo painel");

// Excluir
ok((await authAdmin(sup.cookie, "remove-user", { userId: uid })).status === 200, "excluir conta no Neon Auth");
await acao(sup.token, uid, "excluir");
ok((await sessao(email, senha)).status === 401, "conta excluída não entra");
ok(!(await api("/admin/equipe", sup.token)).json.membros.some((m) => m.user_id === uid), "conta excluída sai da lista");

console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
