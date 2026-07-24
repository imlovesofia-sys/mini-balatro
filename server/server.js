const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, 'scores.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function loadScores() {
  try {
    const raw = fs.readFileSync(SCORES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveScores(scores) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

app.get('/api/scores', (_req, res) => {
  const scores = loadScores();
  scores.sort((a, b) => b.score - a.score);
  res.json(scores.slice(0, 10));
});

app.post('/api/scores', (req, res) => {
  const { name, score } = req.body || {};
  if (typeof name !== 'string' || typeof score !== 'number' || !isFinite(score) || score < 0) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }
  const cleanName = name.trim().slice(0, 20) || 'Anônimo';
  const scores = loadScores();
  scores.push({
    name: cleanName,
    score: Math.floor(score),
    date: new Date().toISOString()
  });
  scores.sort((a, b) => b.score - a.score);
  saveScores(scores.slice(0, 100));
  res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  const os = require('os');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`Acessível na rede em http://${net.address}:${PORT}`);
      }
    }
  }
});
