/**
 * Comunidade Graça e Vida · ligação do site com a planilha
 * ------------------------------------------------------------
 * Cole este código em: planilha "Graça e Vida · Cadastros do site"
 * › Extensões › Apps Script. Depois: Implantar › Nova implantação
 * › Tipo: App da Web › Executar como: Eu › Quem pode acessar: Qualquer pessoa.
 * Copie o endereço que termina em /exec para o arquivo js/config.js do site (API_URL).
 *
 * Sempre que mudar este código: Implantar › Gerenciar implantações › editar (lápis)
 * › Versão: Nova versão › Implantar. Assim o endereço continua o mesmo.
 */

var PLANILHA_ID = '1mrzxVLALON2cofAp55qbbf8tj6rXu7VYpV2R6UTZSZ0';
var PASTA_LICOES_ID = '1ofXFlIZYoNSRi8tky22x3-08ZdLuSXdG';
var NOME_PASTA_MATERIAL = 'Material de apoio';
var CANAL_YOUTUBE_ID = 'UCH6nQKrkyuLB1iAqDx9J9Yw';
var PASTA_MISSAO_FOTOS_ID = '10Q9YK-fOsjETleCQcUEBQRV4jAb2g_JT';
var PASTA_MISSAO_NOTICIAS_ID = '1bumkIxqJ1n3zxcwyj-mxSfflpwqUxKs7';
var FUSO = 'America/Sao_Paulo';

var ABA_VISITANTES = 'Visitantes';
var ABA_INSCRICOES = 'Inscrições';
var ABA_ORACAO = 'Pedidos de oração';

/* ---------------- Leitura (o site pede dados) ---------------- */
function doGet(e) {
  var acao = (e && e.parameter && e.parameter.acao) || '';
  try {
    if (acao === 'mural') return json_({ ok: true, pedidos: mural_() });
    if (acao === 'licoes') return json_(licoes_());
    if (acao === 'videos') return json_({ ok: true, videos: videos_() });
    if (acao === 'missao') return json_(missao_());
    if (acao === 'teste') return json_({ ok: true, mensagem: 'Ligação com a planilha funcionando.' });
    return json_({ ok: false, erro: 'acao-desconhecida' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, erro: 'falha' });
  }
}

