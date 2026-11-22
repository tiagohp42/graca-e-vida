/* Área da equipe: login (Neon Auth) + cadastros, eventos, usuários e histórico vindos da API.
   Gerado em js/admin.js por `npm run build`. */
import { createAuthClient, type VanillaBetterAuthClient } from "@neon/auth";

type Config = { NEON_API_URL?: string; NEON_AUTH_URL?: string };
const C: Config = (window as unknown as { CGV_CONFIG?: Config }).CGV_CONFIG || {};
const API = (C.NEON_API_URL || "").replace(/\/$/, "");

// Métodos do Neon Auth usados aqui. token() vem do plugin JWT e admin.* do plugin de admin
// (só funcionam para contas com papel "admin" no Neon Auth, ou seja, o super admin).
type Res = Promise<{ data: unknown; error: { message?: string; status?: number } | null }>;
type AuthAdmin = {
  createUser(b: { email: string; password: string; name: string; role?: string }): Res;
  setRole(b: { userId: string; role: string }): Res;
  setUserPassword(b: { userId: string; newPassword: string }): Res;
  revokeUserSessions(b: { userId: string }): Res;
  banUser(b: { userId: string; banReason?: string }): Res;
  unbanUser(b: { userId: string }): Res;
  removeUser(b: { userId: string }): Res;
};
const auth = createAuthClient(C.NEON_AUTH_URL || "") as VanillaBetterAuthClient & {
  token(): Promise<{ data: { token: string } | null }>;
};
const authAdmin = (auth as unknown as { admin: AuthAdmin }).admin;

type Perm = { tabelas: string[]; mural: boolean; eventos: boolean; exportar: boolean; usuarios: boolean };
type Eu = { id: string; email: string; super: boolean; dono: boolean; nivel: string; perm: Perm };

const NIVEL: Record<string, string> = {
  super: "Super Admin", admin: "Admin", editor: "Editor de conteúdo",
  tesouraria: "Tesouraria", lider: "Líder de célula", midia: "Mídia",
};
const ABAS: Record<string, string> = {
  oracao: "Pedidos de oração", visitantes: "Visitantes", inscricoes: "Inscrições",
  eventos: "Eventos", equipe: "Usuários", historico: "Histórico",
};

const $ = <T extends HTMLElement>(s: string, el: ParentNode = document) => el.querySelector<T>(s)!;
const login = $<HTMLFormElement>("[data-login]");
const painel = $("[data-painel]");
const quem = $("[data-quem]");
const erro = $("[data-erro]");
const status = $("[data-status]");
const tabela = $("[data-tabela]");
const sair = $<HTMLButtonElement>("[data-sair]");
const cadastro = $<HTMLFormElement>("[data-cadastro]");
const erroCadastro = $("[data-erro-cadastro]");
const exportar = $<HTMLButtonElement>("[data-exportar]");
const formEvento = $<HTMLFormElement>("[data-form-evento]");
let eu: Eu | null = null;
let aba = "";
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
const quando = (v: unknown) => (v ? new Date(String(v)).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
function cel(k: string, v: unknown): string {
  if (k === "criado_em") return quando(v);
  if (typeof v === "boolean") return v ? "Sim" : "—";
  return esc(v);
}
const vazio = (t: string) => '<p class="msg" style="padding:14px">' + t + "</p>";
function senhaProvisoria(): string {
  const a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const r = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(r, (n) => a[n % a.length]).join("");
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
    headers: { "Content-Type": "application/json", ...(init.headers || {}), Authorization: "Bearer " + token },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw Object.assign(new Error(j.erro || "falha"), { status: r.status });
  return j;
}

// Chama um método de admin do Neon Auth e transforma o erro em exceção
async function naConta(p: Res) {
  const { error } = await p;
  if (error) throw new Error(error.message || "Não foi possível concluir no sistema de login.");
}

/* ---------- abas ---------- */
function montarAbas() {
  const p = eu!.perm;
  const lista = [...p.tabelas, ...(p.eventos ? ["eventos"] : []), ...(p.usuarios ? ["equipe"] : []), "historico"];
  $("[data-abas]").innerHTML = lista.map((a) =>
    '<button class="btn btn-borda btn-sm" type="button" data-aba="' + a + '" aria-pressed="false">' + ABAS[a] + "</button>").join("");
  abrir(lista[0]);
}

function abrir(nova: string) {
  aba = nova;
  document.querySelectorAll("[data-aba]").forEach((x) => x.setAttribute("aria-pressed", String(x.getAttribute("data-aba") === aba)));
  const sec = COLUNAS[aba] ? "tabela" : aba;
  document.querySelectorAll<HTMLElement>("[data-sec]").forEach((s) => { s.hidden = s.dataset.sec !== sec; });
  exportar.hidden = !(COLUNAS[aba] && eu!.perm.exportar);
  status.textContent = "";
  if (COLUNAS[aba]) return carregarTabela();
  if (aba === "eventos") return carregarEventos();
  if (aba === "equipe") return carregarEquipe();
  if (aba === "historico") return carregarHistorico();
}

$("[data-abas]").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-aba]");
  if (b) abrir(b.dataset.aba!);
});

