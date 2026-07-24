const SUPABASE_URL = process.env.SUPABASE_URL || 'https://slrfiqtnhfklztpjliuc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

async function supabaseQuery(endpoint, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return res;
}

app.get('/api/scores', async (_req, res) => {
  try {
    const r = await supabaseQuery('/rest/v1/scores?select=*&order=score.desc&limit=10');
    const scores = await r.json();
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scores', async (req, res) => {
  const { name, score } = req.body || {};
  if (typeof name !== 'string' || typeof score !== 'number' || !isFinite(score) || score < 0) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }
  try {
    await supabaseQuery('/rest/v1/scores', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim().slice(0, 20) || 'Anônimo',
        score: Math.floor(score)
      }),
      headers: { 'Prefer': 'return=minimal' }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
