// Teste do link de cadastro da equipe: super admin cria link -> pessoa nova cria conta -> vira equipe.
// Uso: npm run test:equipe  (a conta TEST_ADMIN precisa estar em SUPER_ADMIN_IDS durante o teste)
const AUTH = process.env.NEON_AUTH_BASE_URL;
const API = `https://${process.env.NEON_BRANCH_ID}-api${process.env.NEON_FUNCTION_HOST_SUFFIX}`;
const ORIGIN = "http://localhost:8080";
const ok = (cond, msg) => console.log(cond ? "OK  " : "FALHOU", msg);

async function entrar(caminho, body) {
  const r = await fetch(AUTH + caminho, { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify(body) });
  const cookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  const t = await fetch(AUTH + "/token", { headers: { Cookie: cookie, Origin: ORIGIN } }).then((x) => x.json());
  return t.token;
}
async function api(caminho, token, init = {}) {
  const r = await fetch(API + caminho, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  return { status: r.status, json: await r.json().catch(() => null) };
}

const sup = await entrar("/sign-in/email", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
ok((await api("/admin/eu", sup)).json?.admin?.super === true, "conta de teste é super admin");

const conv = await api("/admin/convites", sup, { method: "POST" });
const token = conv.json?.token;
ok(conv.status === 200 && token, "super admin cria link de cadastro");
ok((await fetch(`${API}/convite?token=${token}`).then((r) => r.json())).valido === true, "link novo vale");

const email = `equipe-teste-${Date.now()}@example.com`, senha = crypto.randomUUID();
const novo = await entrar("/sign-up/email", { email, password: senha, name: "Equipe Teste" });
ok((await api("/admin/eu", novo)).status === 401, "conta nova sem convite não tem acesso");
ok((await api("/convite/aceitar", novo, { method: "POST", body: JSON.stringify({ token }) })).status === 200, "conta nova aceita o convite");
const eu = (await api("/admin/eu", novo)).json?.admin;
ok(eu && eu.super === false, "conta nova vira equipe (não super)");
ok((await api("/admin/visitantes", novo)).status === 200, "equipe vê visitantes");
ok((await api("/admin/equipe", novo)).status === 403, "equipe não vê a aba Equipe");
ok((await api("/admin/convites", novo, { method: "POST" })).status === 403, "equipe não cria links");
ok((await fetch(`${API}/convite?token=${token}`).then((r) => r.json())).valido === false, "link usado não vale mais");

const outro = await entrar("/sign-up/email", { email: `outro-${Date.now()}@example.com`, password: crypto.randomUUID(), name: "x" });
ok((await api("/convite/aceitar", outro, { method: "POST", body: JSON.stringify({ token }) })).status === 400, "link não pode ser usado de novo");

const c2 = (await api("/admin/convites", sup, { method: "POST" })).json;
await api(`/admin/convites/${c2.id}/revogar`, sup, { method: "POST" });
ok((await fetch(`${API}/convite?token=${c2.token}`).then((r) => r.json())).valido === false, "link cancelado não vale");

const lista = (await api("/admin/equipe", sup)).json;
const membro = lista.membros.find((m) => m.email === email);
ok(!!membro, "membro aparece na lista da equipe");
await api("/admin/equipe/acao", sup, { method: "POST", body: JSON.stringify({ user_id: membro.user_id, acao: "remover" }) });
ok((await api("/admin/eu", novo)).status === 401, "acesso removido não entra mais");
