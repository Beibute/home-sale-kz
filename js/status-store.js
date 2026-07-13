// status-store.js — слой изменяемого состояния вещей (статус/скрытие).
// Overlay поверх каталога window.ITEMS. Backend: Supabase REST, иначе localStorage.
// Форма записи: { id, status: 'available'|'reserved'|'sold', hidden: bool, updated_at }
(function () {
  const cfg = (window.SALE_CONFIG && window.SALE_CONFIG.supabase) || {};
  const useSupabase = !!(cfg.url && cfg.anonKey && cfg.table);
  const LS_KEY = 'home-sale-kz:status';

  function sbHeaders(extra) {
    return Object.assign(
      {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        'Content-Type': 'application/json',
      },
      extra || {}
    );
  }

  function lsRead() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }
  function lsWrite(map) {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  }

  // → { [id]: {status, hidden, updated_at} }
  async function load() {
    if (!useSupabase) return lsRead();
    try {
      const res = await fetch(
        `${cfg.url}/rest/v1/${cfg.table}?select=id,status,hidden,updated_at`,
        { headers: sbHeaders() }
      );
      if (!res.ok) throw new Error('supabase load ' + res.status);
      const rows = await res.json();
      const map = {};
      for (const r of rows) map[r.id] = { status: r.status, hidden: !!r.hidden, updated_at: r.updated_at };
      return map;
    } catch (e) {
      console.warn('StatusStore: Supabase недоступен, fallback localStorage', e);
      return lsRead();
    }
  }

  // upsert одной вещи
  async function set(id, patch) {
    const updated_at = new Date().toISOString();
    if (!useSupabase) {
      const map = lsRead();
      map[id] = Object.assign({ status: 'available', hidden: false }, map[id], patch, { updated_at });
      lsWrite(map);
      return map[id];
    }
    const row = Object.assign({ id }, patch, { updated_at });
    const res = await fetch(`${cfg.url}/rest/v1/${cfg.table}`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error('supabase upsert ' + res.status + ' ' + (await res.text()));
    const [saved] = await res.json();
    return saved;
  }

  // Слить каталог с overlay → эффективный статус/скрытие
  function apply(items, overlay) {
    return items.map((it) => {
      const o = overlay[it.id] || {};
      return Object.assign({}, it, {
        status: o.status || it.status || 'available',
        hidden: o.hidden === true,
      });
    });
  }

  window.StatusStore = { load, set, apply, backend: useSupabase ? 'supabase' : 'localStorage' };
})();
