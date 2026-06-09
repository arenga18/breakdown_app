// Base API client — semua request ke backend melalui fungsi ini
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

export async function apiFetch(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  get:    (path)        => apiFetch(path, { method: 'GET' }),
  post:   (path, body)  => apiFetch(path, { method: 'POST', body }),
  put:    (path, body)  => apiFetch(path, { method: 'PUT', body }),
  patch:  (path, body)  => apiFetch(path, { method: 'PATCH', body }),
  delete: (path)        => apiFetch(path, { method: 'DELETE' }),
};
