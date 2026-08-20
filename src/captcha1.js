const express = require('express');
const store = require('./store');
const { createCanvas, drawCircle, drawGlyph, drawNoiseCurve, speckle, toPng } = require('./render');
const { randomWrongNumber, faintHint, injectionBlock } = require('./decoys');

const router = express.Router();

const COLOR_A = [40, 90, 200, 255];
const COLOR_B = [200, 60, 40, 255];
const DECOY_DOT_COLOR = [244, 244, 247, 255]; // quase idêntico ao fundo

function rnd(min, max) {
  return min + Math.random() * (max - min);
}

function placeDots(buf, w, h, n, cx, cy, spreadX, spreadY, color) {
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.random();
    const x = cx + Math.cos(ang) * spreadX * rad;
    const y = cy + Math.sin(ang) * spreadY * rad;
    drawCircle(buf, w, h, x, y, 7 + Math.random() * 3, color);
  }
}

function renderChallengeImage(a, b) {
  const W = 440;
  const H = 160;
  const buf = createCanvas(W, H, [248, 248, 250, 255]);
  speckle(buf, W, H, 260, [227, 227, 232, 255]);

  placeDots(buf, W, H, a, 75, 80, 45, 55, COLOR_A);
  drawGlyph(buf, W, H, 150, 80, 6, rnd(-8, 8), '+', [30, 30, 30, 255]);
  placeDots(buf, W, H, b, 230, 80, 45, 55, COLOR_B);
  drawGlyph(buf, W, H, 310, 80, 6, rnd(-8, 8), '=', [30, 30, 30, 255]);
  drawGlyph(buf, W, H, 370, 80, 6, rnd(-8, 8), '?', [30, 30, 30, 255]);

  const decoyCount = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < decoyCount; i++) {
    drawCircle(buf, W, H, Math.random() * W, Math.random() * H, 4 + Math.random() * 4, DECOY_DOT_COLOR);
  }

  for (let i = 0; i < 4; i++) drawNoiseCurve(buf, W, H, [212, 212, 217, 255], 1);

  return toPng(buf, W, H);
}

function renderPage(token, decoysHtml) {
  return `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Desafio 1</title>
<link rel="stylesheet" href="/public/shared.css">
</head>
<body>
<div class="container">
  <h1>Desafio 1</h1>
  <p>Some as duas quantidades mostradas na imagem e digite o resultado.</p>
  <img class="challenge" src="/1/image.png?token=${token}" width="440" height="160" alt="desafio visual">
  <form id="f" autocomplete="off">
    <input type="number" id="answer" name="answer" required autocomplete="off">
    <button type="submit">Enviar</button>
  </form>
  <div id="result"></div>
  <div id="success"></div>
  ${decoysHtml}
</div>
<script>
document.getElementById('f').addEventListener('submit', async function (e) {
  e.preventDefault();
  var answer = document.getElementById('answer').value;
  var res = await fetch('/1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: '${token}', answer: answer })
  });
  var data = await res.json();
  if (data.ok) {
    document.getElementById('f').style.display = 'none';
    var h2 = document.createElement('h2');
    h2.textContent = data.message;
    document.getElementById('success').appendChild(h2);
  } else {
    document.getElementById('result').textContent = 'Resposta incorreta, tente novamente.';
  }
});
</script>
</body>
</html>`;
}

router.get('/1', (req, res) => {
  const a = 2 + Math.floor(Math.random() * 6);
  const b = 2 + Math.floor(Math.random() * 6);
  const answer = a + b;
  const token = store.createChallenge('c1', answer, { a, b });

  const wrong1 = randomWrongNumber(answer, 4, 14);
  const wrong2 = randomWrongNumber(answer, 4, 14);
  const decoysHtml = faintHint(wrong1) + injectionBlock(wrong2, 'valor');

  res.set('Cache-Control', 'no-store');
  res.send(renderPage(token, decoysHtml));
});

router.get('/1/image.png', (req, res) => {
  const entry = store.getChallenge(req.query.token, 'c1');
  if (!entry) return res.status(404).end();
  const png = renderChallengeImage(entry.extra.a, entry.extra.b);
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'no-store');
  res.send(png);
});

router.post('/1/verify', (req, res) => {
  const { token, answer } = req.body || {};
  const result = store.verify(token, 'c1', (entry) => Number(answer) === entry.answer);
  if (result.ok) result.message = 'SUCESSO';
  res.json(result);
});

module.exports = router;
