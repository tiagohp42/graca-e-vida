/* Comunidade Graça e Vida · tela de "obrigado" da página Primeira vez
   Aparece depois que o cadastro de visitante é enviado com sucesso.
   Para mudar um texto, edite só o objeto TEXTOS abaixo.
   Marcadores: {nome} = primeiro nome da pessoa · {perto} = "perto do <bairro>" ou "perto de você" */
(function () {
  "use strict";

  var WHATSAPP = "5542991472626";

  var TEXTOS = {
    topo: {
      titulo: "Obrigado, {nome}! 💛",
      tituloSemNome: "Obrigado! 💛",
      texto: "Recebemos seu cadastro. Que alegria ter você com a gente. Separamos aqui algumas palavras sobre o que você nos contou:"
    },
    // A ordem aqui é a mesma das opções do formulário (Etapa 2)
    blocos: [
      {
        campo: "visita",
        icone: "🏠",
        titulo: "Uma palavra do Pr. Nelson",
        // TODO texto aguardando revisão do Pr. Nelson
        paragrafos: [
          "“{nome}, fico muito feliz em saber que você quer nos receber na sua casa. A igreja não é um prédio, somos pessoas caminhando juntas, e será uma honra conversar e orar com você e sua família.",
          "Em breve alguém da nossa equipe vai entrar em contato pelo WhatsApp para agendar a visita no melhor dia e horário para você.”"
        ],
        assinatura: "— Pr. Nelson Davi de Souza"
      },
      {
        campo: "celula",
        icone: "👥",
        titulo: "O que é uma célula?",
        paragrafos: [
          "É um encontro pequeno, na casa de alguém, durante a semana. Ali a gente se conhece de verdade: conversa, ora junto, estuda a Bíblia e cuida um do outro. É onde a igreja vira família.",
          "Temos células de segunda a sábado em vários bairros da cidade. Um líder vai entrar em contato com você para te convidar para a mais {perto}."
        ]
      },
      {
        campo: "batismo",
        icone: "💧",
        titulo: "Que alegria! 🎉",
        paragrafos: [
          "O batismo é uma declaração pública de fé: você diz a todos que decidiu seguir Jesus. É um passo de obediência, que o próprio Jesus deu e ensinou (Mateus 28:19), e simboliza uma vida nova: o velho fica para trás, e você começa de novo com Ele."
        ],
        // TODO confirmar as etapas do batismo com a liderança
        subtitulo: "Como funciona:",
        lista: [
          "Uma conversa com um pastor ou líder",
          "Encontro de preparação para o batismo",
          "A celebração do batismo 🙌"
        ],
        botao: { texto: "Quero dar o próximo passo", whatsapp: "Olá! Sou {nome}, fiz meu cadastro no site e quero me batizar. Como faço para começar?" }
      },
      {
        campo: "jesus",
        icone: "✝️",
        titulo: "Quem é Jesus?",
        paragrafos: [
          "Jesus não é só um personagem da história ou um nome na religião. Ele é Deus que se fez homem para se aproximar de nós. Ele andou entre pessoas comuns, sentou à mesa com quem todo mundo rejeitava, curou feridos e acolheu cansados.",
          "Ele mesmo disse: “Eu sou o caminho, e a verdade, e a vida” (João 14:6).",
          "Na cruz, Ele carregou o que a gente não conseguia carregar. E ressuscitou, para que ninguém precise caminhar sozinho.",
          "Você não precisa entender tudo agora. Basta dar o primeiro passo, e a gente caminha com você, sem pressa. 💛"
        ]
      },
      {
        campo: "oracao",
        icone: "🙏",
        titulo: "Estamos orando por você",
        paragrafos: [
          "Orar é conversar com Deus, com sinceridade, do jeito que você é. E a Bíblia nos convida a levar tudo a Ele: “Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós” (1 Pedro 5:7).",
          "Nossa equipe de oração já recebeu seu nome. Se quiser, conte para a gente pelo que podemos orar. Seu pedido fica só com a equipe de oração."
        ],
        botao: { texto: "Enviar meu pedido de oração", whatsapp: "Olá! Sou {nome} e gostaria de pedir oração por: " }
      }
    ],
    rodape: {
      texto: "Te esperamos no domingo às 19h! Um lugar para todos.",
      botao: "Voltar para o início"
    }
  };

  /* ---------- montagem (não precisa editar daqui para baixo) ---------- */
  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto; // sempre texto puro: nada do visitante vira HTML
    return e;
  }

  function trocar(t, v) {
    return t.replace(/\{nome\}/g, v.nome).replace(/\{perto\}/g, v.perto);
  }

  function linkWhats(msg) {
    var a = el("a", "btn btn-ouro obg-whats", null);
    a.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  function card(b, v, aberto, i) {
    var det = el("details", "obg-card");
    if (aberto) det.open = true;
    var sum = el("summary", "obg-card-topo");
    sum.appendChild(el("span", "obg-icone", b.icone)).setAttribute("aria-hidden", "true");
    sum.appendChild(el("span", "obg-card-titulo", trocar(b.titulo, v)));
    sum.appendChild(el("span", "obg-seta")).setAttribute("aria-hidden", "true");
    det.appendChild(sum);

    var corpo = el("div", "obg-card-corpo");
    corpo.id = "obg-bloco-" + i;
    b.paragrafos.forEach(function (p) { corpo.appendChild(el("p", null, trocar(p, v))); });
    if (b.assinatura) corpo.appendChild(el("p", "obg-assinatura", b.assinatura));
    if (b.subtitulo) corpo.appendChild(el("p", "obg-subtitulo", b.subtitulo));
    if (b.lista) {
      var ol = el("ol", "obg-lista");
      b.lista.forEach(function (item) { ol.appendChild(el("li", null, trocar(item, v))); });
      corpo.appendChild(ol);
    }
    if (b.botao) {
      var a = linkWhats(trocar(b.botao.whatsapp, v));
      a.textContent = b.botao.texto;
      corpo.appendChild(a);
    }
    det.appendChild(corpo);
    return det;
  }

  // dados = o que o formulário enviou (nome, bairro e as opções marcadas)
  function mostrar(caixa, dados) {
    var nome = String(dados.nome || "").trim().split(/\s+/)[0] || "";
    var bairro = String(dados.bairro || "").trim();
    var v = { nome: nome, perto: bairro ? "perto do " + bairro : "perto de você" };
    var marcados = TEXTOS.blocos.filter(function (b) { return dados[b.campo] === true; });

    caixa.textContent = "";
    var topo = el("div", "obg-topo");
    var logo = el("img", "obg-logo");
    logo.src = "../img/logo.png"; logo.alt = ""; logo.width = 150;
    topo.appendChild(logo);
    var h2 = el("h2", "obg-titulo", nome ? trocar(TEXTOS.topo.titulo, v) : TEXTOS.topo.tituloSemNome);
    h2.tabIndex = -1;
    topo.appendChild(h2);
    if (marcados.length) topo.appendChild(el("p", "obg-texto", TEXTOS.topo.texto));
    else topo.appendChild(el("p", "obg-texto", TEXTOS.topo.texto.split(". Separamos")[0] + "."));
    caixa.appendChild(topo);

    if (marcados.length) {
      var lista = el("div", "obg-cards");
      marcados.forEach(function (b, i) { lista.appendChild(card(b, v, marcados.length === 1, i)); });
      caixa.appendChild(lista);
    }

    var rod = el("div", "obg-rodape");
    rod.appendChild(el("p", "obg-convite", TEXTOS.rodape.texto));
    var volta = el("a", "btn btn-claro btn-sm", TEXTOS.rodape.botao);
    volta.href = "../";
    rod.appendChild(volta);
    caixa.appendChild(rod);

    caixa.hidden = false;
    caixa.scrollIntoView({ behavior: "smooth", block: "start" });
    try { h2.focus({ preventScroll: true }); } catch (x) {}
  }

  window.CGV_OBRIGADO = { mostrar: mostrar, TEXTOS: TEXTOS };
})();
