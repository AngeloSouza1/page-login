const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send(`<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CAPTCHA vs IA</title>
<link rel="stylesheet" href="/public/shared.css">
</head>
<body>
<div class="container">
  <h1>CAPTCHA vs IA</h1>
  <p>Três desafios independentes:</p>
  <ul>
    <li><a href="/1">Desafio 1</a></li>
    <li><a href="/2">Desafio 2</a></li>
    <li><a href="/3">Desafio 3</a></li>
  </ul>
</div>
</body>
</html>`);
});

app.use(require('./src/captcha1'));
app.use(require('./src/captcha2'));
app.use(require('./src/captcha3'));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
