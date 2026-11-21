/* Área da equipe: login (Neon Auth) + cadastros vindos da API. Gerado em js/admin.js por `npm run build`. */
import { createAuthClient, type VanillaBetterAuthClient } from "@neon/auth";

type Config = { NEON_API_URL?: string; NEON_AUTH_URL?: string };
const C: Config = (window as unknown as { CGV_CONFIG?: Config }).CGV_CONFIG || {};
const API = (C.NEON_API_URL || "").replace(/\/$/, "");
// O cliente já traz o plugin JWT (token()), mas o tipo do cliente "vanilla" não o declara
const auth = createAuthClient(C.NEON_AUTH_URL || "") as VanillaBetterAuthClient & {
  token(): Promise<{ data: { token: string } | null }>;
};

const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const login = $<HTMLFormElement>("[data-login]");
const painel = $("[data-painel]");
const quem = $("[data-quem]");
const erro = $("[data-erro]");
const status = $("[data-status]");
const tabela = $("[data-tabela]");
const sair = $<HTMLButtonElement>("[data-sair]");
let aba = "oracao";

const COLUNAS: Record<string, [string, string][]> = {
  oracao: [["criado_em", "Quando"], ["nome", "Nome"], ["pedido", "Pedido"], ["visibilidade", "Visibilidade"], ["aprovado", "No mural"], ["oracoes", "Orações"], ["origem", "Origem"]],
  visitantes: [["criado_em", "Quando"], ["nome", "Nome"], ["whatsapp", "WhatsApp"], ["email", "E-mail"], ["bairro", "Bairro"], ["origem", "Como conheceu"], ["quer_visita", "Visita"], ["quer_celula", "Célula"], ["quer_batismo", "Batismo"], ["quer_jesus", "Jesus"], ["melhor_horario", "Melhor horário"], ["mensagem", "Mensagem"], ["status", "Status"]],
  inscricoes: [["criado_em", "Quando"], ["evento", "Evento"], ["nome", "Nome"], ["whatsapp", "WhatsApp"], ["email", "E-mail"], ["pessoas", "Pessoas"], ["obs", "Obs."], ["confirmado", "Confirmado"]],
};

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
function cel(k: string, v: unknown): string {
  if (k === "criado_em") return new Date(String(v)).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  if (typeof v === "boolean") return v ? "Sim" : "—";
  return esc(v);
}

async function api(caminho: string, init: RequestInit = {}) {
  const { data } = await auth.token();
  const r = await fetch(API + caminho, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: "Bearer " + (data?.token || ""), "Content-Type": "application/json" },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw Object.assign(new Error(j.erro || "falha"), { status: r.status });
  return j;
}

async function carregar() {
  status.textContent = "Carregando…";
  try {
    const { linhas } = await api("/admin/" + aba);
    const cols = COLUNAS[aba];
    const acao = aba === "oracao";
    tabela.innerHTML = linhas.length === 0 ? '<p class="msg" style="padding:16px">Nada por aqui ainda.</p>' :
      "<table><thead><tr>" + cols.map(([, t]) => "<th>" + t + "</th>").join("") + (acao ? "<th></th>" : "") + "</tr></thead><tbody>" +
      linhas.map((l: Record<string, unknown>) => "<tr>" + cols.map(([k]) =>
        '<td class="' + (k === "pedido" || k === "mensagem" ? "txt" : "") + '">' + cel(k, l[k]) + "</td>").join("") +
        (acao ? '<td><button class="btn btn-borda btn-sm" type="button" data-aprovar="' + esc(l.id) + '" data-v="' + (l.aprovado ? "0" : "1") + '"' +
          (l.visibilidade === "Privado" ? " disabled title=\"Pedido privado\"" : "") + ">" + (l.aprovado ? "Tirar do mural" : "Aprovar") + "</button></td>" : "") +
        "</tr>").join("") + "</tbody></table>";
    status.textContent = linhas.length + (linhas.length === 1 ? " registro" : " registros");
  } catch (e) {
    const s = (e as { status?: number }).status;
    status.textContent = s === 401 ? "Este e-mail não está autorizado a ver os cadastros." : "Não conseguimos carregar agora.";
    tabela.innerHTML = "";
  }
}

async function mostrar() {
  const { data } = await auth.getSession();
  const user = data && "user" in data ? data.user : null;
  login.hidden = !!user;
  painel.hidden = !user;
  sair.hidden = !user;
  quem.textContent = user ? "Conectado como " + user.email : "Entre com o e-mail autorizado para ver os cadastros.";
  if (user) await carregar();
}

login.addEventListener("submit", async (e) => {
  e.preventDefault();
  erro.hidden = true;
  const fd = new FormData(login);
  const { error } = await auth.signIn.email({ email: String(fd.get("email")), password: String(fd.get("senha")) });
  if (error) { erro.textContent = error.status === 401 ? "E-mail ou senha incorretos." : error.message || "Não foi possível entrar."; erro.hidden = false; return; }
  await mostrar();
});

$("[data-criar]").addEventListener("click", async () => {
  if (!login.reportValidity()) return;
  erro.hidden = true;
  const fd = new FormData(login);
  const email = String(fd.get("email"));
  const { error } = await auth.signUp.email({ email, password: String(fd.get("senha")), name: email.split("@")[0] });
  if (error) { erro.textContent = error.message || "Não foi possível criar a conta."; erro.hidden = false; return; }
  await mostrar();
});

sair.addEventListener("click", async () => { await auth.signOut(); location.reload(); });

document.querySelectorAll<HTMLButtonElement>("[data-aba]").forEach((b) => b.addEventListener("click", () => {
  aba = b.dataset.aba!;
  document.querySelectorAll("[data-aba]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  carregar();
}));

tabela.addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-aprovar]");
  if (!b) return;
  b.disabled = true;
  try { await api("/admin/oracao/" + b.dataset.aprovar, { method: "POST", body: JSON.stringify({ aprovado: b.dataset.v === "1" }) }); }
  finally { await carregar(); }
});

$("[data-exportar]").addEventListener("click", async () => {
  status.textContent = "Gerando CSV…";
  try {
    const j = await api("/admin/exportar/" + aba, { method: "POST" });
    status.innerHTML = 'CSV pronto (' + j.linhas + ' linhas). <a href="' + esc(j.url) + '" download>Baixar</a> (link vale 10 minutos)';
  } catch { status.textContent = "Não conseguimos exportar agora."; }
});

mostrar();
