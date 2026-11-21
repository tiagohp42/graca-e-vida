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
const cadastro = $<HTMLFormElement>("[data-cadastro]");
const erroCadastro = $("[data-erro-cadastro]");
const equipe = $("[data-equipe]");
const exportar = $<HTMLButtonElement>("[data-exportar]");
let aba = "oracao";
// Link de cadastro da equipe: /admin/?convite=...
let convite = new URLSearchParams(location.search).get("convite");

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

// O cliente da Neon põe o JWT em session.token (vem do cabeçalho set-auth-jwt); token() fica de reserva
async function jwt(): Promise<string> {
  try {
    const { data } = await auth.getSession();
    const t = data && "session" in data ? data.session?.token : "";
    if (t && t.split(".").length === 3) return t;
  } catch { /* tenta o outro jeito */ }
  try { return (await auth.token())?.data?.token || ""; } catch { return ""; }
}

async function api(caminho: string, init: RequestInit = {}) {
  const token = await jwt();
  if (!token) throw Object.assign(new Error("sem-token"), { status: 0 });
  const r = await fetch(API + caminho, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: "Bearer " + token, "Content-Type": "application/json" },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw Object.assign(new Error(j.erro || "falha"), { status: r.status });
  return j;
}

async function carregar() {
  const ehEquipe = aba === "equipe";
  equipe.hidden = !ehEquipe;
  tabela.hidden = ehEquipe;
  exportar.hidden = ehEquipe;
  if (ehEquipe) return carregarEquipe();
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
  } catch {
    status.textContent = "Não conseguimos carregar agora.";
    tabela.innerHTML = "";
  }
}

