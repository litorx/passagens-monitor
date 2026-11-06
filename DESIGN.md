---
name: Passagens baratas de São Paulo e Campinas
description: Lista diária de ofertas de ida e volta, uma linha por destino, com o preço como a maior informação da linha.
colors:
  ink: "oklch(24% 0.035 165)"
  ink-secondary: "oklch(40% 0.03 165)"
  ink-tertiary: "oklch(48% 0.027 165)"
  ground: "oklch(98.4% 0.005 165)"
  surface: "oklch(99.7% 0.003 165)"
  panel: "oklch(95.6% 0.014 165)"
  line: "oklch(89.5% 0.013 165)"
  line-strong: "oklch(76% 0.022 165)"
  shell: "oklch(33% 0.085 165)"
  shell-raised: "oklch(40% 0.09 165)"
  on-shell: "oklch(98.5% 0.01 160)"
  deal: "oklch(46% 0.14 152)"
  deal-tint: "oklch(94.5% 0.06 150)"
  deal-fill: "oklch(62% 0.16 150)"
  warn: "oklch(42% 0.09 70)"
  warn-tint: "oklch(95.5% 0.05 85)"
typography:
  display:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.944rem"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.2
  price:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.62rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tnum, lnum"
  title:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
components:
  button-primary:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.on-shell}"
    rounded: "10px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "10px"
    height: "40px"
  tile-continent:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  tag-deal:
    backgroundColor: "{colors.deal-tint}"
    textColor: "{colors.deal}"
    rounded: "6px"
---

# Design System: Passagens baratas de São Paulo e Campinas

## Overview

**Creative North Star: "A etiqueta de preço no balcão"**

A página se lê como uma etiqueta de preço: uma linha por destino, o preço como a coisa maior da linha, e a comparação evidente sem abrir nada. É uma ferramenta de trabalho (modo Operate), então a organização segue o que quem compra passagem já conhece: a lista de resultados do Google Flights, a faixa de exploração do Skyscanner, as abas de ordenação do Kayak e a contenção tipográfica do Linear.

O mundo visual empresta quatro coisas e só essas: tipo, paleta, densidade e um gesto de assinatura. O gesto é a barra fina sob cada preço, na mesma escala da lista, que deixa as linhas comparáveis de relance, somada ao selo de continente no estilo do atlas escolar. A casca é verde comprometida, o fundo é um branco frio e a página nunca imita uma placa de aeroporto, um painel de instrumentos ou um jornal.

**Key Characteristics:**
- Uma família de fonte só, Hanken Grotesk, com números tabulares e pesados nos preços.
- Cor que trabalha: verde profundo na casca e no botão principal, verde claro só para o menor preço, uma cor de continente por região.
- Superfícies planas com linha fina; sombra só no painel de filtros aberto.
- Cada preço diz o que inclui e o que não inclui, ao lado do preço.
- Densidade de ferramenta, com alvos de toque de 44 pixels no celular.

## Colors

Paleta restrita com uma segunda camada neutra e um verde que carrega significado. Nenhum cinza puro: todo neutro é levemente esverdeado (matiz 165).

### Primary
- **Verde-floresta da casca** (oklch(33% 0.085 165)): a faixa do topo, o botão principal "Resgatar ida" e a aba de origem ativa vira superfície clara sobre ele.
- **Verde de oferta** (oklch(46% 0.14 152)): texto de selo "menor preço", links "Ver N opções" e o cursor.
- **Verde de preenchimento** (oklch(62% 0.16 150)): só a barra da linha de menor preço.

### Neutral
- **Tinta verde-escura** (oklch(24% 0.035 165)): texto e títulos.
- **Tinta secundária e terciária** (oklch(40% 0.03 165), oklch(48% 0.027 165)): datas, rotas e rótulos. Terciária chega a 4,6 para 1 sobre a superfície.
- **Chão frio** (oklch(98.4% 0.005 165)) e **superfície** (oklch(99.7% 0.003 165)): fundo da página e da lista.
- **Painel verde-pálido** (oklch(95.6% 0.014 165)): faixa de exploração, controle de ordenação, cabeçalho de colunas e área de opções expandidas.

### Atlas
Cada continente tem um matiz fixo: Brasil 150, América do Sul 95, América do Norte 48, América Central e Caribe 205, Europa 285, África 28, Oriente Médio 350, Ásia e Oceania 245. Aparece como mosaico claro no código do aeroporto (fundo L 94,5 e texto L 31) e como ponto no bloco de continente. O nome do continente sempre está ao lado.

### Named Rules
**A Regra do Verde Escasso.** Preenchimento verde sólido existe só na casca, no botão principal e na barra do menor preço. Em qualquer outro lugar o verde é texto ou tinta clara.
**A Regra do Atlas Nomeado.** A cor de continente nunca carrega significado sozinha: sempre vem com o nome.

## Typography

**Display e corpo:** Hanken Grotesk (com system-ui). Uma família faz títulos, botões, rótulos e dados, como pede uma ferramenta.

