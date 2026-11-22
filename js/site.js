/* Comunidade Graça e Vida · comportamento do site (não precisa editar) */
(function () {
  "use strict";
  var C = window.CGV_CONFIG || {};
  var ROOT = (function () {
    var s = document.querySelector('script[src$="js/site.js"]');
    return s ? s.getAttribute("src").replace(/js\/site\.js$/, "") : "./";
  })();
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var MESES_M = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  var ICON_WA = '<svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C9.4 3 4 8.36 4 14.98c0 2.3.65 4.45 1.78 6.28L4 29l7.96-1.75A12.1 12.1 0 0 0 16.04 27C22.68 27 28 21.62 28 15S22.68 3 16.04 3zm5.34 14.5c-.3-.15-1.73-.85-2-.95-.27-.1-.46-.15-.66.15-.2.29-.76.94-.93 1.13-.17.2-.34.22-.63.07a7.9 7.9 0 0 1-2.33-1.44 8.8 8.8 0 0 1-1.62-2.01c-.17-.29 0-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.08-.15-.66-1.58-.9-2.17-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.43 0 1.43 1.05 2.82 1.2 3.01.14.2 2.06 3.15 5 4.42.7.3 1.24.48 1.67.62.7.22 1.34.19 1.84.12.56-.08 1.73-.71 1.97-1.39.25-.68.25-1.27.17-1.39-.07-.12-.27-.2-.56-.34z"/></svg>';
  var DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function ls(k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; }
  }
  function dm(d) { return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2); }
  function hm(str) { var p = String(str).split(":"); return [parseInt(p[0], 10) || 0, parseInt(p[1], 10) || 0]; }

  /* ---------- API ----------
     Formulários e mural de oração: banco Neon (NEON_API_URL).
     Lições, vídeos e fotos da missão: Google Drive via Apps Script (API_URL). */
  var API_DRIVE = (C.API_URL || "").trim();
  var temDrive = /^https:\/\/script\.google(usercontent)?\.com\//.test(API_DRIVE);
  var API = (C.NEON_API_URL || "").trim().replace(/\/$/, "");
  var temApi = /^https:\/\//.test(API);
  function apiGet(acao, extra) {
    var neon = acao === "mural" || acao === "eventos", base = neon ? API : API_DRIVE;
    if (!(neon ? temApi : temDrive)) return Promise.reject(new Error("sem-api"));
    var url = base + (neon ? "/" : "") + "?acao=" + encodeURIComponent(acao) + (extra || "") + "&t=" + Date.now();
    return fetch(url, { method: "GET", redirect: "follow" }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || j.ok === false) throw new Error((j && j.erro) || "erro");
      return j;
    });
  }
  function apiPost(dados) {
    if (!temApi) return Promise.reject(new Error("sem-api"));
    return fetch(API, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados)
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || j.ok !== true) throw new Error((j && j.erro) || "erro");
      return j;
    });
  }
  var MSG_SEM_API = "O envio pelo site ainda não foi ligado ao banco de dados da igreja, então seus dados não foram enviados." +
    (C.WHATSAPP ? " Fale com a gente pelo WhatsApp enquanto isso." : " Procure a recepção no domingo ou tente de novo mais tarde.");
  var MSG_FALHA = "Não conseguimos enviar agora. Confira sua internet e tente de novo em instantes." +
    (C.WHATSAPP ? " Se continuar, fale com a gente pelo WhatsApp." : "");

  /* ---------- Comum a todas as páginas ---------- */
  function comum() {
    $$("[data-ano]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

    // Cards dos ministérios: se a foto não existir, fica o fundo dourado com o ícone
    $$("img[data-min-foto]").forEach(function (img) {
      var card = img.closest(".min-card");
      var falhou = function () { img.remove(); card.classList.add("sem-foto"); };
      img.addEventListener("error", falhou);
      if (img.complete && img.naturalWidth === 0) falhou();
    });

    // Menu do celular
    var gav = $("#gaveta"), abrir = $("[data-menu]");
    if (gav && abrir) {
      var ultimoFoco = null;
      var fechar = function () {
        gav.classList.remove("aberta"); gav.setAttribute("aria-hidden", "true"); document.body.classList.remove("menu-aberto");
        abrir.setAttribute("aria-expanded", "false"); document.body.style.overflow = "";
        if (ultimoFoco) ultimoFoco.focus();
      };
      abrir.addEventListener("click", function () {
        ultimoFoco = abrir;
        gav.classList.add("aberta"); gav.setAttribute("aria-hidden", "false"); document.body.classList.add("menu-aberto");
        abrir.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden";
        var f = $(".fechar", gav); if (f) f.focus();
      });
      $$("[data-fechar]", gav).forEach(function (b) { b.addEventListener("click", fechar); });
      $$("a", gav).forEach(function (a) { a.addEventListener("click", function () { gav.classList.remove("aberta"); document.body.classList.remove("menu-aberto"); document.body.style.overflow = ""; }); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && gav.classList.contains("aberta")) fechar(); });
    }

    // WhatsApp e Instagram (escondidos enquanto não configurados)
    var wa = String(C.WHATSAPP || "").replace(/\D/g, "");
    if (wa.length >= 10 && wa.length <= 13) {
      if (wa.length <= 11) wa = "55" + wa; // aceita também só DDD + número
      var MSGS = {
        inicio: "Olá! Vim pelo site e quero conhecer a Comunidade Graça e Vida.",
        historia: "Olá! Vim pelo site e quero conhecer a Comunidade Graça e Vida.",
        eventos: "Olá! Vim pelo site e tenho uma dúvida sobre os eventos.",
        aovivo: "Olá! Estou assistindo ao culto pelo site.",
        oracao: "Olá! Gostaria de um pedido de oração.",
        primeira: "Olá! É minha primeira vez e quero conhecer a igreja.",
        downloads: "Olá! Sou líder de célula e tenho uma dúvida sobre as lições.",
        missoes: "Olá! Quero saber mais sobre a missão em Moçambique."
      };
      var pag = document.body.getAttribute("data-pagina");
      var padrao = MSGS[pag] || "Olá! Vim pelo site da Comunidade Graça e Vida.";
      $$("[data-whatsapp]").forEach(function (a) {
        var t = a.getAttribute("data-wa-texto") || padrao;
        a.href = "https://wa.me/" + wa + "?text=" + encodeURIComponent(t); a.hidden = false;
      });
    } else {
      $$("[data-sem-whatsapp]").forEach(function (el) { el.hidden = false; });
    }
    var ig = String(C.INSTAGRAM || "").replace(/^@/, "").trim();
    if (ig) $$("[data-instagram]").forEach(function (a) { a.href = "https://www.instagram.com/" + encodeURIComponent(ig) + "/"; a.hidden = false; });

    // Copiar chave PIX
    $$("[data-copiar-pix]").forEach(function (b) {
      var rot = $("[data-rotulo]", b) || b, original = rot.textContent;
      b.addEventListener("click", function () {
        var chave = String(C.PIX || "27113399000173");
        var feito = function () {
          rot.textContent = b.getAttribute("data-rotulo-ok") || "Chave copiada";
          b.classList.add("copiado");
          var ic = $("[data-icone-ok]", b); if (ic) ic.hidden = false;
          clearTimeout(b._t);
          b._t = setTimeout(function () { rot.textContent = original; b.classList.remove("copiado"); if (ic) ic.hidden = true; }, 6000);
        };
        copiar(chave).then(feito, function () { rot.textContent = "Chave: " + chave; });
      });
    });
  }
  function copiar(txt) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt).catch(function () { return copiarAntigo(txt); });
    return copiarAntigo(txt);
  }
  function copiarAntigo(txt) {
    return new Promise(function (ok, erro) {
      var t = document.createElement("textarea");
      t.value = txt; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select(); t.setSelectionRange(0, 99);
      var r = false; try { r = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(t); r ? ok() : erro();
    });
  }

  /* ---------- Datas da agenda ---------- */
  function proxCulto(now) {
    var d = new Date(now); d.setHours(19, 0, 0, 0);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
    if (d <= now) d.setDate(d.getDate() + 7);
    return d;
  }
  function agenda(now) {
    function proxDiaSemana(dow, h, durH) {
      var d = new Date(now); d.setHours(h, 0, 0, 0);
      d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7));
      if (d.getTime() + (durH || 2) * 3600000 <= now.getTime()) d.setDate(d.getDate() + 7);
      return d;
    }
    function segundaQuarta(a, m, h) { var d = new Date(a, m, 1, h); d.setDate(1 + ((3 - d.getDay() + 7) % 7) + 7); return d; }
    function ultimo(dow) { return function (a, m, h) { var d = new Date(a, m + 1, 0, h); d.setDate(d.getDate() - ((d.getDay() - dow + 7) % 7)); return d; }; }
    function mensal(fn, h, durH) {
      var d = fn(now.getFullYear(), now.getMonth(), h);
      if (d.getTime() + (durH || 2) * 3600000 <= now.getTime()) d = fn(now.getFullYear(), now.getMonth() + 1, h);
      return d;
    }
    var lista = [
      { id: "culto", titulo: "Culto de celebração", d: proxDiaSemana(0, 19, 2.5), hora: "19h", desc: "Nossa reunião principal: louvor, Palavra e comunhão para toda a família." },
      { id: "encontro", titulo: "Encontro do mês", d: mensal(segundaQuarta, 20), hora: "20h", desc: "Toda a igreja reunida na segunda quarta-feira do mês." },
      { id: "oracao", titulo: "Encontro de oração", d: proxDiaSemana(5, 6, 15), hora: "6h e 20h", desc: "Comece ou termine a semana em oração com a gente." },
      { id: "dozehoras", titulo: "12 horas de busca", d: mensal(ultimo(5), 0, 12), hora: "da meia-noite ao meio-dia", desc: "Um tempo contínuo de oração e adoração na última sexta do mês." },
      { id: "jovens", titulo: "Noite dos jovens", d: mensal(ultimo(6), 20), hora: "20h", desc: "Louvor, Palavra e amizade para a juventude." }
    ];
    lista.sort(function (a, b) { return a.d - b.d; });
    return lista;
  }
  function falta(ms, comMin) {
    var dias = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
    if (comMin) return (dias ? dias + "d " : "") + h + "h " + m + "min";
    return dias > 0 ? dias + "d " + h + "h" : (h > 0 ? h + "h " + m + "min" : m + "min");
  }

  /* ---------- Formulários ---------- */
  var ROTULOS = { nome: "Nome completo", whatsapp: "WhatsApp", pedido: "Seu pedido de oração", consentimento: "a autorização de contato", evento: "Evento", email: "E-mail" };
  function validar(form) {
    var campos = $$("input, select, textarea", form);
    for (var i = 0; i < campos.length; i++) {
      var c = campos[i];
      if (c.closest("[hidden]")) continue;
      if (c.name === "whatsapp" && c.value.trim()) {
        var dig = c.value.replace(/\D/g, "");
        if (dig.length < 10 || dig.length > 13) return { el: c, msg: "Confira o WhatsApp: coloque o DDD e o número, por exemplo (42) 9 9999-9999." };
      }
      if (!c.checkValidity()) {
        var nome = ROTULOS[c.name] || (c.labels && c.labels[0] ? c.labels[0].textContent.replace(/\*|\(opcional\)/g, "").trim() : "este campo");
        if (c.type === "checkbox") return { el: c, msg: "Para enviar, marque " + nome + "." };
        if (c.type === "email") return { el: c, msg: "Confira o e-mail digitado." };
        if (c.type === "number") return { el: c, msg: "Escolha de 1 a 10 pessoas." };
        return { el: c, msg: "Preencha o campo " + nome + "." };
      }
    }
    return null;
  }
  function mascaraFone(el) {
    el.addEventListener("input", function () {
      var d = el.value.replace(/\D/g, "").slice(0, 11);
      var r = d;
      if (d.length > 2) r = "(" + d.slice(0, 2) + ") " + d.slice(2);
      if (d.length > 7) r = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(d.length - 4);
      el.value = r;
    });
  }
  function ligarForm(form, montar, aoEnviar) {
    var msg = $("[data-msg]", form), btn = $("button[type=submit]", form);
    var txtBtn = btn.innerHTML;
    $$("input[type=tel]", form).forEach(mascaraFone);
    var mostrarErro = function (t) { msg.textContent = t; msg.hidden = false; msg.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
    form.addEventListener("input", function () { msg.hidden = true; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.hidden = true;
      var inv = validar(form);
      if (inv) { mostrarErro(inv.msg); try { inv.el.focus({ preventScroll: true }); } catch (x) {} return; }
      if (!temApi) { mostrarErro(MSG_SEM_API); return; }
      var dados = montar(new FormData(form));
      dados.site = location.href.split("#")[0];
      btn.disabled = true; btn.textContent = "Enviando…";
      apiPost(dados).then(function (r) {
        btn.disabled = false; btn.innerHTML = txtBtn;
        aoEnviar(dados, r);
      }, function () {
        btn.disabled = false; btn.innerHTML = txtBtn;
        mostrarErro(MSG_FALHA);
      });
    });
  }

  /* ---------- Página: Início ---------- */
  function inicio() {
    var el = $("[data-proximo-culto]");
    if (el) {
      var at = function () {
        var now = new Date(), d = proxCulto(now);
        var ini = new Date(now); ini.setHours(19, 0, 0, 0);
        var fim = new Date(now); fim.setHours(21, 30, 0, 0);
        if (now.getDay() === 0 && now >= ini && now <= fim) { el.innerHTML = 'acontecendo agora · <a href="' + ROOT + 'ao-vivo/">assista ao vivo</a>'; return; }
        el.textContent = "domingo, " + d.getDate() + " " + MESES[d.getMonth()] + " · 19h (em " + falta(d - now) + ")";
      };
      at(); setInterval(at, 60000);
    }
    celulas();
    lideranca();
  }

  // Células: lista do config.js (CELULAS). Vazia = ficam os 3 cartões de apresentação.
  function celulas() {
    var box = $("[data-celulas]");
    if (!box) return;
    var lista = (C.CELULAS || []).filter(function (c) { return c && (c.bairro || c.dia); });
    if (lista.length) {
      box.className = "celulas lista-real";
      box.innerHTML = lista.map(function (c) {
        var det = [c.horario, c.lider ? "com " + c.lider : ""].filter(Boolean).join(" · ");
        return '<li class="cel-item"><span class="dia">' + esc(c.dia || "") + '</span>' +
          '<span class="bairro">' + esc(c.bairro || "Telêmaco Borba") + '</span>' +
          (det ? '<span class="det">' + esc(det) + '</span>' : "") +
          (c.publico ? '<span class="det">' + esc(c.publico) + '</span>' : "") + '</li>';
      }).join("");
      var nota = $("[data-celula-nota]");
      if (nota) nota.textContent = "O endereço de cada célula é passado pela equipe, por segurança das famílias que recebem.";
    }
    var wa = String(C.WHATSAPP || "").replace(/\D/g, "");
    var cta = $("[data-cta-celula]");
    if (cta && wa.length >= 10) {
      cta.href = "https://wa.me/" + wa + "?text=" + encodeURIComponent("Olá! Quero participar de uma célula da Graça e Vida. Moro no bairro: ");
      cta.rel = "noopener";
    }
  }

  // Card de pessoa (liderança e missionários). Sem foto = iniciais em dourado.
  function cardPessoa(l) {
    var partes = String(l.nome).trim().split(/\s+/);
    var ini = (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
    var foto = l.foto ? (/^https?:/.test(l.foto) ? l.foto : ROOT + String(l.foto).replace(/^\//, "")) : "";
    return '<article class="lider">' +
      (foto ? '<img class="foto-l" src="' + esc(foto) + '" alt="' + esc(l.nome) + '" width="92" height="92" loading="lazy" decoding="async" data-ini="' + esc(ini) + '">'
            : '<span class="ini" aria-hidden="true">' + esc(ini) + '</span>') +
      '<div><p class="nm">' + esc(l.nome) + '</p>' +
      (l.funcao ? '<p class="fn">' + esc(l.funcao) + '</p>' : "") +
      (l.frase ? '<p class="fr">“' + esc(l.frase) + '”</p>' : "") + '</div></article>';
  }
  function fotosComReserva(box) {
    $$("img.foto-l", box).forEach(function (img) {
      var trocar = function () {
        var s = document.createElement("span"); s.className = "ini"; s.setAttribute("aria-hidden", "true");
        s.textContent = img.getAttribute("data-ini"); img.replaceWith(s);
      };
      img.addEventListener("error", trocar);
      if (img.complete && img.naturalWidth === 0) trocar();
    });
  }

  // Liderança: lista do config.js (LIDERANCA). Vazia = seção escondida.
  function lideranca() {
    var box = $("[data-lideranca]");
    if (!box) return;
    var lista = (C.LIDERANCA || []).filter(function (l) { return l && l.nome; });
    if (!lista.length) { var sec = $("#lideranca"); if (sec) sec.hidden = true; return; }
    box.innerHTML = lista.map(cardPessoa).join("");
    fotosComReserva(box);
  }

  /* ---------- Missões ---------- */
  function caminho(f) { return /^https?:/.test(f) ? f : ROOT + String(f).replace(/^\//, ""); }
  function dinheiro(n) { return "R$ " + Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 }); }

  function pixMissao(box, compacto) {
    if (!box) return;
    var P = C.MISSAO_PIX || {};
    var chave = String(P.chave || "").trim();
    var wa = String(C.WHATSAPP || "").replace(/\D/g, "");
    if (wa.length && wa.length <= 11) wa = "55" + wa;
    if (!chave) {
      var link = wa.length >= 12
        ? '<a class="btn btn-missao" rel="noopener" href="https://wa.me/' + wa + '?text=' + encodeURIComponent("Olá! Quero contribuir com a missão em Moçambique. Qual é o PIX da missão?") + '">' + ICON_WA + ' Pedir o PIX da missão no WhatsApp</a>'
        : '<a class="btn btn-missao" href="' + ROOT + 'primeira-vez/">Deixar meu contato</a>';
      box.innerHTML = '<div class="pix-missao"><div class="faixa"><b>PIX MISSÕES</b><span style="font-size:13px">Moçambique</span></div>' +
        '<div class="corpo-pix"><p style="font-size:17px;font-weight:700">A chave PIX da missão é passada pela nossa equipe.</p>' +
        '<p class="muted" style="font-size:15px">Fale com a gente e enviamos os dados certinhos para a sua oferta chegar à missão.</p>' + link + '</div></div>';
      return;
    }
    var fav = String(P.favorecido || "").trim(), banco = String(P.banco || "").trim(), tipo = String(P.tipo || "").trim();
    var qr = String(P.qrcode || "").trim();
    box.innerHTML = '<div class="pix-missao"' + (compacto ? ' style="box-shadow:0 8px 28px rgba(11,9,7,.12)"' : "") + '>' +
      '<div class="faixa"><b>PIX MISSÕES</b><span style="font-size:13px">Só para a missão Moçambique</span></div>' +
      '<div class="corpo-pix">' +
      '<p style="color:#3B5A3A;font-size:12px;font-weight:700;letter-spacing:.16em">CHAVE PIX' + (tipo ? " · " + esc(tipo.toUpperCase()) : "") + '</p>' +
      '<p class="chave-missao">' + esc(chave) + '</p>' +
      '<button type="button" class="copiar-grande btn-missao" data-copiar-missao><span data-rotulo>Copiar chave PIX da missão</span></button>' +
      (fav ? '<div class="aviso-verde"><strong>Confira antes de confirmar:</strong> o favorecido deve aparecer como <strong>' + esc(fav) + '</strong>' + (banco ? " · " + esc(banco) : "") + '.</div>' : "") +
      '<div class="pilha" style="gap:8px;padding-top:4px">' +
      '<div style="display:flex;gap:12px;align-items:flex-start"><span class="num">1</span><p style="margin-top:3px;font-size:15px">Toque em <strong>Copiar chave PIX da missão</strong></p></div>' +
      '<div style="display:flex;gap:12px;align-items:flex-start"><span class="num">2</span><p style="margin-top:3px;font-size:15px">No app do banco: <strong>Pix › Pagar com chave</strong></p></div>' +
      '<div style="display:flex;gap:12px;align-items:flex-start"><span class="num">3</span><p style="margin-top:3px;font-size:15px">Cole, digite o valor e confira o nome</p></div></div>' +
      '</div>' +
      (qr ? '<div class="qr-lado"><p style="color:#3B5A3A;font-size:12px;font-weight:700;letter-spacing:.16em">QR CODE DA MISSÃO</p><img src="' + esc(caminho(qr)) + '" alt="QR Code PIX da missão Moçambique" width="180" height="180" loading="lazy"><p style="font-size:13px;color:#3F362D">Em outra tela? Abra o banco › <strong>Pix › Ler QR Code</strong>.</p></div>' : "") +
      '</div>';
    var b = $("[data-copiar-missao]", box), rot = $("[data-rotulo]", b), orig = rot.textContent;
    b.addEventListener("click", function () {
      copiar(chave).then(function () {
        rot.textContent = "Chave da missão copiada! Agora abra seu banco";
        b.classList.add("copiado"); b.style.color = "#0B0907";
        clearTimeout(b._t); b._t = setTimeout(function () { rot.textContent = orig; b.classList.remove("copiado"); b.style.color = ""; }, 6000);
      }, function () { rot.textContent = "Chave: " + chave; });
    });
  }

  function metaMissao(box) {
    var M = C.MISSAO_META;
    if (!box || !M || !M.valor) return;
    var pct = Math.max(0, Math.min(100, Math.round((Number(M.arrecadado) || 0) / Number(M.valor) * 100)));
    box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline">' +
      '<p style="font-weight:700">' + esc(M.titulo || "Meta da missão") + '</p>' +
      '<p style="font-size:14px;color:#3F362D;font-variant-numeric:tabular-nums"><strong style="color:#17120D">' + dinheiro(M.arrecadado) + '</strong> de ' + dinheiro(M.valor) + '</p></div>' +
      '<div class="meta-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="' + pct + '% da meta"><span style="width:' + pct + '%"></span></div>' +
      '<p class="small">' + pct + '% da meta alcançada. Obrigado a cada um que contribui!</p>';
    box.hidden = false;
  }

  function idYoutube(url) {
    var m = String(url).match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : (/^[\w-]{11}$/.test(url) ? url : "");
  }

  function missoes() {
    var M = C.MISSAO || {};
    var cidade = String(M.cidade || "").trim();
    var lugar = cidade ? cidade + ", Moçambique" : "Moçambique";
    $("[data-m-lugar]").textContent = lugar;
    $("[data-m-onde]").textContent = cidade ? cidade + " · Moçambique" : "Moçambique, África";
    if (cidade) {
      var mapa = $("[data-m-mapa]");
      mapa.src = "https://maps.google.com/maps?q=" + encodeURIComponent(cidade + ", Moçambique") + "&z=7&hl=pt-BR&output=embed";
      mapa.title = "Mapa: " + cidade + ", Moçambique";
    }
    if (M.desde) { var d = $("[data-m-desde]"); d.textContent = "A Graça e Vida apoia esta missão desde " + M.desde + "."; d.hidden = false; }
    if (M.capa) {
      var cp = $("[data-m-capa]"); cp.src = caminho(M.capa); cp.hidden = false; $("[data-m-veu]").hidden = false;
      cp.addEventListener("error", function () { cp.hidden = true; $("[data-m-veu]").hidden = true; });
    }
    var tx = (M.texto || []).filter(function (t) { return String(t || "").trim(); });
    if (tx.length) $("[data-m-texto]").innerHTML = tx.map(function (t) { return '<p class="muted">' + esc(t) + "</p>"; }).join("");
    var fatos = $("[data-m-fatos]");
    var extras = "";
    if (cidade) extras += '<div class="fato"><b>' + esc(cidade) + '</b><span>onde a missão atua</span></div>';
    if (M.desde) extras += '<div class="fato"><b>Desde ' + esc(M.desde) + '</b><span>apoiando a missão</span></div>';
    if (extras) fatos.innerHTML = extras + fatos.innerHTML;

    // Missionários (mesmo visual da liderança)
    var ms = (M.missionarios || []).filter(function (l) { return l && l.nome; });
    if (ms.length) {
      $("[data-m-missionarios-sec]").hidden = false;
      $("[data-m-missionarios]").innerHTML = ms.map(cardPessoa).join("");
      fotosComReserva($("[data-m-missionarios]"));
    }

    // Vídeos: miniatura leve; o player só carrega no toque
    var ids = (M.videos || []).map(idYoutube).filter(Boolean);
    if (ids.length) {
      var vbox = $("[data-m-videos]");
      vbox.innerHTML = ids.map(function (id) {
        return '<button type="button" class="vid" data-vid="' + id + '" aria-label="Assistir ao vídeo da missão">' +
          '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy">' +
          '<span class="play-grande"><svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="#0B0907"/></svg></span></button>';
      }).join("");
      vbox.addEventListener("click", function (e) {
        var b = e.target.closest("[data-vid]"); if (!b || b.querySelector("iframe")) return;
        var f = document.createElement("iframe");
        f.src = "https://www.youtube-nocookie.com/embed/" + b.getAttribute("data-vid") + "?autoplay=1&rel=0";
        f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true; f.title = "Vídeo da missão";
        b.innerHTML = ""; b.appendChild(f); b.style.cursor = "default";
      });
    }

    pixMissao($("[data-m-pix]"), false);
    metaMissao($("[data-m-meta]"));

    // Fotos e notícias vêm da pasta do Google Drive (pela planilha)
    var gal = $("[data-m-galeria]"), vazio = $("[data-m-galeria-vazio]"), nFotos = $("[data-m-fotos-n]");
    apiGet("missao").then(function (j) {
      var fotos = j.fotos || [];
      if (fotos.length) {
        var ok = 0;
        gal.innerHTML = fotos.map(function (f, i) {
          return '<button type="button" data-foto="' + i + '" aria-label="Ampliar foto ' + (i + 1) + '"><img src="https://drive.google.com/thumbnail?id=' + encodeURIComponent(f.id) + '&sz=w800" alt="' + esc(f.legenda || "Foto da missão em Moçambique") + '" loading="lazy" decoding="async"></button>';
        }).join("");
        $$("img", gal).forEach(function (img) {
          img.addEventListener("load", function () { ok++; vazio.hidden = true; nFotos.textContent = fotos.length === 1 ? "1 foto" : fotos.length + " fotos"; });
          img.addEventListener("error", function () { img.closest("button").remove(); });
        });
        lightbox(fotos);
      }
      var nt = j.noticias || [];
      if (nt.length) {
        $("[data-m-noticias-sec]").hidden = false;
        $("[data-m-noticias]").innerHTML = nt.slice(0, 8).map(function (n) {
          return '<li><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#865F18" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg></span>' +
            '<span class="nm"><span style="font-weight:700">' + esc(n.titulo) + '</span><span class="small">' + esc(n.data) + '</span></span>' +
            '<a class="btn btn-borda btn-sm" href="' + esc(n.ver) + '" rel="noopener">Ler</a></li>';
        }).join("");
      }
    }).catch(function () {});
  }

  function lightbox(fotos) {
    var lb = $("[data-lightbox]"), img = $("[data-lb-img]", lb), cont = $("[data-lb-cont]", lb), atual = 0, foco = null;
    function mostrar(i) {
      atual = (i + fotos.length) % fotos.length;
      img.src = "https://drive.google.com/thumbnail?id=" + encodeURIComponent(fotos[atual].id) + "&sz=w1600";
      img.alt = fotos[atual].legenda || "Foto da missão em Moçambique";
      cont.textContent = (atual + 1) + " de " + fotos.length + (fotos[atual].legenda ? " · " + fotos[atual].legenda : "");
    }
    function fechar() { lb.hidden = true; document.body.style.overflow = ""; document.body.classList.remove("menu-aberto"); if (foco) foco.focus(); }
    $("[data-m-galeria]").addEventListener("click", function (e) {
      var b = e.target.closest("[data-foto]"); if (!b) return;
      foco = b; mostrar(+b.getAttribute("data-foto")); lb.hidden = false;
      document.body.style.overflow = "hidden"; document.body.classList.add("menu-aberto");
      $("[data-lb-fechar]", lb).focus();
    });
    $("[data-lb-fechar]", lb).addEventListener("click", fechar);
    $("[data-lb-ant]", lb).addEventListener("click", function () { mostrar(atual - 1); });
    $("[data-lb-prox]", lb).addEventListener("click", function () { mostrar(atual + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) fechar(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowLeft") mostrar(atual - 1);
      if (e.key === "ArrowRight") mostrar(atual + 1);
    });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) mostrar(atual + (dx < 0 ? 1 : -1));
    });
  }

  function missoesContribua() {
    pixMissao($("[data-m-pix]"), true);
    metaMissao($("[data-m-meta]"));
  }

  /* ---------- Página: Eventos ---------- */
  function eventos() {
    var box = $("[data-agenda]"), sel = $("[data-select-eventos]");
    // Desenha destaque, agenda e opções do formulário. "extras" são os eventos criados na área da equipe.
    function desenhar(D, extras) {
      var lista = agenda(new Date()).concat(extras).sort(function (a, b) { return a.d - b.d; });
      var temDestaque = !!(D && D.titulo);
      var sec = $("[data-destaque]"); sec.hidden = !temDestaque;
      if (temDestaque) {
        $("[data-d-titulo]").textContent = D.titulo;
        $("[data-d-desc]").textContent = D.descricao || "";
        var q = "";
        if (D.data) { var p = D.data.split("-"); var dd = new Date(+p[0], +p[1] - 1, +p[2]); q = DIAS[dd.getDay()] + ", " + dm(dd); }
        $("[data-d-quando]").textContent = q + (D.horario ? " · " + D.horario : "");
        if (D.local) $("[data-d-local]").textContent = D.local;
        if (D.vagas) { $("[data-d-vagas]").textContent = D.vagas + " vagas"; $("[data-d-vagas-box]").hidden = false; } else $("[data-d-vagas-box]").hidden = true;
        var img = $("[data-d-arte]");
        if (D.arte) { img.src = /^https?:/.test(D.arte) ? D.arte : ROOT + D.arte.replace(/^\//, ""); img.hidden = false; } else img.hidden = true;
      }
      box.innerHTML = lista.map(function (e) {
        return '<article class="evento">' +
          '<div class="data-box"><b>' + e.d.getDate() + '</b><small>' + MESES_M[e.d.getMonth()] + '</small></div>' +
          '<div class="txt"><h3>' + esc(e.titulo) + '</h3><p class="quando">' + DIAS[e.d.getDay()] + (e.hora ? ' · ' + esc(e.hora) : "") + '</p><p class="desc">' + esc(e.desc) + '</p></div>' +
          '<button type="button" class="btn btn-borda btn-sm" data-inscrever="' + e.id + '">Inscrever-se</button></article>';
      }).join("");
      var opcoes = [];
      if (temDestaque) opcoes.push('<option value="' + esc(D.titulo) + '">' + esc(D.titulo) + (D.data ? " · " + esc(D.data.split("-").reverse().slice(0, 2).join("/")) : "") + "</option>");
      lista.forEach(function (e) {
        opcoes.push('<option value="' + esc(e.titulo + " · " + dm(e.d) + "/" + e.d.getFullYear()) + '" data-id="' + e.id + '">' + esc(e.titulo + " · " + dm(e.d)) + "</option>");
      });
      sel.innerHTML = opcoes.join("");
    }
    var D0 = C.EVENTO_DESTAQUE && C.EVENTO_DESTAQUE.titulo ? C.EVENTO_DESTAQUE : null;
    desenhar(D0, []);
    // Eventos do banco: o primeiro vira destaque (se o config.js não tiver um) e os outros entram na agenda
    apiGet("eventos").then(function (j) {
      var evs = j.eventos || [];
      if (!evs.length) return;
      var D = D0 || evs[0];
      var extras = evs.filter(function (e) { return e !== D; }).map(function (e) {
        var p = e.data.split("-");
        return { id: "ev" + e.id, titulo: e.titulo, d: new Date(+p[0], +p[1] - 1, +p[2], 12), hora: e.horario || "", desc: [e.descricao, e.local].filter(Boolean).join(" · ") };
      });
      desenhar(D, extras);
    }, function () {});
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-inscrever]");
      if (!b) return;
      var id = b.getAttribute("data-inscrever");
      if (id === "destaque") sel.selectedIndex = 0;
      else $$("option", sel).forEach(function (o, i) { if (o.getAttribute("data-id") === id) sel.selectedIndex = i; });
      var form = $("[data-form=inscricao]"), ok = form.nextElementSibling;
      form.hidden = false; ok.hidden = true;
      $("#inscricao").scrollIntoView({ behavior: "smooth" });
      setTimeout(function () { try { $("#ev-nome").focus({ preventScroll: true }); } catch (x) {} }, 500);
    });
    var form = $("[data-form=inscricao]"), ok = $("[data-ok]");
    ligarForm(form, function (fd) {
      return { tipo: "inscricao", evento: fd.get("evento"), nome: fd.get("nome"), whatsapp: fd.get("whatsapp"), email: fd.get("email"), pessoas: fd.get("pessoas") || "1", obs: fd.get("obs"), consentimento: !!fd.get("consentimento") };
    }, function (d) {
      var primeiro = String(d.nome || "").trim().split(" ")[0];
      var ev = String(d.evento || "o evento").split(" · ")[0].toLowerCase();
      $("[data-ok-texto]").textContent = (primeiro ? primeiro + ", s" : "S") + "ua inscrição para " + ev + " foi registrada. Em breve a equipe confirma pelo WhatsApp.";
      form.hidden = true; ok.hidden = false; form.reset();
      ok.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    $("[data-novo]").addEventListener("click", function () { ok.hidden = true; form.hidden = false; });
  }

  /* ---------- Página: Ao vivo ---------- */
  function aovivo() {
    var cfg = C.AO_VIVO || { diaDaSemana: 0, inicio: "19:00", fim: "21:30" };
    var ini = hm(cfg.inicio), fimH = hm(cfg.fim);
    var player = $("[data-player]"), capa = $("[data-capa]");
    var embutido = false;
    function janela(now) {
      var a = new Date(now); a.setHours(ini[0], ini[1], 0, 0);
      var b = new Date(now); b.setHours(fimH[0], fimH[1], 0, 0);
      var antes = new Date(a.getTime() - 15 * 60000);
      return { hoje: now.getDay() === cfg.diaDaSemana, antes: antes, inicio: a, fim: b };
    }
    function prox(now) {
      var d = new Date(now); d.setHours(ini[0], ini[1], 0, 0);
      d.setDate(d.getDate() + ((cfg.diaDaSemana - d.getDay() + 7) % 7));
      if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7);
      return d;
    }
    function hora(h) { return h[1] ? h[0] + "h" + ("0" + h[1]).slice(-2) : h[0] + "h"; }
    function at() {
      var now = new Date(), j = janela(now);
      var noAr = j.hoje && now >= j.antes && now <= j.fim;
      var comecou = j.hoje && now >= j.inicio && now <= j.fim;
      $("[data-ponto]").classList.toggle("vivo", comecou);
      $("[data-rotulo-status]").textContent = comecou ? "AO VIVO AGORA" : (noAr ? "COMEÇA EM INSTANTES" : "PRÓXIMA TRANSMISSÃO");
      if (noAr) {
        $("[data-linha-status]").textContent = comecou ? "Culto de celebração acontecendo agora" : "A transmissão começa às " + hora(ini);
        if (!embutido && C.YOUTUBE_CANAL_ID) {
          var f = document.createElement("iframe");
          f.src = "https://www.youtube.com/embed/live_stream?channel=" + encodeURIComponent(C.YOUTUBE_CANAL_ID) + "&autoplay=1&mute=1&rel=0";
          f.title = "Culto ao vivo · Comunidade Graça e Vida";
          f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
          f.allowFullscreen = true;
          player.appendChild(f); capa.hidden = true; embutido = true;
        }
      } else {
        var d = prox(now);
        $("[data-linha-status]").textContent = DIAS[d.getDay()] + ", " + d.getDate() + " " + MESES[d.getMonth()] + " às " + hora(ini) + " · começa em " + falta(d - now, true);
        $("[data-texto-player]").textContent = "A transmissão começa " + DIAS[d.getDay()].toLowerCase() + " às " + hora(ini);
        if (embutido) { var fr = $("iframe", player); if (fr) fr.remove(); capa.hidden = false; embutido = false; }
      }
    }
    at(); setInterval(at, 30000);

    // Últimas mensagens do canal (vêm pela planilha; se não houver, ficam os atalhos)
    apiGet("videos").then(function (j) {
      var v = (j.videos || []).slice(0, 3);
      if (!v.length) return;
      $("[data-videos]").innerHTML = v.map(function (x) {
        return '<a class="video" href="https://www.youtube.com/watch?v=' + encodeURIComponent(x.id) + '" rel="noopener">' +
          '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(x.id) + '/hqdefault.jpg" alt="" loading="lazy">' +
          '<span>' + esc(x.titulo) + '</span></a>';
      }).join("");
    }).catch(function () {});
  }

  /* ---------- Página: Oração ---------- */
  function oracao() {
    var form = $("[data-form=oracao]"), mural = $("[data-mural]"), cont = $("[data-contagem]"), vazio = $("[data-vazio]");
    var orados = ls("cgv-orei") || {};
    function render(lista) {
      cont.textContent = lista.length === 0 ? "Nenhum pedido no mural" : lista.length === 1 ? "1 pedido" : lista.length + " pedidos";
      vazio.hidden = lista.length > 0;
      mural.innerHTML = lista.map(function (p) {
        var orei = !!orados[p.id], n = p.oracoes || 0;
        return '<article class="pedido"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline">' +
          '<span class="autor">' + esc(p.autor) + '</span><span class="data">' + esc(p.data || "") + '</span></div>' +
          '<p>' + esc(p.texto) + '</p>' +
          '<button type="button" class="orar" data-id="' + esc(p.id) + '" data-n="' + n + '" aria-pressed="' + orei + '">' +
          (orei ? "Orei por você" : "Orei por você") + (n ? " · " + n : "") + '</button></article>';
      }).join("");
    }
    if (!temApi) {
      cont.textContent = ""; vazio.hidden = false;
    } else {
      var falhou = function () {
        cont.textContent = ""; vazio.hidden = false;
        $("[data-vazio-t]").textContent = "Não conseguimos carregar o mural agora.";
        $("[data-vazio-d]").textContent = "Tente de novo em alguns instantes. Seu pedido pode ser enviado normalmente.";
      };
      var carregarUmaVez = function () { apiGet("mural").then(function (j) { render(j.pedidos || []); }, falhou); };
      // Mural ao vivo (Neon Realtime): novos pedidos aprovados e orações aparecem sem recarregar
      if (C.NEON_REALTIME_URL) {
        import(new URL(ROOT + "js/mural-live.js", location.href).href).then(function (m) {
          m.iniciar(API, C.NEON_REALTIME_URL, render, carregarUmaVez);
        }, carregarUmaVez);
      } else {
        carregarUmaVez();
      }
    }
    mural.addEventListener("click", function (e) {
      var b = e.target.closest(".orar");
      if (!b || b.getAttribute("aria-pressed") === "true") return;
      var id = b.getAttribute("data-id"), n = (+b.getAttribute("data-n") || 0) + 1;
      orados[id] = 1; ls("cgv-orei", orados);
      b.setAttribute("aria-pressed", "true"); b.setAttribute("data-n", n); b.textContent = "Orei por você · " + n;
      apiPost({ tipo: "orei", id: id }).catch(function () {});
    });
    var nome = $("#or-nome"), anon = $("[name=anonimo]", form);
    anon.addEventListener("change", function () { nome.disabled = anon.checked; if (anon.checked) nome.value = ""; });
    var ok = $("[data-ok]", form);
    form.addEventListener("input", function () { ok.hidden = true; });
    ligarForm(form, function (fd) {
      return { tipo: "oracao", nome: anon.checked ? "" : fd.get("nome"), anonimo: anon.checked || !String(fd.get("nome") || "").trim(), pedido: fd.get("pedido"), visibilidade: fd.get("visibilidade") };
    }, function (d) {
      ok.textContent = d.visibilidade === "Privado"
        ? "Pedido entregue à equipe de oração. Estamos orando por você."
        : "Pedido enviado! Ele aparece no mural depois que a equipe de oração aprovar.";
      ok.hidden = false; form.reset(); nome.disabled = false;
    });
  }

  /* ---------- Página: Primeira vez ---------- */
  function primeira() {
    var form = $("[data-form=visitante]"), ok = $("[data-ok]");
    $$("[data-abre]", form).forEach(function (c) {
      var alvo = document.getElementById(c.getAttribute("data-abre"));
      c.addEventListener("change", function () { alvo.hidden = !c.checked; });
    });
    if (/[?&]quero=celula\b/.test(location.search)) {
      var cb = $("input[name=celula]", form);
      if (cb) cb.checked = true;
    }
    var PASSOS = {
      visita: "Vamos combinar a visita pastoral no dia e horário que você indicou.",
      celula: "Vamos te indicar uma célula perto do seu bairro.",
      batismo: "Nossa equipe vai te explicar os próximos passos para o batismo.",
      jesus: "Alguém vai conversar com você sobre a fé, no seu tempo.",
      oracao: "Nossa equipe de oração já vai orar pelo seu pedido."
    };
    ligarForm(form, function (fd) {
      var d = { tipo: "visitante" };
      ["nome", "whatsapp", "email", "nascimento", "bairro", "origem", "endereco", "melhorHorario", "pedido", "mensagem"].forEach(function (k) { d[k] = fd.get(k) || ""; });
      ["visita", "celula", "batismo", "jesus", "oracao", "consentimento"].forEach(function (k) { d[k] = !!fd.get(k); });
      if (!d.visita) { d.endereco = ""; d.melhorHorario = ""; }
      if (!d.oracao) d.pedido = "";
      return d;
    }, function (d) {
      var primeiro = String(d.nome || "").trim().split(" ")[0];
      $("[data-ok-titulo]").textContent = primeiro ? "Que alegria, " + primeiro + "!" : "Que alegria ter você aqui!";
      var itens = Object.keys(PASSOS).filter(function (k) { return d[k]; });
      var ul = $("[data-passos]");
      ul.innerHTML = itens.map(function (k) {
        return '<li><svg style="flex:none;margin-top:2px" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E1C66A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg><span>' + PASSOS[k] + '</span></li>';
      }).join("");
      ul.hidden = itens.length === 0;
      form.hidden = true; ok.hidden = false; form.reset();
      $$(".extra", form).forEach(function (x) { x.hidden = true; });
      $("#cadastro").scrollIntoView({ behavior: "smooth" });
    });
    $("[data-novo]").addEventListener("click", function () { ok.hidden = true; form.hidden = false; });
  }

  /* ---------- Página: Downloads ---------- */
  function downloads() {
    var now = new Date(), seg = new Date(now); seg.setHours(0, 0, 0, 0);
    seg.setDate(seg.getDate() - ((seg.getDay() + 6) % 7));
    var fimSem = new Date(seg); fimSem.setDate(fimSem.getDate() + 5);
    $("[data-semana]").textContent = dm(seg) + " a " + dm(fimSem);
    var pasta = C.PASTA_LICOES || "#";
    $("[data-pasta]").href = pasta;
    var ant = $("[data-anteriores]"), mat = $("[data-material]");
    function semLicoes(t, d) {
      $("[data-l-titulo]").textContent = t;
      $("[data-l-resumo]").textContent = d;
      $("[data-l-data]").textContent = "";
      ant.innerHTML = '<li><span class="nm"><span class="small">As lições anteriores aparecem aqui assim que estiverem na pasta.</span></span>' +
        '<a class="btn btn-borda btn-sm" href="' + esc(pasta) + '" rel="noopener">Abrir a pasta</a></li>';
    }
    function linkWhats(l) {
      var t = encodeURIComponent("Lição de célula da semana: " + l.titulo + "\n" + l.ver);
      return "https://wa.me/?text=" + t;
    }
    var ICPDF = '<span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#865F18" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg></span>';
    var ICDL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
    if (!temDrive) { semLicoes("A lição da semana aparece aqui", "Assim que a lição for colocada na pasta de lições da igreja, ela aparece nesta página para baixar."); return; }
    apiGet("licoes").then(function (j) {
      var L = j.licoes || [];
      if (!L.length) { semLicoes("A lição desta semana ainda não foi publicada", "Assim que a lição for colocada na pasta de lições da igreja, ela aparece aqui para baixar."); }
      else {
        var a = L[0];
        $("[data-l-titulo]").textContent = a.titulo;
        $("[data-l-data]").textContent = "Publicada em " + a.data;
        $("[data-l-resumo]").textContent = "Baixe o PDF, leia com antecedência e compartilhe com sua célula.";
        $("[data-l-baixar]").href = a.baixar;
        $("[data-l-whats]").href = linkWhats(a);
        $("[data-l-botoes]").hidden = false;
        var resto = L.slice(1, 9);
        ant.innerHTML = resto.length ? resto.map(function (l) {
          return '<li>' + ICPDF + '<span class="nm"><span style="font-weight:700">' + esc(l.titulo) + '</span><span class="small" style="font-variant-numeric:tabular-nums">' + esc(l.data) + '</span></span>' +
            '<a class="btn btn-borda btn-sm" href="' + esc(l.baixar) + '" rel="noopener">' + ICDL + ' Baixar</a></li>';
        }).join("") : '<li><span class="nm"><span class="small">Ainda não há lições anteriores.</span></span></li>';
      }
      var M = j.material || [];
      if (M.length) mat.innerHTML = M.map(function (m) { return '<a href="' + esc(m.baixar) + '" rel="noopener">' + esc(m.titulo) + ICDL.replace('stroke="currentColor"', 'stroke="#865F18"') + '</a>'; }).join("");
    }, function () {
      semLicoes("Não conseguimos carregar as lições agora", "Tente de novo em instantes, ou abra direto a pasta de lições no Google Drive.");
    });
  }

  comum();
  var p = document.body.getAttribute("data-pagina");
  ({ inicio: inicio, eventos: eventos, aovivo: aovivo, oracao: oracao, primeira: primeira, downloads: downloads, missoes: missoes, "missoes-contribua": missoesContribua }[p] || function () {})();
})();
