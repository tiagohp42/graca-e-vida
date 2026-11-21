// Teste de ponta a ponta: Neon Auth -> JWT -> rotas /admin da API -> CSV no Object Storage.
// Uso: npm run test:admin  (usa TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD do .env.local)
const AUTH = process.env.NEON_AUTH_BASE_URL;
const API = `https://${process.env.NEON_BRANCH_ID}-api${process.env.NEON_FUNCTION_HOST_SUFFIX}`;
const email = process.env.TEST_ADMIN_EMAIL, password = process.env.TEST_ADMIN_PASSWORD;
const ORIGIN = "http://localhost:8080";

let cookie = "";
async function auth(path, body) {
  const r = await fetch(AUTH + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie },
    body: body && JSON.stringify(body),
  });
  const set = r.headers.getSetCookie?.() || [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  return { status: r.status, json: await r.json().catch(() => null) };
}
async function api(path, token, init = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  return { status: r.status, json: await r.json().catch(() => null) };
}

let r = await auth("/sign-in/email", { email, password });
if (r.status !== 200) {
  r = await auth("/sign-up/email", { email, password, name: "Admin Teste" });
  console.log("cadastro:", r.status);
}
console.log("login:", r.status, r.json?.user?.email === email ? "(usuário certo)" : r.json);

const errada = await fetch(AUTH + "/sign-in/email", {
  method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN },
  body: JSON.stringify({ email, password: password + "x" }),
});
console.log("senha errada:", errada.status);

const s = await auth("/get-session");
console.log("sessão:", s.status, s.json?.user?.email === email);

const t = await auth("/token");
const token = t.json?.token;
console.log("JWT:", t.status, token ? "recebido" : t.json);

console.log("GET /admin/eu:", (await api("/admin/eu", token)).json);
for (const tab of ["oracao", "visitantes", "inscricoes"]) {
  const x = await api(`/admin/${tab}`, token);
  console.log(`GET /admin/${tab}:`, x.status, x.json?.linhas?.length, "linhas");
}

const lista = (await api("/admin/oracao", token)).json.linhas;
const privado = lista.find((l) => l.visibilidade === "Privado");
console.log("pedido privado do visitante:", privado ? `${privado.nome} / origem=${privado.origem}` : "não achou");

const exp = await api("/admin/exportar/inscricoes", token, { method: "POST" });
console.log("exportar:", exp.status, exp.json?.chave, exp.json?.linhas, "linhas");
const csv = await fetch(exp.json.url).then((x) => x.text());
console.log("CSV baixado pelo link assinado:", csv.split("\n").length, "linhas ->", csv.split("\n")[0].replace("﻿", ""));

await auth("/sign-out", {});
const depois = await auth("/get-session");
console.log("depois de sair, sessão:", depois.json?.user ? "ainda ativa" : "encerrada");
