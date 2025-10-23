export const api = {
  async request(method, path, body) {
    // Allow overriding API base for static hosting (e.g., GitHub Pages)
    // Priority: window.API_BASE -> <meta name="api-base" content> -> localStorage.API_BASE -> '/api'
    let base = '/api';
    try {
      if (typeof window !== 'undefined' && window.API_BASE) base = String(window.API_BASE);
      else {
        const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="api-base"]') : null;
        if (meta && meta.content) base = meta.content;
        else if (typeof localStorage !== 'undefined') base = localStorage.getItem('API_BASE') || base;
      }
    } catch {}
    const url = `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
    return json;
  },
  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); }
};
