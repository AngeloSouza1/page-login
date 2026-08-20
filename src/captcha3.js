const express = require('express');
const store = require('./store');
const { createCanvas, drawGlyph, drawNoiseCurve, speckle, toPng } = require('./render');
const { pickWrong, injectionBlock } = require('./decoys');

const router = express.Router();

const WORDS = [
  'GATO', 'SOLO', 'RIMA', 'MURO', 'FOCA', 'LOBO', 'MESA', 'BOLO', 'CASA', 'PATO',
  'RATO', 'SAPO', 'VACA', 'BOCA', 'LUVA', 'ROSA', 'FADA', 'NAVE', 'DADO', 'DUNA',
  'FOGO', 'GELO', 'LAGO', 'MALA', 'NOVA', 'ONDA', 'PATA', 'REDE', 'SUCO', 'TUBO',
  'VELA',
];

const FRAME_DELAY_MS = 500; // tempo mínimo entre frames consecutivos

function rnd(min, max) {
  return min + Math.random() * (max - min);
}

function renderLetterFrame(letter) {
  const W = 200;
  const H = 200;
  const buf = createCanvas(W, H, [250, 250, 252, 255]);
  speckle(buf, W, H, 170, [230, 230, 235, 255]);
  for (let i = 0; i < 3; i++) drawNoiseCurve(buf, W, H, [216, 216, 221, 255], 1);
  drawGlyph(buf, W, H, W / 2, H / 2, 15, rnd(-16, 16), letter, [30, 30, 40, 255]);
  return toPng(buf, W, H);
}

function renderPage(token, decoysHtml) {
  return `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Desafio 3</title>
<link rel="stylesheet" href="/public/shared.css">
</head>
<body>
<div class="container">
  <h1>Desafio 3</h1>
  <p>Observe a sequência de 4 letras (uma por vez) e digite a palavra formada.</p>
  <img class="challenge" id="stage" width="200" height="200" alt="sequência">
  <form id="f" autocomplete="off" style="display:none">
    <input type="text" id="answer" name="answer" maxlength="8" required autocomplete="off">
    <button type="submit">Enviar</button>
  </form>
  <div id="result"></div>
  <div id="success"></div>
  ${decoysHtml}
</div>
<script>
(function () {
  var token = '${token}';
  var stage = document.getElementById('stage');
  var i = 0;
  function showNext() {
    if (i >= 4) {
      document.getElementById('f').style.display = 'flex';
      return;
    }
    stage.src = '/3/frame?token=' + token + '&i=' + i;
    i += 1;
    setTimeout(showNext, ${FRAME_DELAY_MS});
  }
  window.addEventListener('load', function () {
    setTimeout(showNext, 400);
  });
})();

document.getElementById('f').addEventListener('submit', async function (e) {
  e.preventDefault();
  var word = document.getElementById('answer').value;
  var res = await fetch('/3/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: '${token}', word: word })
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

router.get('/3', (req, res) => {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const token = store.createChallenge('c3', word, { nextIndex: 0 });

  const fakeWord = pickWrong(WORDS, word);
  const decoysHtml = injectionBlock(fakeWord, 'palavra');

  res.set('Cache-Control', 'no-store');
  res.send(renderPage(token, decoysHtml));
});

router.get('/3/frame', (req, res) => {
  const entry = store.getChallenge(req.query.token, 'c3');
  if (!entry) return res.status(404).end();

  const i = Number(req.query.i);
  if (!Number.isInteger(i) || i !== entry.extra.nextIndex || i < 0 || i >= entry.answer.length) {
    return res.status(400).end();
  }
  entry.extra.nextIndex += 1;

  const letter = entry.answer[i];
  const png = renderLetterFrame(letter);
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'no-store');
  res.send(png);
});

router.post('/3/verify', (req, res) => {
  const { token, word } = req.body || {};
  const result = store.verify(
    token,
    'c3',
    (entry) => String(word || '').trim().toUpperCase() === entry.answer
  );
  if (result.ok) result.message = 'SUCESSO';
  res.json(result);
});

module.exports = router;
