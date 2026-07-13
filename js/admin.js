// admin.js — PIN-гейт + управление статусами вещей (Доступно/Бронь/Продано + скрыть).
(function () {
  const cfg = window.SALE_CONFIG || {};
  const CATALOG = Array.isArray(window.ITEMS) ? window.ITEMS : [];
  const $ = (s, r = document) => r.querySelector(s);
  const fmt = (n) => (Number(n) || 0).toLocaleString('ru-RU') + ' ' + (cfg.currency || '₸');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STATUSES = [['available', 'Доступно'], ['reserved', 'Бронь'], ['sold', 'Продано']];

  let overlay = {};

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1600);
  }

  // ---- PIN gate
  function unlock() { $('#gate').style.display = 'none'; $('#panel').style.display = 'block'; boot(); }
  $('#pin').addEventListener('input', (e) => {
    const val = e.target.value;
    $('#pinErr').textContent = '';
    if (val.length >= String(cfg.adminPin || '').length) {
      if (val === String(cfg.adminPin)) { sessionStorage.setItem('hs-admin', '1'); unlock(); }
      else if (val.length >= 4) $('#pinErr').textContent = 'Неверный PIN';
    }
  });
  if (sessionStorage.getItem('hs-admin') === '1') unlock();

  // ---- панель
  async function boot() {
    $('#backendTag').textContent = 'хранилище: ' + window.StatusStore.backend;
    try { overlay = await window.StatusStore.load(); } catch (_) { overlay = {}; }
    renderRows();
    $('#exportBtn').addEventListener('click', exportJson);
  }

  function eff(item) {
    const o = overlay[item.id] || {};
    return { status: o.status || item.status || 'available', hidden: o.hidden === true };
  }

  function renderRows() {
    $('#rows').innerHTML = CATALOG.map((item) => {
      const e = eff(item);
      const seg = STATUSES.map(([v, label]) =>
        `<button data-id="${esc(item.id)}" data-status="${v}" class="${e.status === v ? 'on-' + v : ''}">${label}</button>`
      ).join('');
      return `<tr>
        <td><b>${esc(item.title)}</b></td>
        <td style="color:var(--muted)">${esc(item.category)}</td>
        <td>${fmt(item.priceOursKzt)}</td>
        <td><div class="seg">${seg}</div></td>
        <td><input type="checkbox" data-hide="${esc(item.id)}" ${e.hidden ? 'checked' : ''} /></td>
      </tr>`;
    }).join('');

    $('#rows').querySelectorAll('.seg button').forEach((b) =>
      b.addEventListener('click', () => setStatus(b.dataset.id, b.dataset.status))
    );
    $('#rows').querySelectorAll('[data-hide]').forEach((c) =>
      c.addEventListener('change', () => setHidden(c.dataset.hide, c.checked))
    );
  }

  async function setStatus(id, status) {
    const prev = overlay[id];
    overlay[id] = Object.assign({}, overlay[id], { status });
    renderRows();
    try { await window.StatusStore.set(id, { status, hidden: (overlay[id].hidden === true) }); toast('Статус сохранён: ' + status); }
    catch (e) { overlay[id] = prev; renderRows(); toast('Ошибка сохранения'); console.error(e); }
  }
  async function setHidden(id, hidden) {
    const prev = overlay[id];
    overlay[id] = Object.assign({ status: 'available' }, overlay[id], { hidden });
    try { await window.StatusStore.set(id, { status: overlay[id].status, hidden }); toast(hidden ? 'Скрыто с сайта' : 'Показано'); }
    catch (e) { overlay[id] = prev; renderRows(); toast('Ошибка сохранения'); console.error(e); }
  }

  // ---- экспорт обновлённого реестра (fallback-путь: коммит + передеплой)
  function exportJson() {
    const merged = CATALOG.map((item) => {
      const e = eff(item);
      return Object.assign({}, item, { status: e.status, hidden: e.hidden });
    });
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'items.with-status.json'; a.click();
    URL.revokeObjectURL(a.href);
    toast('Скачан items.with-status.json');
  }
})();
