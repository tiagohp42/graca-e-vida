/* =====================================================================
   CONFIGURAÇÃO DO SITE · Comunidade Graça e Vida
   ---------------------------------------------------------------------
   Este é o ÚNICO arquivo que você precisa mexer no dia a dia.

   COMO EDITAR PELO GITHUB:
   1. Abra github.com/tiagohp42/graca-e-vida › pasta js › config.js
   2. Clique no lápis (Edit this file)
   3. Mude só o que está entre aspas "assim" (ou o null)
   4. Clique em "Commit changes". Em 1 a 2 minutos o site atualiza.

   REGRAS PARA NÃO QUEBRAR O SITE:
   • Textos sempre entre aspas: "assim".
   • Cada item termina com vírgula.
   • Linhas que começam com // são só explicação. O site ignora.
   • Se algo der errado, volte a versão anterior em History no GitHub.
   ===================================================================== */

window.CGV_CONFIG = {

  /* -------------------------------------------------------------------
     1) WHATSAPP DA IGREJA
     Só números: 55 + DDD + número, sem espaço, traço ou parênteses.
       Certo:  "5542999998888"
       Errado: "(42) 99999-8888"
     Vazio "" = todos os botões de WhatsApp ficam escondidos, sem buraco no layout.
     Preenchido = aparece o ícone no rodapé, o botão "Fale conosco" e o botão
     "Quero participar de uma célula" passa a abrir uma conversa no WhatsApp.
     ------------------------------------------------------------------- */
  WHATSAPP: "",

  /* -------------------------------------------------------------------
     2) INSTAGRAM DA IGREJA
     Só o nome do perfil, sem @ e sem link.
       Certo:  "comunidadegracaevida"
       Errado: "@comunidadegracaevida" ou "https://instagram.com/..."
     Vazio "" = ícone do Instagram escondido.
     ------------------------------------------------------------------- */
  INSTAGRAM: "",

  /* -------------------------------------------------------------------
     3) EVENTO EM DESTAQUE (topo da página Eventos)
     null = escondido (a página começa direto pela agenda).

     Para mostrar, apague o null e cole o modelo abaixo SEM as barras //:

     EVENTO_DESTAQUE: {
       titulo: "Chá de Primavera",
       descricao: "Uma tarde de acolhimento para mulheres, com louvor, Palavra e testemunhos.",
       data: "2026-12-13",            // ano-mês-dia
       horario: "15h",
       local: "Rua Independência, 259",
       vagas: 60,                      // número sem aspas, ou null para não mostrar
       arte: "img/eventos/cha.jpg"     // ou null para usar o fundo dourado
     },

     A arte fica melhor na horizontal (1200 × 800). Envie para a pasta img/eventos.
     O evento entra sozinho como primeira opção do formulário de inscrição.
     Quando o evento passar, volte para null.
     ------------------------------------------------------------------- */
  EVENTO_DESTAQUE: null,

  /* -------------------------------------------------------------------
     4) CÉLULAS (seção "A igreja também acontece nas casas", na página inicial)
     Vazio [] = aparecem 3 cartões de apresentação (Toda semana, Perto de você,
     Para todos). Preenchido = aparece a lista das células.
     Por segurança das famílias, NÃO coloque o endereço da casa: só o bairro.
     Modelo (uma linha por célula, com vírgula no fim, SEM as barras //):

       { dia: "Terça", horario: "20h", bairro: "Centro", lider: "Nome do líder", publico: "Casais" },

     lider e publico são opcionais (pode deixar "").
     ------------------------------------------------------------------- */
  CELULAS: [
    // { dia: "Segunda", horario: "20h", bairro: "Centro", lider: "", publico: "" },
    // { dia: "Quarta", horario: "19h30", bairro: "Jardim Alegre", lider: "", publico: "Jovens" },
  ],

  /* -------------------------------------------------------------------
     5) LIDERANÇA (seção "Pessoas que cuidam de pessoas", na página inicial)
     foto: coloque a foto na pasta img/lideranca e escreva o caminho,
           ex.: "img/lideranca/nelson.jpg". Foto quadrada, de rosto, 400 × 400.
           Sem foto ("") = aparece um círculo dourado com as iniciais.
     frase: uma frase curta de boas-vindas DITA pela pessoa (opcional, pode ficar "").
     Lista vazia [] = a seção fica escondida.
     ------------------------------------------------------------------- */
  LIDERANCA: [
    { nome: "Nelson Davi de Souza", funcao: "Presidente", foto: "", frase: "" },
    // { nome: "Nome do pastor", funcao: "Pastor", foto: "img/lideranca/pastor.jpg", frase: "Seja bem-vindo à nossa casa." },
  ],

  /* ===================================================================
     DAQUI PARA BAIXO, NORMALMENTE NÃO PRECISA MUDAR
     =================================================================== */

  // Endereço do Apps Script da planilha "Graça e Vida · Cadastros do site".
  API_URL: "https://script.google.com/macros/s/AKfycbwEMeMkc7tPxRM8a7X2yNjSmogg0YdeWbmdO3ZacwtbJxfda6yNQ02peNfKhdYO24Vq/exec",

  // Canal do YouTube.
  YOUTUBE_CANAL_ID: "UCH6nQKrkyuLB1iAqDx9J9Yw",
  YOUTUBE_URL: "https://www.youtube.com/@comunidadegracaevida7481",

  // Chave PIX (CNPJ só com números).
  PIX: "27113399000173",

  // Pasta das lições de célula no Google Drive.
  PASTA_LICOES: "https://drive.google.com/drive/folders/1ofXFlIZYoNSRi8tky22x3-08ZdLuSXdG",

  // Horário do culto ao vivo (0 = domingo). O player aparece 15 min antes do início.
  AO_VIVO: { diaDaSemana: 0, inicio: "19:00", fim: "21:30" }
};