/* ---------- cadastros ---------- */
async function carregarTabela() {
  status.textContent = "Carregando…";
  try {
    const { linhas } = await api("/admin/" + aba);
    const cols = COLUNAS[aba];
    const acao = aba === "oracao" && eu!.perm.mural;
    tabela.innerHTML = linhas.length === 0 ? vazio("Nada por aqui ainda.") :
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

tabela.addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-aprovar]");
  if (!b) return;
  b.disabled = true;
  try { await api("/admin/oracao/" + b.dataset.aprovar, { method: "POST", body: JSON.stringify({ aprovado: b.dataset.v === "1" }) }); }
  finally { await carregarTabela(); }
});

exportar.addEventListener("click", async () => {
  status.textContent = "Gerando CSV…";
  try {
    const j = await api("/admin/exportar/" + aba, { method: "POST" });
    status.innerHTML = "CSV pronto (" + j.linhas + ' linhas). <a href="' + esc(j.url) + '" download>Baixar</a> (link vale 10 minutos)';
  } catch { status.textContent = "Não conseguimos exportar agora."; }
});

/* ---------- eventos ---------- */
type Evento = { id: string; titulo: string; descricao: string | null; data: string; horario: string | null; local: string | null; vagas: number | null; publicado: boolean; inscricao: boolean; arte: string | null };
let eventos: Evento[] = [];

async function carregarEventos() {
  try {
    eventos = (await api("/admin/eventos")).eventos;
    const hoje = new Date().toISOString().slice(0, 10);
    $("[data-lista-eventos]").innerHTML = eventos.length === 0 ? vazio("Nenhum evento criado ainda.") :
      "<table><thead><tr><th>Arte</th><th>Evento</th><th>Data</th><th>Situação</th><th></th></tr></thead><tbody>" +
      eventos.map((v) => "<tr><td>" + (v.arte ? '<img class="mini" src="' + esc(v.arte) + '" alt="">' : "—") + "</td><td><b>" + esc(v.titulo) + "</b><br>" +
        esc([v.horario, v.local].filter(Boolean).join(" · ")) + "<br><small>" + (v.inscricao ? "Com inscrição" : "Sem inscrição") + "</small></td><td>" + esc(v.data.split("-").reverse().join("/")) + "</td><td>" +
        (v.data < hoje ? '<span class="tag">Já passou</span>' : v.publicado ? '<span class="tag">No site</span>' : '<span class="tag bloq">Escondido</span>') +
        '</td><td><div class="acoes"><button class="btn btn-borda" type="button" data-ev-editar="' + esc(v.id) + '">Editar</button>' +
        '<button class="btn btn-borda" type="button" data-ev-excluir="' + esc(v.id) + '">Excluir</button></div></td></tr>').join("") +
      "</tbody></table>";
  } catch { status.textContent = "Não conseguimos carregar os eventos agora."; }
}

