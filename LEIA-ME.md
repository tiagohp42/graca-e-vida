# Site da Comunidade Graça e Vida

Endereço: **https://tiagohp42.github.io/graca-e-vida/**
Página das tags NFC e chaveiros: **https://tiagohp42.github.io/graca-e-vida/contribua/**

Site 100% estático (HTML, CSS e JavaScript), feito para o GitHub Pages. Todos os caminhos são relativos.
Os formulários, o mural de oração e as lições usam a planilha do Google pelo Apps Script, sem servidor próprio.

---

## 1. Onde colocar as fotos

| O quê | Pasta | Nome do arquivo | Tamanho ideal |
|---|---|---|---|
| Cards dos ministérios | `img/ministerios/` | `familias.jpg`, `jovens.jpg`, `mulheres.jpg`, `homens.jpg`, `criancas.jpg`, `impacto-social.jpg` | 700 × 1050, vertical, até 150 KB |
| Liderança / pastores | `img/lideranca/` | o nome que quiser, ex.: `nelson.jpg` (depois escreva no `config.js`) | 400 × 400, rosto, até 80 KB |
| Arte do evento em destaque | `img/eventos/` | o nome que quiser (depois escreva no `config.js`) | 1200 × 800, horizontal, até 200 KB |
| Foto grande do topo | `img/` | `hero.jpg` (substitua mantendo o nome) | 1920 × 1280, até 250 KB |

- Use **JPG**, nome **tudo minúsculo, sem acento e sem espaço**.
- Card de ministério sem foto não quebra: aparece um fundo dourado com o ícone.
- Pastor sem foto aparece com as iniciais num círculo dourado.
- Para deixar a foto leve: abra em squoosh.app, escolha MozJPEG, qualidade 75 e a largura da tabela.

## 2. Como preencher seus dados (`js/config.js`)

Abra o arquivo no GitHub › lápis (Edit) › mude › **Commit changes**. Cada campo tem explicação e exemplo dentro do próprio arquivo.

- `WHATSAPP`: só números com 55 + DDD, ex.: `"5542999998888"`. Vazio = botões escondidos.
- `INSTAGRAM`: só o nome do perfil, sem @, ex.: `"comunidadegracaevida"`. Vazio = ícone escondido.
- `EVENTO_DESTAQUE`: `null` esconde. Para mostrar, cole o modelo que está comentado no arquivo.
- `CELULAS`: uma linha por célula com dia, horário e **só o bairro** (nunca o endereço da casa). Vazio = 3 cartões de apresentação.
- `LIDERANCA`: nome, função, foto e uma frase (opcional) **dita pela própria pessoa**. Vazio = seção escondida.

Testamos o site com todos esses campos vazios e preenchidos: o layout fica certo nos dois casos.

## 3. Como atualizar o site no GitHub

**Para mudar só o config ou só uma foto:**
1. Abra github.com/tiagohp42/graca-e-vida e entre na pasta (ex.: `img/ministerios`).
2. **Add file › Upload files**, arraste a foto e clique em **Commit changes**.
3. Arquivo com o mesmo nome é substituído. Em 1 a 2 minutos o site atualiza.

**Para subir uma versão nova inteira (pacote .zip):**
1. Descompacte o .zip no computador.
2. Abra github.com/tiagohp42/graca-e-vida › **Add file › Upload files**.
3. Abra a pasta descompactada, selecione **tudo o que está dentro dela** (não a pasta em si) e arraste para a página.
4. Clique em **Commit changes**. Os arquivos com o mesmo nome são substituídos; os outros continuam.
5. Acompanhe em **Actions** (bolinha verde = publicado) e abra o site com Ctrl+F5.

## Missões (aba Missões)

