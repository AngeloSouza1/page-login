# CAPTCHA vs. IA

Três CAPTCHAs independentes. A resposta correta de cada um vive só no servidor
(em memória, associada a um token de uso único) — nunca é enviada ao cliente em
nenhuma rota `GET`, nem embutida em HTML/JS/SVG.

## Como rodar

```bash
npm install
PORT=3000 npm start
```

Depois abra:

- http://localhost:3000/1
- http://localhost:3000/2
- http://localhost:3000/3

A porta é lida de `process.env.PORT` (usa 3000 como padrão só por conveniência
local, caso a variável não seja definida).

## Dependências

- [`express`](https://www.npmjs.com/package/express) — servidor HTTP e rotas.
- [`pngjs`](https://www.npmjs.com/package/pngjs) — codifica os PNGs dos desafios em
  JavaScript puro, sem nenhuma dependência nativa (evita risco de build falhar).

## Os três desafios

1. **`/1` — Quantos pontos?** Conte as bolinhas de cada grupo mostradas na imagem e
   digite a soma.
2. **`/2` — Formas.** Conte quantas formas da cor/tipo pedidos no enunciado aparecem
   na imagem. O bloco de "autodeclaração" abaixo do formulário é uma armadilha —
   humanos não precisam marcá-lo.
3. **`/3` — Sequência.** Observe as 4 letras reveladas uma de cada vez (~4s no
   total) e digite a palavra formada.

## Notas de design

- Cada carga de `/1`, `/2` ou `/3` gera um desafio novo com um token opaco
  (`crypto.randomUUID()`) válido por 90 segundos; recarregar a URL invalida o
  anterior.
- Todas as imagens são raster puro (PNG desenhado pixel a pixel, com ruído de
  fundo e curvas de distração), nunca texto real embutido em SVG/HTML — um agente
  lendo o HTML não encontra a resposta em lugar nenhum.
- Cada página inclui iscas com valores propositalmente errados: um texto visível
  de baixo contraste (mira o ataque de visão) e um bloco fora da tela com tom de
  instrução de sistema para "assistentes automatizados" (mira o ataque de agente).
- Nenhuma detecção de automação, fingerprint, timing ou IP é usada — só validação
  da resposta em si, no servidor.