function limparEvento() {
  formEvento.reset();
  (formEvento.elements.namedItem("id") as HTMLInputElement).value = "";
  $("[data-ev-titulo-form]").textContent = "Novo evento";
  $("[data-ev-cancelar]").hidden = true;
}

formEvento.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(formEvento);
  const arte = fd.get("arte") as File | null;
  if (arte && arte.size > 5 * 1024 * 1024) { status.textContent = "A arte passa de 5 MB. Diminua a imagem e tente de novo."; return; }
  status.textContent = "Salvando…";
  try {
    const { id } = await api("/admin/eventos", {
      method: "POST",
      body: JSON.stringify({
        id: fd.get("id"), titulo: fd.get("titulo"), data: fd.get("data"), horario: fd.get("horario"), local: fd.get("local"),
        vagas: fd.get("vagas"), descricao: fd.get("descricao"), publicado: fd.get("publicado") === "on", inscricao: fd.get("inscricao") === "on",
      }),
    });
    if (arte && arte.size > 0) await api("/admin/eventos/" + id + "/arte", { method: "POST", headers: { "Content-Type": arte.type }, body: arte });
    limparEvento();
    status.textContent = "Evento salvo.";
    await carregarEventos();
  } catch (x) {
    const m = (x as Error).message;
    status.textContent = m === "formato-invalido" ? "A arte precisa ser JPG, PNG ou WebP." : "Não conseguimos salvar o evento agora.";
  }
});

$("[data-ev-cancelar]").addEventListener("click", limparEvento);

$("[data-lista-eventos]").addEventListener("click", async (e) => {
  const alvo = e.target as HTMLElement;
  const ed = alvo.closest<HTMLButtonElement>("[data-ev-editar]");
  const ex = alvo.closest<HTMLButtonElement>("[data-ev-excluir]");
  if (ed) {
    const v = eventos.find((x) => x.id === ed.dataset.evEditar)!;
    const f = formEvento.elements;
    const set = (n: string, val: unknown) => { (f.namedItem(n) as HTMLInputElement).value = val == null ? "" : String(val); };
    set("id", v.id); set("titulo", v.titulo); set("data", v.data); set("horario", v.horario); set("local", v.local);
    set("vagas", v.vagas); set("descricao", v.descricao);
    (f.namedItem("publicado") as HTMLInputElement).checked = v.publicado;
    (f.namedItem("inscricao") as HTMLInputElement).checked = v.inscricao;
    $("[data-ev-titulo-form]").textContent = "Editar evento";
    $("[data-ev-cancelar]").hidden = false;
    formEvento.scrollIntoView({ behavior: "smooth" });
  }
  if (ex && confirm("Excluir este evento? Ele sai do site e não dá para desfazer.")) {
    ex.disabled = true;
    await api("/admin/eventos/" + ex.dataset.evExcluir + "/excluir", { method: "POST" }).catch(() => { status.textContent = "Não conseguimos excluir agora."; });
    await carregarEventos();
  }
});

/* ---------- usuários e permissões (só super) ---------- */
type Membro = { email: string; user_id: string; nome: string | null; nivel: string; bloqueado: boolean; adicionado_em: string; ultimo_acesso: string | null };
let membros: Membro[] = [];

function opcoesNivel(sel?: string) {
  return Object.entries(NIVEL).map(([k, t]) => '<option value="' + k + '"' + (k === sel ? " selected" : "") + ">" + t + "</option>").join("");
}