**Character:** neutra, redonda e firme, com números pesados que se leem de longe.

### Hierarchy
- **Display** (800, 1,944rem, 1,12): título da página, uma vez.
- **Headline** (800, 1,35rem): título da lista e das opções expandidas.
- **Price** (800, 1,62rem, tabular): o preço de cada linha, sempre a maior fonte da linha.
- **Title** (700, 1,125rem): nome do destino.
- **Body** (400, 0,9375rem, 1,5): datas, rotas e programas. Texto corrido não passa de 74 caracteres.
- **Label** (600, 0,8125rem): rótulos em frase, sem maiúsculas espaçadas.

### Named Rules
**A Regra do Número que Alinha.** Todo número usa algarismos tabulares e alinhados à linha de base, para que colunas de preço se comparem por posição.

## Layout

Casca fixa no topo (64 pixels) com marca, busca e abas de origem. Abaixo, abertura com título e uma frase com o menor preço, a faixa de exploração por continente, abas de tipo, ordenação, filtros e a lista. Contêiner de 1.180 pixels com margem de 24 pixels (16 no celular).

A linha da lista tem cinco colunas no desktop: destino, datas e rota, como pagar, preço e ações. Um cabeçalho de colunas fixo diz uma vez, sobre a coluna de preço, que é "a partir de" e sem taxas de embarque. Abaixo de 64rem a linha vira dois níveis (destino e preço no alto, depois datas, programa e botões), e a nota de preço volta a aparecer em cada linha, porque o cabeçalho some.

Espaçamento em escala de 4 pixels. Mais ar acima de um título do que abaixo.

## Elevation & Depth

Plano por padrão: profundidade vem de tom e linha de 1 pixel. A única sombra é a do painel de filtros aberto (`0 12px 28px -10px` e `0 2px 6px`, em tinta verde a 28% e 8%).

### Named Rules
**A Regra da Superfície Plana.** Cartões e linhas não têm sombra. Sombra só aparece quando algo flutua sobre outra coisa.

## Shapes

Cantos de 8, 12 e 16 pixels por nível: controles 8 a 10, blocos 12, contêineres 16. Selos de continente e tags são quadrados arredondados, nunca pílulas. A barra de preço é um traço de 4 pixels de altura.

## Components

### Buttons
- **Primary** ("Resgatar ida", "Ver voo"): fundo verde da casca, texto claro, raio 10, altura 40 (44 no celular). No hover escurece um passo, no pressionado desce 1 pixel.
- **Secondary** ("Resgatar volta"): superfície clara, linha forte, mesmo tamanho. Nunca mais alto que o primário.
- **Quiet** (links "Ver voo" dentro das opções): texto verde sublinhado, sem borda.
- **Foco:** anel de 2 pixels verde com 2 de distância. **Desativado:** 55% de opacidade e cursor bloqueado.

### Continent tiles
Blocos de filtro com ponto de cor, nome do continente, quantidade de destinos e "a partir de" com o menor preço. O selecionado ganha borda verde da casca de 2 pixels (1 de borda mais 1 interno). No celular rolam na horizontal.

### Kind tabs and sort
Abas de tipo (Todas, Dinheiro, Milhas, Um trecho) com contagem e sublinhado de 3 pixels na ativa. A ordenação é um controle segmentado que mostra o valor de cada critério abaixo do nome, como o Kayak.

### List rows
Linha sem sombra, separada por uma linha fina. Mosaico do aeroporto, nome em 700, região em tinta secundária, preço em 800 à direita com barra sob ele e dois botões à extrema direita. "Ver N opções" abre, dentro da linha, o painel pálido com todas as opções do destino, cada uma com a diferença para a menor.

### Filters
Painel que abre sob o botão "Filtros", com região, programa, preço máximo e "só no mesmo programa". Fecha com Esc ou clique fora. Filtros ativos viram etiquetas removíveis acima da lista.

### Empty state
Título, uma frase com o que tentar e o botão primário "Limpar filtros".

## Do's and Don'ts

### Do:
- **Do** manter o preço como a maior fonte de cada linha e alinhado à direita.
- **Do** dizer, junto do preço, o que ele inclui e que é um piso.
- **Do** usar a cor de continente sempre com o nome do continente.
- **Do** manter tamanho de botão e vocabulário de controle iguais em toda a página.
- **Do** limitar o verde sólido à casca, ao botão principal e à barra do menor preço.

### Don't:
- **Don't** voltar à faixa preta com fonte monoespaçada, ao vidro com mancha de cor ou a uma lista cinza com um único destaque: foram as três versões que o dono rejeitou.
- **Don't** usar foto de destino. O pedido foi só tipografia e cor.
- **Don't** usar rótulo em maiúsculas espaçadas, linha colorida lateral, gradiente em texto ou sombra dura.
- **Don't** escrever "comprar": a página manda para o programa conferir preço e disponibilidade.
- **Don't** repetir em toda linha uma nota que o cabeçalho de colunas já diz, no desktop.
