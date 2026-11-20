# Site da Comunidade Graça e Vida

Endereço: **https://tiagohp42.github.io/graca-e-vida/**
Página das tags NFC e chaveiros: **https://tiagohp42.github.io/graca-e-vida/contribua/**

## O que já funciona sozinho

- **Ao vivo:** no domingo, de 18h45 às 21h30, o player do YouTube aparece na página Ao vivo. Não precisa trocar link.
- **Agenda:** as datas dos cultos e encontros se calculam sozinhas.
- **Formulários:** cadastro de visitante, inscrição em eventos e pedidos de oração vão para a planilha
  "Graça e Vida · Cadastros do site", cada um na sua aba.
- **Mural de oração:** só aparecem pedidos com Visibilidade = "Mural" **e** "Aprovado para o mural" marcado,
  só com o primeiro nome. O mural atualiza em até 1 minuto.
- **Downloads:** o PDF (ou Google Docs) mais novo da pasta "Graça e Vida · Lições de Célula" vira a lição da semana.
  O nome do arquivo vira o título, então use nomes como `Lição 12 - O amor que acolhe.pdf`.
  Arquivos da subpasta "Material de apoio" aparecem em Material de apoio. Atualiza em até 5 minutos.
- **Mensagens anteriores:** os 3 vídeos mais recentes do canal aparecem sozinhos na página Ao vivo.

## O que você muda no dia a dia: `js/config.js`

Abra o arquivo no GitHub, clique no lápis (Edit), mude e clique em **Commit changes**. Em 1 ou 2 minutos o site atualiza.

- `WHATSAPP`: número da igreja só com dígitos, ex.: `"5542999998888"`. Enquanto vazio, os botões de WhatsApp ficam escondidos.
- `INSTAGRAM`: o @ sem o @, ex.: `"comunidadegracaevida"`.
- `EVENTO_DESTAQUE`: para mostrar um evento especial no topo da página Eventos, troque `null` pelo modelo
  que está comentado logo acima no arquivo. Para a arte, envie a imagem para a pasta `img` e coloque `"img/nome-da-arte.jpg"`.
  Para esconder de novo, volte para `null`.

## Planilha e Apps Script

- Projeto do Apps Script: **Graça e Vida · Site** (em script.google.com, na conta tiagoesamia@gmail.com).
- O código está também em `apps-script/Codigo.gs`.
- Se mudar o código: Implantar › Gerenciar implantações › lápis › Versão: **Nova versão** › Implantar.
  Assim o endereço continua o mesmo e o site não precisa mudar.
- Não mude o nome das abas nem a ordem das colunas da planilha.
- A planilha tem dados pessoais: compartilhe só com secretaria, pastores e equipe de oração.

## Pasta de lições

Para os líderes conseguirem baixar, a pasta "Graça e Vida · Lições de Célula" precisa estar como
**Qualquer pessoa com o link: Leitor** (Google Drive › botão direito na pasta › Compartilhar).

## Domínio próprio (opcional)

Se um dia comprar um domínio (ex.: gracaevida.com.br), dá para apontar para este site em
Settings › Pages › Custom domain, sem mudar nada no código.