Endereço: **…/graca-e-vida/missoes/** · Página para tag NFC da missão: **…/graca-e-vida/missoes/contribua/**

- **Fotos da galeria:** coloque no Google Drive, em "Graça e Vida · Missão Moçambique › Fotos (aparecem no site)".
  Aparecem sozinhas em até 5 minutos, as mais novas primeiro. A pasta precisa estar como
  **Qualquer pessoa com o link: Leitor**, senão as fotos não aparecem para os visitantes.
  Legenda (opcional): no Drive, botão direito na foto › Informações do arquivo › Descrição.
- **Notícias do campo:** PDFs ou Google Docs na pasta "Notícias do campo". Aparecem como lista com botão "Ler".
- **Vídeos, cidade, texto, missionários, capa:** no `js/config.js`, item 6 (MISSAO).
- **PIX da missão:** no `js/config.js`, item 7 (MISSAO_PIX). É separado do PIX da igreja. Enquanto a chave estiver vazia,
  aparece um botão "Pedir o PIX da missão no WhatsApp".
- **Meta de arrecadação:** item 8 (MISSAO_META). `null` esconde a barra.

## WhatsApp

O número fica em `WHATSAPP` no `js/config.js` (hoje: 5542991472626). Ele aparece:
no topo de todas as páginas, no botão verde flutuante (canto de baixo), no menu do celular, no rodapé e no botão de células.
A mensagem que já vem escrita muda conforme a página (ex.: no Mural de oração, "Gostaria de um pedido de oração").
Nas páginas de PIX (Contribua) o botão flutuante não aparece, para não cobrir a chave.

## O que funciona sozinho

- **Ao vivo:** domingo, de 18h45 às 21h30, o player do YouTube aparece na página Ao vivo.
- **Agenda:** as datas dos cultos e encontros se calculam sozinhas.
- **Formulários:** cadastro de visitante, inscrição e pedido de oração vão para a planilha "Graça e Vida · Cadastros do site".
- **Mural de oração:** só aparecem pedidos com Visibilidade = "Mural" e "Aprovado para o mural" marcado, só com o primeiro nome.
- **Downloads:** o PDF (ou Google Docs) mais novo da pasta "Graça e Vida · Lições de Célula" vira a lição da semana.
  O nome do arquivo vira o título, ex.: `Lição 12 - O amor que acolhe.pdf`. A subpasta "Material de apoio" aparece em Material de apoio.
- **Mensagens anteriores:** os 3 vídeos mais recentes do canal aparecem na página Ao vivo.
- **Células:** o botão "Quero participar" abre o WhatsApp (se preenchido) ou o cadastro com a opção "célula" já marcada.

## Banco de dados (Neon)

Os formulários (visitante, inscrição, pedido de oração) e o mural de oração gravam no banco **Neon** (projeto `winter-rice-57955028`, branch `production`). A planilha não recebe mais esses dados.

- **Área da equipe:** `/admin/` no site. Entra quem tiver conta com um e-mail da lista `ADMIN_EMAILS` (no `.env.local`). Lá dá para ver visitantes, inscrições e pedidos, **aprovar pedidos para o mural** e exportar CSV.
- **Mural ao vivo:** pedidos aprovados e o contador "Orei por você" aparecem sem recarregar a página (Neon Realtime).
- **Código:** API em `backend/api.ts` (Neon Function `api`), tabelas em `backend/schema.sql`, telas em `src/` (o `npm run build` gera `js/admin.js` e `js/mural-live.js`; esses dois arquivos vão para o GitHub).
- **Comandos** (precisa do Node e do `neon` instalados, e do `.env.local`, que nunca vai para o GitHub):
  - `npm run build` · gera os scripts do site
  - `npm run db:migrate` · cria/atualiza as tabelas
  - `npm run deploy` · publica a API e os serviços do `neon.ts`
  - `npm run test:admin` · testa login, área da equipe e exportação
- Para dar acesso a alguém da equipe: acrescente o e-mail em `ADMIN_EMAILS` no `.env.local`, rode `npm run deploy` e peça para a pessoa clicar em "Criar conta" em `/admin/`.

## Planilha e Apps Script

O Apps Script continua sendo usado para **lições, vídeos e fotos da missão** (Google Drive e YouTube).

- Projeto: **Graça e Vida · Site** em script.google.com (conta tiagoesamia@gmail.com). Cópia do código em `apps-script/Codigo.gs`.
- Mudou o código? Implantar › Gerenciar implantações › lápis › Versão: **Nova versão** › Implantar (o endereço continua o mesmo).
- Não mude o nome das abas nem a ordem das colunas. A planilha tem dados pessoais: compartilhe só com quem cuida dela.

## SEO e compartilhamento

- Cada página tem título, descrição, link canônico e Open Graph (a prévia que aparece no WhatsApp usa `img/compartilhar.jpg`, 1200 × 630).
- A página inicial tem dados estruturados de igreja (endereço e horário do culto) para o Google.
- `sitemap.xml` pode ser enviado no Google Search Console.

## Domínio próprio (opcional)

Se um dia comprar um domínio (ex.: gracaevida.com.br): Settings › Pages › Custom domain.
Depois troque `https://tiagohp42.github.io/graca-e-vida/` pelo domínio novo nas páginas e no `sitemap.xml`,
e `/graca-e-vida/` por `/` no `404.html`.
