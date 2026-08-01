const API_BASE = '';

export async function fetchScores() {
  try {
    const res = await fetch(`${API_BASE}/api/scores`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function submitScore(name, score, time) {
  try {
    const res = await fetch(`${API_BASE}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score, time })
    });
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