async function carregarEquipe() {
  status.textContent = "Carregando…";
  try {
    const j = await api("/admin/equipe");
    membros = j.membros;
    const linhaDono = (d: { email: string; nome: string | null }) =>
      "<tr><td>" + esc(d.nome) + "</td><td>" + esc(d.email) + '</td><td><span class="tag dono">Super Admin · dono</span></td><td><span class="tag">Ativo</span></td><td>—</td><td></td></tr>';
    $("[data-membros]").innerHTML =
      "<table><thead><tr><th>Nome</th><th>E-mail</th><th>Nível</th><th>Situação</th><th>Último acesso</th><th></th></tr></thead><tbody>" +
      j.donos.map(linhaDono).join("") +
      membros.map((m) => "<tr><td>" + esc(m.nome) + "</td><td>" + esc(m.email) + '</td><td><select data-nivel-de="' + esc(m.user_id) + '">' + opcoesNivel(m.nivel) + "</select></td><td>" +
        (m.bloqueado ? '<span class="tag bloq">Bloqueado</span>' : '<span class="tag">Ativo</span>') + "</td><td>" + quando(m.ultimo_acesso) + "</td>" +
        '<td><div class="acoes" data-uid="' + esc(m.user_id) + '">' +
        '<button class="btn btn-borda" type="button" data-u="senha">Redefinir senha</button>' +
        '<button class="btn btn-borda" type="button" data-u="logout">Forçar logout</button>' +
        (m.bloqueado ? '<button class="btn btn-borda" type="button" data-u="desbloquear">Desbloquear</button>'
          : '<button class="btn btn-borda" type="button" data-u="bloquear">Bloquear</button>') +
        '<button class="btn btn-borda" type="button" data-u="excluir">Excluir</button></div></td></tr>').join("") +
      "</tbody></table>" + (membros.length ? "" : vazio("Ninguém da equipe ainda. Crie um usuário ou um link acima."));
    $("[data-convites]").innerHTML = j.convites.length === 0 ? vazio("Nenhum link criado.") :
      "<table><thead><tr><th>Criado em</th><th>Nível</th><th>Situação</th><th>Vale até</th><th>Usado por</th><th></th></tr></thead><tbody>" +
      j.convites.map((v: Record<string, unknown>) => "<tr><td>" + quando(v.criado_em) + "</td><td>" + esc(NIVEL[String(v.nivel)] || v.nivel) + "</td><td>" + esc(v.situacao) +
        "</td><td>" + quando(v.expira_em) + "</td><td>" + esc(v.usado_por || "—") + "</td><td>" +
        (v.situacao === "Aguardando" ? '<button class="btn btn-borda btn-sm" type="button" data-revogar="' + esc(v.id) + '">Cancelar link</button>' : "") +
        "</td></tr>").join("") + "</tbody></table>";
    status.textContent = "";
  } catch {
    status.textContent = "Não conseguimos carregar os usuários agora.";
  }
}

const formUsuario = $<HTMLFormElement>("[data-form-usuario]");
formUsuario.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(formUsuario);
  const nome = String(fd.get("nome")), email = String(fd.get("email")).trim().toLowerCase();
  const senha = String(fd.get("senha")), nivel = String(fd.get("nivel"));
  const aviso = $("[data-aviso-usuario]");
  aviso.hidden = true;
  status.textContent = "Criando usuário…";
  try {
    const { data, error } = await authAdmin.createUser({ email, password: senha, name: nome, role: nivel === "super" ? "admin" : "user" });
    if (error) throw new Error(/exist/i.test(error.message || "") ? "Já existe uma conta com esse e-mail. Use um link de convite para ela." : error.message);
    const userId = (data as { user: { id: string } }).user.id;
    await api("/admin/equipe/adicionar", { method: "POST", body: JSON.stringify({ user_id: userId, email, nome, nivel }) });
    aviso.innerHTML = "Usuário criado como <b>" + esc(NIVEL[nivel]) + "</b>. Passe para a pessoa:<br>E-mail: <code>" + esc(email) +
      "</code><br>Senha provisória: <code>" + esc(senha) + "</code><br>Endereço: <code>" + esc(location.origin + location.pathname) + "</code>";
    aviso.hidden = false;
    formUsuario.reset();
    (formUsuario.elements.namedItem("senha") as HTMLInputElement).value = senhaProvisoria();
    status.textContent = "";
    await carregarEquipe();
  } catch (x) { status.textContent = (x as Error).message || "Não conseguimos criar o usuário agora."; }
});

