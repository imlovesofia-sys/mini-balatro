import fs from 'fs';
import path from 'path';

const SCORES_FILE = '/tmp/scores.json';

function loadScores() {
  try {
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveScores(scores) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

export const handler = async (event) => {
  if (event.httpMethod === 'GET') {
    const scores = loadScores();
    scores.sort((a, b) => b.score - a.score);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(scores.slice(0, 10))
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const { name, score } = JSON.parse(event.body || '{}');
      if (typeof name !== 'string' || typeof score !== 'number' || !isFinite(score) || score < 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Dados inválidos' })
        };
      }
      const scores = loadScores();
      scores.push({
        name: name.trim().slice(0, 20) || 'Anônimo',
        score: Math.floor(score),
        date: new Date().toISOString()
      });
      scores.sort((a, b) => b.score - a.score);
      saveScores(scores.slice(0, 100));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: true })
      };
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'JSON inválido' })
      };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
