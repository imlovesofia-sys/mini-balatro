const SUPABASE_URL = process.env.SUPABASE_URL || 'https://slrfiqtnhfklztpjliuc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  if (event.path !== '/api/scores' && event.httpMethod !== 'OPTIONS') {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!SUPABASE_KEY) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Placar offline' }) };
  }

  if (event.httpMethod === 'GET') {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/scores?select=*&order=score.desc&limit=10`,
        { headers }
      );
      if (!r.ok) {
        return { statusCode: 502, headers, body: JSON.stringify({ error: `Supabase error: ${r.status}` }) };
      }
      const scores = await r.json();
      return { statusCode: 200, headers, body: JSON.stringify(scores) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const { name, score, time } = JSON.parse(event.body || '{}');
      if (typeof name !== 'string' || typeof score !== 'number' || !isFinite(score) || score < 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dados inválidos' }) };
      }
      const payload = {
        name: name.trim().slice(0, 20) || 'Anônimo',
        score: Math.floor(score)
      };
      if (typeof time === 'string') {
        payload.time = time.slice(0, 8);
      }
      await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload)
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
