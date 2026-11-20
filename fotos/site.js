/* =========================================================
   Comunidade Graça e Vida · funcionamento do site
   ---------------------------------------------------------
   CONFIGURAÇÃO: preencha só este bloco (veja o LEIA-ME).
   ========================================================= */
var CGV = {
  // URL do App da Web do Google Apps Script (passo 1 do LEIA-ME).
  // Sem ela os formulários não enviam e o mural/lições não carregam.
  SCRIPT_URL: '',

  // WhatsApp da igreja só com números, com 55 + DDD. Ex.: '5542999998888'
  WHATSAPP: '',

  // Link do Instagram da igreja. Ex.: 'https://www.instagram.com/comunidadegracaevida'
  INSTAGRAM: '',

  YOUTUBE: 'https://www.youtube.com/@comunidadegracaevida7481',
  PIX: '27113399000173',
  PASTA_LICOES: 'https://drive.google.com/drive/folders/1ofXFlIZYoNSRi8tky22x3-08ZdLuSXdG'
};

(function () {
  'use strict';

  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var MESES_M = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function el(tag, attrs, texto) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (texto != null) e.textContent = texto;
    return e;
  }

  /* ---------- Menu no celular ---------- */
  var nav = $('.nav');
  var botaoMenu = $('.nav__menu');
  if (nav && botaoMenu) {
    botaoMenu.addEventListener('click', function () {
      var aberto = nav.classList.toggle('is-open');
      botaoMenu.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
  }

  /* ---------- Links configuráveis (WhatsApp, Instagram, YouTube) ---------- */
  $$('[data-link]').forEach(function (a) {
    var tipo = a.getAttribute('data-link');
    var url = '';
    if (tipo === 'whatsapp' && CGV.WHATSAPP) {
      url = 'https://wa.me/' + CGV.WHATSAPP.replace(/\D/g, '');
      var msg = a.getAttribute('data-msg');
      if (msg) url += '?text=' + encodeURIComponent(msg);
    }
    if (tipo === 'instagram') url = CGV.INSTAGRAM;
    if (tipo === 'youtube') url = CGV.YOUTUBE;
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; } else { a.hidden = true; }
  });
  $$('[data-ano]').forEach(function (e) { e.textContent = new Date().getFullYear(); });

  /* ---------- Copiar chave PIX ---------- */
  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
    return new Promise(function (ok) {
      var t = el('textarea'); t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(t); ok();
    });
  }
  $$('[data-copiar-pix]').forEach(function (b) {
    var original = b.innerHTML;
    b.addEventListener('click', function () {
      copiar(CGV.PIX).then(function () {
        b.textContent = b.getAttribute('data-copiado') || 'Chave copiada!';
        b.classList.add('copiado');
        setTimeout(function () { b.innerHTML = original; b.classList.remove('copiado'); }, 6000);
      });
    });
  });

  /* ---------- Datas da programação ---------- */
  var agora = new Date();
  function proxDiaSemana(dow, hora) {
    var d = new Date(agora); d.setHours(hora, 0, 0, 0);
    d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7));
    if (d <= agora) d.setDate(d.getDate() + 7);
    return d;
  }
  function segundaQuarta(a, m, h) { var d = new Date(a, m, 1, h); d.setDate(1 + ((3 - d.getDay() + 7) % 7) + 7); return d; }
  function ultimo(dow) { return function (a, m, h) { var d = new Date(a, m + 1, 0, h); d.setDate(d.getDate() - ((d.getDay() - dow + 7) % 7)); return d; }; }
  function mensal(fn, h, duracaoH) {
    var d = fn(agora.getFullYear(), agora.getMonth(), h);
    if (new Date(d.getTime() + (duracaoH || 2) * 3600000) <= agora) d = fn(agora.getFullYear(), agora.getMonth() + 1, h);
    return d;
  }
  function falta(d) {
    var ms = Math.max(0, d - agora);
    var dias = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return (dias ? dias + 'd ' : '') + h + 'h ' + m + 'min';
  }
  var culto = proxDiaSemana(0, 19);
  $$('[data-proximo-culto]').forEach(function (e) {
    e.textContent = 'domingo, ' + culto.getDate() + ' ' + MESES[culto.getMonth()] + ' · 19h (em ' + falta(culto) + ')';
  });

  /* ---------- Ao vivo ---------- */
  var inicio = new Date(agora); inicio.setHours(19, 0, 0, 0);
  var fim = new Date(agora); fim.setHours(21, 30, 0, 0);
  var aoVivo = agora.getDay() === 0 && agora >= inicio && agora <= fim;
  $$('[data-vivo-ponto]').forEach(function (e) { if (aoVivo) e.classList.add('ponto--vivo'); });
  $$('[data-vivo-rotulo]').forEach(function (e) { e.textContent = aoVivo ? 'AO VIVO AGORA' : 'PRÓXIMA TRANSMISSÃO'; });
  $$('[data-vivo-linha]').forEach(function (e) {
    e.textContent = aoVivo ? 'Culto de celebração acontecendo agora'
      : 'Domingo, ' + culto.getDate() + ' ' + MESES[culto.getMonth()] + ' às 19h · começa em ' + falta(culto);
  });

  /* ---------- Agenda de eventos ---------- */
  var agenda = $('#agenda');
  var selectEvento = $('#ev-evento');
  if (agenda || selectEvento) {
    var eventos = [
      { id: 'culto', titulo: 'Culto de celebração', d: culto, hora: '19h', desc: 'Nossa reunião principal: louvor, Palavra e comunhão para toda a família.' },
      { id: 'encontro', titulo: 'Encontro do mês', d: mensal(segundaQuarta, 20), hora: '20h', desc: 'Toda a igreja reunida na segunda quarta-feira do mês.' },
      { id: 'oracao', titulo: 'Encontro de oração', d: proxDiaSemana(5, 6), hora: '6h e 20h', desc: 'Comece ou termine a semana em oração com a gente.' },
      { id: '12horas', titulo: '12 horas de busca', d: mensal(ultimo(5), 0, 12), hora: 'da meia-noite ao meio-dia', desc: 'Um tempo contínuo de oração e adoração na última sexta do mês.' },
      { id: 'jovens', titulo: 'Noite dos jovens', d: mensal(ultimo(6), 20), hora: '20h', desc: 'Louvor, Palavra e amizade para a juventude.' }
    ].sort(function (a, b) { return a.d - b.d; });

    eventos.forEach(function (ev) {
      var rotulo = ev.titulo + ' · ' + ev.d.getDate() + '/' + (ev.d.getMonth() + 1);
      if (selectEvento) selectEvento.appendChild(el('option', { value: rotulo }, rotulo));
      if (!agenda) return;
      var item = el('article', { class: 'agenda__item' });
      var data = el('div', { class: 'data-bloco', 'aria-hidden': 'true' });
      data.appendChild(el('b', null, String(ev.d.getDate())));
      data.appendChild(el('small', null, MESES_M[ev.d.getMonth()]));
      var txt = el('div', { class: 'col', style: '--base:300px' });
      txt.appendChild(el('h3', { style: 'font-size:22px' }, ev.titulo));
      txt.appendChild(el('p', { style: 'font-size:14px;font-weight:600;color:var(--ouro-escuro)' },
        DIAS[ev.d.getDay()] + ', ' + ev.d.getDate() + ' ' + MESES[ev.d.getMonth()] + ' · ' + ev.hora));
      txt.appendChild(el('p', { style: 'font-size:14px;color:var(--texto-2)' }, ev.desc));
      var b = el('button', { type: 'button', class: 'btn btn--contorno' }, 'Inscrever-se');
      b.addEventListener('click', function () {
        if (selectEvento) selectEvento.value = rotulo;
        var alvo = $('#inscricao'); if (alvo) alvo.scrollIntoView({ behavior: 'smooth' });
        var nome = $('#ev-nome'); if (nome) setTimeout(function () { nome.focus({ preventScroll: true }); }, 500);
      });
      item.appendChild(data); item.appendChild(txt); item.appendChild(b);
      agenda.appendChild(item);
    });
  }
  $$('[data-escolher-evento]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (selectEvento) selectEvento.value = b.getAttribute('data-escolher-evento');
    });
  });

  /* ---------- Campos que aparecem conforme a escolha ---------- */
  $$('[data-mostra]').forEach(function (cb) {
    var alvo = document.getElementById(cb.getAttribute('data-mostra'));
    function atualiza() { if (alvo) alvo.hidden = !cb.checked; }
    cb.addEventListener('change', atualiza); atualiza();
  });

  /* ---------- Envio dos formulários para a planilha ---------- */
  function enviar(acao, dados) {
    if (!CGV.SCRIPT_URL) return Promise.reject(new Error('SCRIPT_URL não configurada'));
    var params = new URLSearchParams();
    params.append('acao', acao);
    Object.keys(dados).forEach(function (k) { params.append(k, dados[k]); });
    return fetch(CGV.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: params });
  }
  function mostraStatus(form, tipo, texto) {
    var s = $('.status', form);
    if (!s) return;
    s.className = 'status status--' + tipo; s.textContent = texto; s.hidden = false;
  }
  var MSG_ERRO = 'Não foi possível enviar agora. Tente de novo em instantes ou fale com a gente pelo WhatsApp.';

  $$('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      if (fd.get('site')) return; // isca contra robôs
      var dados = {};
      fd.forEach(function (v, k) { if (k !== 'site') dados[k] = String(v).trim(); });
      $$('input[type="checkbox"]', form).forEach(function (cb) { dados[cb.name] = cb.checked ? 'sim' : 'não'; });
      var botao = $('button[type="submit"]', form);
      var textoBotao = botao ? botao.innerHTML : '';
      if (botao) { botao.disabled = true; botao.textContent = 'Enviando…'; }
      var tipo = form.getAttribute('data-form');

      enviar(tipo, dados).then(function () {
        if (tipo === 'visitante') sucessoVisitante(form, dados);
        else if (tipo === 'inscricao') sucessoInscricao(form, dados);
        else if (tipo === 'oracao') {
          form.reset();
          mostraStatus(form, 'ok', dados.visibilidade === 'privado'
            ? 'Pedido entregue à equipe de oração. Estamos orando por você.'
            : 'Pedido enviado! Ele aparece no mural depois que a equipe de oração aprovar.');
        }
      }).catch(function (err) {
        console.warn('[Graça e Vida] Envio não realizado:', err.message);
        mostraStatus(form, 'erro', MSG_ERRO);
      }).then(function () {
        if (botao) { botao.disabled = false; botao.innerHTML = textoBotao; }
      });
    });
  });

  var PASSOS = {
    visita: 'Vamos combinar a visita pastoral no dia e horário que você indicou.',
    celula: 'Vamos te indicar uma célula perto do seu bairro.',
    batismo: 'Nossa equipe vai te explicar os próximos passos para o batismo.',
    jesus: 'Alguém vai conversar com você sobre a fé, no seu tempo.',
    oracao: 'Nossa equipe de oração já vai orar pelo seu pedido.'
  };
  function sucessoVisitante(form, dados) {
    var ok = $('#visitante-ok'); if (!ok) return;
    var primeiro = (dados.nome || '').split(' ')[0];
    $('#visitante-titulo').textContent = primeiro ? 'Que alegria, ' + primeiro + '!' : 'Que alegria ter você aqui!';
    var lista = $('#visitante-passos'); lista.innerHTML = '';
    Object.keys(PASSOS).forEach(function (k) {
      if (dados[k] === 'sim') {
        var li = el('li');
        li.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E1C66A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;margin-top:3px"><path d="M5 12l5 5 9-10"/></svg>';
        li.appendChild(el('span', null, PASSOS[k]));
        lista.appendChild(li);
      }
    });
    lista.hidden = !lista.children.length;
    form.hidden = true; ok.hidden = false;
    ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function sucessoInscricao(form, dados) {
    var ok = $('#inscricao-ok'); if (!ok) return;
    var primeiro = (dados.nome || '').split(' ')[0];
    $('#inscricao-msg').textContent = (primeiro ? primeiro + ', s' : 'S') + 'ua inscrição para "' + (dados.evento || 'o evento') +
      '" foi registrada. Em breve a equipe confirma pelo WhatsApp.';
    form.hidden = true; ok.hidden = false;
  }
  $$('[data-novo-formulario]').forEach(function (b) {
    b.addEventListener('click', function () {
      var form = document.getElementById(b.getAttribute('data-novo-formulario'));
      var caixa = b.closest('.sucesso');
      if (form) { form.reset(); form.hidden = false; $$('[data-mostra]', form).forEach(function (cb) { cb.dispatchEvent(new Event('change')); }); }
      if (caixa) caixa.hidden = true;
      var s = form && $('.status', form); if (s) s.hidden = true;
    });
  });

  /* ---------- Mural de oração ---------- */
  var mural = $('#mural');
  if (mural) {
    var vazio = $('#mural-vazio');
    var contagem = $('#mural-contagem');
    if (!CGV.SCRIPT_URL) {
      if (vazio) vazio.hidden = false;
    } else {
      fetch(CGV.SCRIPT_URL + '?acao=mural').then(function (r) { return r.json(); }).then(function (res) {
        var lista = (res && res.pedidos) || [];
        if (contagem) contagem.textContent = lista.length === 1 ? '1 pedido' : lista.length + ' pedidos';
        if (!lista.length) { if (vazio) vazio.hidden = false; return; }
        lista.forEach(function (p) {
          var card = el('article', { class: 'pedido' });
          var topo = el('div', { style: 'display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap' });
          topo.appendChild(el('strong', null, p.autor || 'Anônimo'));
          topo.appendChild(el('span', { class: 'pequeno' }, p.data || ''));
          card.appendChild(topo);
          card.appendChild(el('p', { class: 'pedido__texto' }, p.texto || ''));
          var chave = 'cgv-orei-' + p.id;
          var jaOrou = false;
          try { jaOrou = localStorage.getItem(chave) === '1'; } catch (e) {}
          var n = Number(p.oracoes) || 0;
          var b = el('button', { type: 'button', class: 'btn-orar', 'aria-pressed': jaOrou ? 'true' : 'false' });
          function rotulo() { b.textContent = 'Orei por você' + (n ? ' · ' + n : ''); }
          rotulo();
          b.addEventListener('click', function () {
            if (b.getAttribute('aria-pressed') === 'true') return;
            n += 1; rotulo(); b.setAttribute('aria-pressed', 'true');
            try { localStorage.setItem(chave, '1'); } catch (e) {}
            enviar('orei', { id: p.id }).catch(function () {});
          });
          card.appendChild(b);
          mural.appendChild(card);
        });
      }).catch(function () { if (vazio) vazio.hidden = false; });
    }
  }

  /* ---------- Lições de célula (pasta do Google Drive) ---------- */
  function faixaSemana(seg) {
    function dm(d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }
    var f = new Date(seg); f.setDate(f.getDate() + 5);
    return dm(seg) + ' a ' + dm(f);
  }
  var segunda = new Date(agora); segunda.setHours(0, 0, 0, 0);
  segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7));
  $$('[data-semana-atual]').forEach(function (e) { e.textContent = faixaSemana(segunda); });

  var listaLicoes = $('#licoes');
  if (listaLicoes) {
    var semLicoes = $('#licoes-vazio');
    if (!CGV.SCRIPT_URL) {
      if (semLicoes) semLicoes.hidden = false;
    } else {
      fetch(CGV.SCRIPT_URL + '?acao=licoes').then(function (r) { return r.json(); }).then(function (res) {
        var arquivos = (res && res.arquivos) || [];
        if (!arquivos.length) { if (semLicoes) semLicoes.hidden = false; return; }
        var atual = arquivos[0];
        var titulo = $('#licao-titulo'); if (titulo) titulo.textContent = atual.nome;
        var baixar = $('#licao-baixar'); if (baixar) { baixar.href = atual.download; baixar.hidden = false; }
        var abrir = $('#licao-abrir'); if (abrir) { abrir.href = atual.url; abrir.hidden = false; }
        var zap = $('#licao-whats');
        if (zap) { zap.href = 'https://wa.me/?text=' + encodeURIComponent('Lição de célula da semana: ' + atual.nome + '\n' + atual.url); zap.hidden = false; }
        arquivos.slice(1, 13).forEach(function (a) {
          var li = el('li');
          li.innerHTML = '<span class="icone-arquivo" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg></span>';
          var txt = el('span', { class: 'col', style: '--base:220px;display:flex;flex-direction:column' });
          txt.appendChild(el('strong', null, a.nome));
          txt.appendChild(el('span', { class: 'pequeno' }, 'Publicada em ' + a.data));
          li.appendChild(txt);
          var link = el('a', { class: 'btn btn--contorno', href: a.download, style: 'min-height:44px;padding:10px 16px' }, 'Baixar');
          li.appendChild(link);
          listaLicoes.appendChild(li);
        });
        if (arquivos.length === 1 && semLicoes) { semLicoes.hidden = false; semLicoes.textContent = 'As próximas lições vão aparecer aqui.'; }
      }).catch(function () { if (semLicoes) semLicoes.hidden = false; });
    }
  }
})();
