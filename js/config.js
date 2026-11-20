/*
 * CONFIGURAÇÃO DO SITE · Comunidade Graça e Vida
 * Este é o único arquivo que você precisa editar no dia a dia.
 * Depois de mudar, salve e publique o site de novo.
 */
window.CGV_CONFIG = {

  // Endereço do Apps Script da planilha "Graça e Vida · Cadastros do site".
  // Termina em /exec. Enquanto estiver vazio, os formulários avisam que o envio ainda não está ligado.
  API_URL: "https://script.google.com/macros/s/AKfycbwEMeMkc7tPxRM8a7X2yNjSmogg0YdeWbmdO3ZacwtbJxfda6yNQ02peNfKhdYO24Vq/exec",

  // WhatsApp da igreja só com números: 55 + DDD + número. Ex.: "5542999998888".
  // Vazio = os botões de WhatsApp ficam escondidos.
  WHATSAPP: "",

  // Instagram da igreja sem o @. Ex.: "comunidadegracaevida". Vazio = ícone escondido.
  INSTAGRAM: "",

  // Canal do YouTube (não precisa mudar).
  YOUTUBE_CANAL_ID: "UCH6nQKrkyuLB1iAqDx9J9Yw",
  YOUTUBE_URL: "https://www.youtube.com/@comunidadegracaevida7481",

  // Chave PIX (CNPJ só com números).
  PIX: "27113399000173",

  // Pasta das lições de célula no Google Drive.
  PASTA_LICOES: "https://drive.google.com/drive/folders/1ofXFlIZYoNSRi8tky22x3-08ZdLuSXdG",

  // Horário do culto ao vivo (domingo). O player do YouTube aparece sozinho
  // de 15 minutos antes do início até o fim.
  AO_VIVO: { diaDaSemana: 0, inicio: "19:00", fim: "21:30" },

  // EVENTO EM DESTAQUE da página Eventos.
  // null = escondido. Para mostrar, troque null por algo assim:
  // EVENTO_DESTAQUE: {
  //   titulo: "Chá de Primavera",
  //   descricao: "Uma tarde de acolhimento para mulheres, com louvor, Palavra e testemunhos.",
  //   data: "2026-12-13",          // ano-mês-dia
  //   horario: "15h",
  //   local: "Rua Independência, 259",
  //   vagas: 60,                   // ou null para não mostrar
  //   arte: "img/evento.jpg"       // ou null. Coloque a imagem na pasta img
  // },
  EVENTO_DESTAQUE: null
};