$("[data-membros]").addEventListener("change", async (e) => {
  const sel = (e.target as HTMLElement).closest<HTMLSelectElement>("[data-nivel-de]");
  if (!sel) return;
  const uid = sel.dataset.nivelDe!, antes = membros.find((m) => m.user_id === uid)!.nivel, nivel = sel.value;
  if (!confirm("Mudar o nível de acesso para " + NIVEL[nivel] + "?")) { sel.value = antes; return; }
  sel.disabled = true;
  try {
    // Super Admin precisa do papel "admin" no Neon Auth para gerenciar contas
    if ((nivel === "super") !== (antes === "super")) await naConta(authAdmin.setRole({ userId: uid, role: nivel === "super" ? "admin" : "user" }));
    await api("/admin/equipe/acao", { method: "POST", body: JSON.stringify({ user_id: uid, acao: "nivel", nivel }) });
    status.textContent = "Nível atualizado.";
  } catch (x) { status.textContent = (x as Error).message || "Não conseguimos mudar o nível."; }
  await carregarEquipe();
});

$("[data-membros]").addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-u]");
  if (!b) return;
  const uid = b.closest<HTMLElement>("[data-uid]")!.dataset.uid!;
  const m = membros.find((x) => x.user_id === uid)!;
  const acao = b.dataset.u!;
  try {
    if (acao === "senha") {
      const nova = prompt("Senha provisória para " + m.email + " (mínimo 8 caracteres). Todas as sessões dela serão encerradas.", senhaProvisoria());
      if (!nova) return;
      if (nova.length < 8) { status.textContent = "A senha precisa ter pelo menos 8 caracteres."; return; }
      await naConta(authAdmin.setUserPassword({ userId: uid, newPassword: nova }));
      await naConta(authAdmin.revokeUserSessions({ userId: uid }));
      await api("/admin/equipe/acao", { method: "POST", body: JSON.stringify({ user_id: uid, acao }) });
      status.innerHTML = "Senha de " + esc(m.email) + " trocada para <code>" + esc(nova) + "</code>. Passe para a pessoa.";
    } else if (acao === "logout") {
      if (!confirm("Desconectar " + m.email + " de todos os aparelhos agora?")) return;
      await naConta(authAdmin.revokeUserSessions({ userId: uid }));
      await api("/admin/equipe/acao", { method: "POST", body: JSON.stringify({ user_id: uid, acao }) });
      status.textContent = m.email + " foi desconectado.";
    } else if (acao === "bloquear") {
      if (!confirm("Bloquear " + m.email + "? A pessoa sai na hora e não consegue entrar até ser desbloqueada.")) return;
      await naConta(authAdmin.banUser({ userId: uid, banReason: "Bloqueado pela área da equipe" }));
      await api("/admin/equipe/acao", { method: "POST", body: JSON.stringify({ user_id: uid, acao }) });
      status.textContent = m.email + " foi bloqueado.";
    } else if (acao === "desbloquear") {
      await naConta(authAdmin.unbanUser({ userId: uid }));
      await api("/admin/equipe/acao", { method: "POST", body: JSON.stringify({ user_id: uid, acao }) });
      status.textContent = m.email + " foi desbloqueado.";
    } else if (acao === "excluir") {
      if (!confirm("Excluir a conta de " + m.email + "? Isso apaga o login da pessoa e não dá para desfazer.")) return;
      await naConta(authAdmin.removeUser({ userId: uid }));
      await api("/admin/equipe/acao", { method: "POST", body: JSON.stringify({ user_id: uid, acao }) });
      status.textContent = "Conta de " + m.email + " excluída.";
    }
  } catch (x) { status.textContent = (x as Error).message || "Não conseguimos concluir agora."; }
  await carregarEquipe();
});