/* ---------------- Envio (formulários do site) ---------------- */
function doPost(e) {
  var dados;
  try { dados = JSON.parse(e.postData.contents); } catch (x) { return json_({ ok: false, erro: 'dados-invalidos' }); }
  if (!limiteOk_()) return json_({ ok: false, erro: 'muitos-envios' });

  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (x) { return json_({ ok: false, erro: 'ocupado' }); }
  try {
    var agora = new Date();
    if (dados.tipo === 'visitante') {
      if (!txt_(dados.nome) || !txt_(dados.whatsapp) || dados.consentimento !== true) return json_({ ok: false, erro: 'faltam-dados' });
      escrever_(ABA_VISITANTES, [
        agora, txt_(dados.nome, 120), txt_(dados.whatsapp, 20), txt_(dados.email, 120), data_(dados.nascimento),
        txt_(dados.bairro, 80), txt_(dados.origem, 60),
        dados.visita === true, dados.celula === true, dados.batismo === true, dados.jesus === true, dados.oracao === true,
        txt_(dados.endereco, 160), txt_(dados.melhorHorario, 120), txt_(dados.pedido, 600), txt_(dados.mensagem, 1000),
        true, 'Novo'
      ]);
      if (dados.oracao === true && txt_(dados.pedido)) {
        escrever_(ABA_ORACAO, [agora, txt_(dados.nome, 80), false, txt_(dados.pedido, 600) + '\n(veio do cadastro de visitante)', 'Privado', false, 0]);
      }
      return json_({ ok: true });
    }
    if (dados.tipo === 'inscricao') {
      if (!txt_(dados.nome) || !txt_(dados.whatsapp) || !txt_(dados.evento) || dados.consentimento !== true) return json_({ ok: false, erro: 'faltam-dados' });
      var pessoas = Math.max(1, Math.min(10, parseInt(dados.pessoas, 10) || 1));
      escrever_(ABA_INSCRICOES, [
        agora, txt_(dados.evento, 120), txt_(dados.nome, 120), txt_(dados.whatsapp, 20), txt_(dados.email, 120),
        pessoas, txt_(dados.obs, 600), true, false
      ]);
      return json_({ ok: true });
    }
    if (dados.tipo === 'oracao') {
      if (!txt_(dados.pedido)) return json_({ ok: false, erro: 'faltam-dados' });
      var anonimo = dados.anonimo === true || !txt_(dados.nome);
      var vis = dados.visibilidade === 'Privado' ? 'Privado' : 'Mural';
      escrever_(ABA_ORACAO, [agora, anonimo ? '' : txt_(dados.nome, 80), anonimo, txt_(dados.pedido, 600), vis, false, 0]);
      return json_({ ok: true });
    }
    if (dados.tipo === 'orei') {
      oreiPor_(String(dados.id || ''));
      return json_({ ok: true });
    }
    return json_({ ok: false, erro: 'tipo-desconhecido' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, erro: 'falha' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Mural de oração ---------------- */
// Só aparecem pedidos com Visibilidade = "Mural" e "Aprovado para o mural" marcado,
// e só com o primeiro nome da pessoa.
function mural_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('mural');
  if (c) return JSON.parse(c);
  var aba = aba_(ABA_ORACAO);
  var n = aba.getLastRow();
  if (n < 2) return [];
  var linhas = aba.getRange(2, 1, n - 1, 7).getValues();
  var lista = [];
  linhas.forEach(function (l) {
    var quando = l[0], nome = l[1], anon = l[2], pedido = l[3], vis = l[4], aprovado = l[5], oracoes = l[6];
    if (!(quando instanceof Date) || !pedido) return;
    if (String(vis).toLowerCase() !== 'mural' || aprovado !== true) return;
    var primeiro = String(nome || '').trim().split(/\s+/)[0];
    lista.push({
      id: String(quando.getTime()),
      autor: (anon === true || !primeiro) ? 'Anônimo' : primeiro,
      texto: String(pedido).slice(0, 600),
      data: Utilities.formatDate(quando, FUSO, 'dd/MM'),
      oracoes: Number(oracoes) || 0,
      t: quando.getTime()
    });
  });
  lista.sort(function (a, b) { return b.t - a.t; });
  lista = lista.slice(0, 60).map(function (p) { delete p.t; return p; });
  cache.put('mural', JSON.stringify(lista), 60);
  return lista;
}

function oreiPor_(id) {
  if (!/^\d{10,}$/.test(id)) return;
  var aba = aba_(ABA_ORACAO);
  var n = aba.getLastRow();
  if (n < 2) return;
  var col = aba.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (col[i][0] instanceof Date && String(col[i][0].getTime()) === id) {
      var linha = i + 2;
      var aprovado = aba.getRange(linha, 6).getValue();
      if (aprovado !== true) return;
      var cel = aba.getRange(linha, 7);
      cel.setValue((Number(cel.getValue()) || 0) + 1);
      CacheService.getScriptCache().remove('mural');
      return;
    }
  }
}

/* ---------------- Lições de célula ---------------- */
// A lição mais recente (PDF ou Google Docs) da pasta de lições vira a "lição da semana".
function licoes_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('licoes');
  if (c) return JSON.parse(c);
  var raiz = DriveApp.getFolderById(PASTA_LICOES_ID);
  var arquivos = [], material = [];
  juntar_(raiz, arquivos, material, false, 0);
  arquivos.sort(function (a, b) { return b.t - a.t; });
  material.sort(function (a, b) { return a.titulo.localeCompare(b.titulo, 'pt-BR'); });
  var limpa = function (x) { delete x.t; return x; };
  var r = { ok: true, licoes: arquivos.slice(0, 12).map(limpa), material: material.slice(0, 20).map(limpa) };
  cache.put('licoes', JSON.stringify(r), 300);
  return r;
}

function juntar_(pasta, arquivos, material, ehMaterial, nivel) {
  if (nivel > 4) return;
  var it = pasta.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    var tipo = f.getMimeType();
    var ehPdf = tipo === 'application/pdf';
    var ehDoc = tipo === MimeType.GOOGLE_DOCS;
    if (!ehMaterial && !ehPdf && !ehDoc) continue;
    var id = f.getId();
    var item = {
      titulo: f.getName().replace(/\.[a-z0-9]{2,4}$/i, ''),
      data: Utilities.formatDate(f.getDateCreated(), FUSO, 'dd/MM/yyyy'),
      baixar: ehDoc ? 'https://docs.google.com/document/d/' + id + '/export?format=pdf' : 'https://drive.google.com/uc?export=download&id=' + id,
      ver: ehDoc ? 'https://docs.google.com/document/d/' + id + '/view' : 'https://drive.google.com/file/d/' + id + '/view',
      t: f.getDateCreated().getTime()
    };
    if (ehMaterial) {
      if (!ehPdf && !ehDoc) item.baixar = f.getUrl();
      material.push(item);
    } else {
      arquivos.push(item);
    }
  }
  var sub = pasta.getFolders();
  while (sub.hasNext()) {
    var s = sub.next();
    juntar_(s, arquivos, material, ehMaterial || s.getName().trim().toLowerCase() === NOME_PASTA_MATERIAL.toLowerCase(), nivel + 1);
  }
}

