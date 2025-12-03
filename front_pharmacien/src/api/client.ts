const API_BASE = 'http://localhost:3000/api';

export async function searchText(query: string) {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error('Error en request text search');
  return res.json();
}

export async function searchImages(query: string) {
  const res = await fetch(`${API_BASE}/search/multimodal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error('Error en request image search');
  return res.json();
}

export async function ragQuery(query: string) {
  const res = await fetch(`${API_BASE}/rag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pregunta: query })
  });
  if (!res.ok) throw new Error('Error en request RAG query');
  return res.json();
}