$("[data-gerar]").addEventListener("click", async () => {
  status.textContent = "";
  try {
    const nivel = $<HTMLSelectElement>("[data-nivel-convite]").value;
    const { token } = await api("/admin/convites", { method: "POST", body: JSON.stringify({ nivel }) });
    $<HTMLInputElement>("[data-link]").value = location.origin + location.pathname + "?convite=" + encodeURIComponent(token);
    $("[data-novo-link]").hidden = false;
    await carregarEquipe();
  } catch { status.textContent = "Não conseguimos criar o link agora."; }
});

$("[data-copiar]").addEventListener("click", async () => {
  const campo = $<HTMLInputElement>("[data-link]");
  try { await navigator.clipboard.writeText(campo.value); } catch { campo.select(); document.execCommand("copy"); }
  status.textContent = "Link copiado. Mande para a pessoa pelo WhatsApp ou e-mail.";
});

$("[data-convites]").addEventListener("click", async (e) => {
  const rev = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-revogar]");
  if (!rev) return;
  rev.disabled = true;
  await api("/admin/convites/" + rev.dataset.revogar + "/revogar", { method: "POST" }).catch(() => {});
  await carregarEquipe();
});

/* ---------- histórico ---------- */
async function carregarHistorico() {
  status.textContent = "Carregando…";
  try {
    const { linhas } = await api("/admin/historico");
    $("[data-historico]").innerHTML = linhas.length === 0 ? vazio("Nenhuma atividade registrada ainda.") :
      "<table><thead><tr><th>Quando</th><th>Quem</th><th>O que fez</th><th>Em</th></tr></thead><tbody>" +
      linhas.map((l: Record<string, unknown>) => "<tr><td>" + quando(l.quando) + "</td><td>" + esc(l.email) + "</td><td>" + esc(l.acao) +
        "</td><td>" + esc(l.alvo || "—") + "</td></tr>").join("") + "</tbody></table>";
    status.textContent = eu!.super ? "Mostrando as últimas 300 atividades de toda a equipe." : "Mostrando o que você fez.";
  } catch { status.textContent = "Não conseguimos carregar o histórico agora."; }
}

/* ---------- login, cadastro por convite e tela inicial ---------- */
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
        quem.textContent = "Você foi convidado para a equipe. Crie sua conta para entrar.";
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

  let falha = 0;
  eu = null;
  try { eu = (await api("/admin/eu")).admin; } catch (e) { falha = (e as { status?: number }).status ?? -1; }
  if (!eu) {
    quem.textContent = falha === 401 || falha === 403
      ? "A conta " + user.email + " não tem acesso agora. Fale com o responsável pelo site."
      : "Não conseguimos confirmar seu login agora. Clique em Sair, entre de novo e, se continuar, recarregue a página.";
    return;
  }
  $("[data-titulo]").classList.toggle("so-login", false);
  quem.textContent = "Conectado como " + user.email + " · " + (eu.dono ? "Super Admin (dono)" : NIVEL[eu.nivel] || eu.nivel);
  document.querySelectorAll<HTMLSelectElement>("[data-niveis]").forEach((s) => { s.innerHTML = opcoesNivel("admin"); });
  (formUsuario.elements.namedItem("senha") as HTMLInputElement).value = senhaProvisoria();
  painel.hidden = false;
  montarAbas();
}

login.addEventListener("submit", async (e) => {
  e.preventDefault();
  erro.hidden = true;
  const fd = new FormData(login);
  const { error } = await auth.signIn.email({ email: String(fd.get("email")), password: String(fd.get("senha")) });
  if (error) {
    erro.textContent = error.status === 401 ? "E-mail ou senha incorretos."
      : error.status === 403 ? "Esta conta está bloqueada. Fale com o responsável pelo site."
      : error.message || "Não foi possível entrar.";
    erro.hidden = false;
    return;
  }
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

mostrar();