/* ---------------- Últimas mensagens do YouTube ---------------- */
function videos_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('videos');
  if (c) return JSON.parse(c);
  var lista = [];
  try {
    var xml = UrlFetchApp.fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + CANAL_YOUTUBE_ID, { muteHttpExceptions: true }).getContentText();
    var doc = XmlService.parse(xml);
    var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
    var yt = XmlService.getNamespace('yt', 'http://www.youtube.com/xml/schemas/2015');
    doc.getRootElement().getChildren('entry', atom).slice(0, 6).forEach(function (en) {
      lista.push({ id: en.getChildText('videoId', yt), titulo: en.getChildText('title', atom) });
    });
  } catch (err) { console.warn(err); }
  cache.put('videos', JSON.stringify(lista), 1800);
  return lista;
}

/* ---------------- Missão Moçambique ---------------- */
// Fotos: imagens da pasta "Fotos (aparecem no site)", das mais novas para as mais antigas.
// A descrição do arquivo no Drive (botão direito › Informações do arquivo) vira a legenda.
// Notícias: PDFs e Google Docs da pasta "Notícias do campo".
function missao_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('missao');
  if (c) return JSON.parse(c);
  var fotos = [], noticias = [];
  var it = DriveApp.getFolderById(PASTA_MISSAO_FOTOS_ID).getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (String(f.getMimeType()).indexOf('image/') !== 0) continue;
    fotos.push({ id: f.getId(), legenda: String(f.getDescription() || '').slice(0, 140), t: f.getDateCreated().getTime() });
  }
  var it2 = DriveApp.getFolderById(PASTA_MISSAO_NOTICIAS_ID).getFiles();
  while (it2.hasNext()) {
    var n = it2.next();
    var tipo = n.getMimeType();
    if (tipo !== 'application/pdf' && tipo !== MimeType.GOOGLE_DOCS) continue;
    noticias.push({
      titulo: n.getName().replace(/\.[a-z0-9]{2,4}$/i, ''),
      data: Utilities.formatDate(n.getDateCreated(), FUSO, 'dd/MM/yyyy'),
      ver: tipo === 'application/pdf' ? 'https://drive.google.com/file/d/' + n.getId() + '/view' : 'https://docs.google.com/document/d/' + n.getId() + '/view',
      t: n.getDateCreated().getTime()
    });
  }
  var porData = function (a, b) { return b.t - a.t; };
  var limpa = function (x) { delete x.t; return x; };
  fotos.sort(porData); noticias.sort(porData);
  var r = { ok: true, fotos: fotos.slice(0, 60).map(limpa), noticias: noticias.slice(0, 10).map(limpa) };
  cache.put('missao', JSON.stringify(r), 300);
  return r;
}

/* ---------------- Ajudantes ---------------- */
function aba_(nome) {
  var aba = SpreadsheetApp.openById(PLANILHA_ID).getSheetByName(nome);
  if (!aba) throw new Error('Aba não encontrada: ' + nome);
  return aba;
}

// Escreve na primeira linha com a coluna A vazia (as linhas já têm caixas de seleção prontas).
function escrever_(nomeAba, valores) {
  var aba = aba_(nomeAba);
  var max = aba.getMaxRows();
  var colA = aba.getRange(2, 1, Math.max(1, max - 1), 1).getValues();
  var linha = -1;
  for (var i = 0; i < colA.length; i++) { if (colA[i][0] === '' || colA[i][0] === null) { linha = i + 2; break; } }
  if (linha === -1) { aba.insertRowsAfter(max, 50); linha = max + 1; }
  aba.getRange(linha, 1, 1, valores.length).setValues([valores]);
  if (nomeAba === ABA_ORACAO) CacheService.getScriptCache().remove('mural');
}

// Limpa o texto e impede que algo digitado vire fórmula na planilha.
function txt_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (max) s = s.slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function data_(v) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
  if (!m) return '';
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// No máximo 40 envios por minuto no total (protege contra robôs).
function limiteOk_() {
  var cache = CacheService.getScriptCache();
  var chave = 'envios-' + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(chave) || 0);
  if (n >= 40) return false;
  cache.put(chave, String(n + 1), 120);
  return true;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Rode esta função uma vez pelo editor para autorizar o acesso à planilha e à pasta.
function autorizar() {
  aba_(ABA_VISITANTES);
  DriveApp.getFolderById(PASTA_LICOES_ID).getName();
  DriveApp.getFolderById(PASTA_MISSAO_FOTOS_ID).getName();
  UrlFetchApp.fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + CANAL_YOUTUBE_ID, { muteHttpExceptions: true });
  console.log('Tudo autorizado.');
}