const data = (v: unknown) => (v ? new Date(String(v)).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

async function carregarEquipe() {
  status.textContent = "Carregando…";
  try {
    const { membros, convites } = await api("/admin/equipe");
    $("[data-membros]").innerHTML = membros.length === 0 ? '<p class="msg" style="padding:12px">Ninguém da equipe ainda. Crie um link acima.</p>' :
      "<table><thead><tr><th>Nome</th><th>E-mail</th><th>Desde</th><th></th></tr></thead><tbody>" +
      membros.map((m: Record<string, unknown>) => "<tr><td>" + esc(m.nome) + "</td><td>" + esc(m.email) + "</td><td>" + data(m.adicionado_em) +
        '</td><td><button class="btn btn-borda btn-sm" type="button" data-remover="' + esc(m.user_id) + '" data-email="' + esc(m.email) + '">Remover acesso</button></td></tr>').join("") +
      "</tbody></table>";
    $("[data-convites]").innerHTML = convites.length === 0 ? '<p class="msg" style="padding:12px">Nenhum link criado.</p>' :
      "<table><thead><tr><th>Criado em</th><th>Situação</th><th>Vale até</th><th>Usado por</th><th></th></tr></thead><tbody>" +
      convites.map((v: Record<string, unknown>) => "<tr><td>" + data(v.criado_em) + "</td><td>" + esc(v.situacao) + "</td><td>" + data(v.expira_em) +
        "</td><td>" + esc(v.usado_por || "—") + "</td><td>" +
        (v.situacao === "Aguardando" ? '<button class="btn btn-borda btn-sm" type="button" data-revogar="' + esc(v.id) + '">Cancelar link</button>' : "") +
        "</td></tr>").join("") + "</tbody></table>";
    status.textContent = "";
  } catch {
    status.textContent = "Não conseguimos carregar a equipe agora.";
  }
}

function telaLogin(msg?: string) {
  login.hidden = false;
  cadastro.hidden = true;
  if (msg) { erro.textContent = msg; erro.hidden = false; }
}

async function mostrar() {
  const { data: s } = await auth.getSession();
  const user = s && "user" in s ? s.user : null;
  painel.hidden = true;
  login.hidden = true;
  cadastro.hidden = true;
  sair.hidden = !user;
  $("[data-titulo]").classList.toggle("so-login", true);

  if (!user) {
    if (convite) {
      const { valido } = await fetch(API + "/convite?token=" + encodeURIComponent(convite)).then((r) => r.json()).catch(() => ({ valido: false }));
      if (valido) {
        quem.textContent = "Você foi convidado para a equipe. Crie sua conta para ver os cadastros.";
        cadastro.hidden = false;
        $("[data-ir-cadastro]").hidden = false;
        return;
      }
      convite = null;
      quem.textContent = "Entre com o e-mail autorizado para ver os cadastros.";
      return telaLogin("Este link de cadastro não vale mais. Peça um novo para quem te convidou.");
    }
    quem.textContent = "Entre com o e-mail autorizado para ver os cadastros.";
    return telaLogin();
  }

  if (convite) {
    try { await api("/convite/aceitar", { method: "POST", body: JSON.stringify({ token: convite }) }); }
    catch { status.textContent = ""; }
    convite = null;
    history.replaceState(null, "", location.pathname);
  }

  let eu: { super: boolean } | null = null;
  let falha = 0;
  try { eu = (await api("/admin/eu")).admin; } catch (e) { falha = (e as { status?: number }).status ?? -1; }
  if (!eu) {
    quem.textContent = falha === 401 || falha === 403
      ? "A conta " + user.email + " ainda não tem acesso. Peça um link de cadastro para o responsável pelo site."
      : "Não conseguimos confirmar seu login agora. Clique em Sair, entre de novo e, se continuar, recarregue a página.";
    return;
  }
  $("[data-titulo]").classList.toggle("so-login", false);
  quem.textContent = "Conectado como " + user.email + (eu.super ? " · super admin" : "");
  $("[data-so-super]").hidden = !eu.super;
  painel.hidden = false;
  await carregar();
}

login.addEventListener("submit", async (e) => {
  e.preventDefault();
  erro.hidden = true;
  const fd = new FormData(login);
  const { error } = await auth.signIn.email({ email: String(fd.get("email")), password: String(fd.get("senha")) });
  if (error) { erro.textContent = error.status === 401 ? "E-mail ou senha incorretos." : error.message || "Não foi possível entrar."; erro.hidden = false; return; }
  await mostrar();
});

cadastro.addEventListener("submit", async (e) => {
  e.preventDefault();
  erroCadastro.hidden = true;
  const fd = new FormData(cadastro);
  const { error } = await auth.signUp.email({ email: String(fd.get("email")), password: String(fd.get("senha")), name: String(fd.get("nome")) });
  if (error) {
    erroCadastro.textContent = error.status === 422 || /exist/i.test(error.message || "")
      ? "Já existe uma conta com esse e-mail. Clique em \"Já tenho conta\" e entre com ela."
      : error.message || "Não foi possível criar a conta.";
    erroCadastro.hidden = false;
    return;
  }
  await mostrar();
});

$("[data-ir-login]").addEventListener("click", () => { cadastro.hidden = true; login.hidden = false; });
$("[data-ir-cadastro]").addEventListener("click", () => { login.hidden = true; cadastro.hidden = false; });

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

$("[data-gerar]").addEventListener("click", async () => {
  status.textContent = "";
  try {
    const { token } = await api("/admin/convites", { method: "POST" });
    const link = location.origin + location.pathname + "?convite=" + encodeURIComponent(token);
    $<HTMLInputElement>("[data-link]").value = link;
    $("[data-novo-link]").hidden = false;
    await carregarEquipe();
  } catch { status.textContent = "Não conseguimos criar o link agora."; }
});

$("[data-copiar]").addEventListener("click", async () => {
  const campo = $<HTMLInputElement>("[data-link]");
  try { await navigator.clipboard.writeText(campo.value); } catch { campo.select(); document.execCommand("copy"); }
  status.textContent = "Link copiado. Mande para a pessoa pelo WhatsApp ou e-mail.";
});

equipe.addEventListener("click", async (e) => {
  const alvo = e.target as HTMLElement;
  const rev = alvo.closest<HTMLButtonElement>("[data-revogar]");
  const rem = alvo.closest<HTMLButtonElement>("[data-remover]");
  if (rev) { rev.disabled = true; await api("/admin/convites/" + rev.dataset.revogar + "/revogar", { method: "POST" }).catch(() => {}); await carregarEquipe(); }
  if (rem && confirm("Tirar o acesso de " + rem.dataset.email + " à área da equipe?")) {
    rem.disabled = true;
    await api("/admin/equipe/remover", { method: "POST", body: JSON.stringify({ user_id: rem.dataset.remover }) }).catch(() => {});
    await carregarEquipe();
  }
});

exportar.addEventListener("click", async () => {
  status.textContent = "Gerando CSV…";
  try {
    const j = await api("/admin/exportar/" + aba, { method: "POST" });
    status.innerHTML = 'CSV pronto (' + j.linhas + ' linhas). <a href="' + esc(j.url) + '" download>Baixar</a> (link vale 10 minutos)';
  } catch { status.textContent = "Não conseguimos exportar agora."; }
});

mostrar();
