// app.js — витрина: рендер каталога window.ITEMS с overlay статусов, фильтры, модалка, контакты.
(function () {
  const cfg = window.SALE_CONFIG || {};
  const CATALOG = Array.isArray(window.ITEMS) ? window.ITEMS : [];

  const STATUS_LABEL = { available: 'Доступно', reserved: 'Бронь', sold: 'Продано' };
  const state = { items: [], cat: 'all', sort: 'default', gallery: { id: null, i: 0 } };

  const $ = (s, r = document) => r.querySelector(s);
  const fmtPrice = (n) =>
    (Number(n) || 0).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ' + (cfg.currency || '₸');
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- контакты
  function waLink(item) {
    const num = (cfg.contacts && cfg.contacts.whatsapp || '').replace(/\D/g, '');
    if (!num) return null;
    const txt = encodeURIComponent(`Здравствуйте! Интересует «${item.title}» за ${fmtPrice(item.priceOursKzt)}. Ещё в продаже?`);
    return `https://wa.me/${num}?text=${txt}`;
  }
  function telLink() {
    const num = (cfg.contacts && cfg.contacts.phone || '').replace(/\D/g, '');
    return num ? `tel:+${num}` : null;
  }
  function tgLink() {
    const u = (cfg.contacts && cfg.contacts.telegram || '').replace(/^@/, '');
    return u ? `https://t.me/${u}` : null;
  }

  // ---- вычисления списка
  function visible() {
    let list = state.items.filter((it) => !it.hidden);
    if (state.cat !== 'all') list = list.filter((it) => it.category === state.cat);
    const rank = { available: 0, reserved: 1, sold: 2 };
    switch (state.sort) {
      case 'price-asc': list = list.slice().sort((a, b) => a.priceOursKzt - b.priceOursKzt); break;
      case 'price-desc': list = list.slice().sort((a, b) => b.priceOursKzt - a.priceOursKzt); break;
      case 'discount': list = list.slice().sort((a, b) => b.discountPct - a.discountPct); break;
      default: list = list.slice().sort((a, b) => (rank[a.status] - rank[b.status])); // доступные вперёд
    }
    return list;
  }

  // ---- рендер
  function thumbHtml(item) {
    if (item.photos && item.photos.length)
      return `<img src="${esc(item.photos[0])}" alt="${esc(item.title)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',textContent:'📦'}))" />`;
    return `<div class="ph">📦</div>`;
  }
  function cardHtml(item) {
    const inactive = item.status !== 'available';
    const badge = item.status === 'sold' ? `<span class="badge sold">Продано</span>`
      : item.status === 'reserved' ? `<span class="badge reserved">Бронь</span>` : '';
    const off = item.discountPct > 0 ? `<span class="badge discount">−${item.discountPct}%</span>` : '';
    return `<article class="card ${inactive ? 'inactive' : ''}" data-id="${esc(item.id)}">
      <div class="thumb">${thumbHtml(item)}${badge}${off}</div>
      <div class="card-body">
        <div class="card-cat">${esc(item.category)}</div>
        <div class="card-title">${esc(item.title)}</div>
        <div class="card-cond">${esc(item.condition)}</div>
        <div class="price">
          ${item.priceNewKzt ? `<div class="new">${fmtPrice(item.priceNewKzt)}</div>` : ''}
          <span class="ours">${fmtPrice(item.priceOursKzt)}</span>
          ${item.discountPct > 0 ? `<span class="off">−${item.discountPct}%</span>` : ''}
        </div>
      </div>
    </article>`;
  }

  function render() {
    const list = visible();
    const grid = $('#grid');
    grid.innerHTML = list.map(cardHtml).join('');
    $('#empty').style.display = list.length ? 'none' : 'block';
    grid.querySelectorAll('.card').forEach((el) =>
      el.addEventListener('click', () => openModal(el.dataset.id))
    );
  }

  function renderChips() {
    const cats = ['all', ...Array.from(new Set(state.items.map((i) => i.category)))];
    $('#catChips').innerHTML = cats
      .map((c) => `<button class="chip ${c === state.cat ? 'active' : ''}" data-cat="${esc(c)}">${c === 'all' ? 'Все' : esc(c)}</button>`)
      .join('');
    $('#catChips').querySelectorAll('.chip').forEach((el) =>
      el.addEventListener('click', () => { state.cat = el.dataset.cat; renderChips(); render(); })
    );
  }

  function renderHeader() {
    $('#hTitle').textContent = cfg.title || 'Распродажа';
    $('#hSub').textContent = cfg.subtitle || '';
    document.title = cfg.title || document.title;
    $('#stTotal').textContent = state.items.filter((i) => !i.hidden).length;
    $('#stAvail').textContent = state.items.filter((i) => !i.hidden && i.status === 'available').length;
    $('#stCity').textContent = cfg.city || '—';
    const parts = [];
    if (cfg.contacts && cfg.contacts.phone) parts.push('☎ +' + cfg.contacts.phone.replace(/\D/g, ''));
    if (cfg.contacts && cfg.contacts.telegram) parts.push('Telegram @' + cfg.contacts.telegram.replace(/^@/, ''));
    $('#fContacts').textContent = parts.join('  ·  ');
  }

  // ---- модалка
  function galleryHtml(item) {
    const ph = `<div class="ph">📦</div>`;
    if (!item.photos || !item.photos.length) return `<div class="gallery">${ph}</div>`;
    const i = state.gallery.i;
    const dots = item.photos.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    const navs = item.photos.length > 1
      ? `<button class="nav prev" data-nav="-1">‹</button><button class="nav next" data-nav="1">›</button>` : '';
    return `<div class="gallery">
      <img src="${esc(item.photos[i])}" alt="${esc(item.title)}" onerror="this.style.display='none'" />
      ${navs}<div class="dots">${dots}</div></div>`;
  }
  function modalHtml(item) {
    const wa = waLink(item), tel = telLink(), tg = tgLink();
    const specs = (item.specs || []).map((s) => `<span>${esc(s)}</span>`).join('');
    return `<button class="modal-close" data-close>✕</button>
      ${galleryHtml(item)}
      <div class="modal-inner">
        <h2>${esc(item.title)}</h2>
        <div class="modal-cat">${esc(item.category)}${item.status !== 'available' ? ' · ' + STATUS_LABEL[item.status] : ''}</div>
        <div class="priceline">
          <span class="ours">${fmtPrice(item.priceOursKzt)}</span>
          ${item.priceNewKzt ? `<span class="new">${fmtPrice(item.priceNewKzt)}</span>` : ''}
          ${item.discountPct > 0 ? `<span class="off">выгода ${item.discountPct}%</span>` : ''}
        </div>
        ${item.condition ? `<div class="card-cond" style="margin-bottom:10px">Состояние: ${esc(item.condition)}</div>` : ''}
        ${specs ? `<div class="specs">${specs}</div>` : ''}
        <div class="desc">${esc(item.description)}</div>
        ${item.priceNewSource ? `<div class="src">Цена новой: ${esc(item.priceNewSource)}</div>` : ''}
        <div class="contact-row">
          ${wa ? `<a class="btn wa" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          ${tg ? `<a class="btn tg" href="${tg}" target="_blank" rel="noopener">Telegram</a>` : ''}
          ${tel ? `<a class="btn primary" href="${tel}">Позвонить</a>` : ''}
          <a class="btn olx" href="${item.olxUrl || '#'}" ${item.olxUrl ? 'target="_blank" rel="noopener"' : 'disabled'}>На OLX</a>
        </div>
      </div>`;
  }
  function openModal(id) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    state.gallery = { id, i: 0 };
    $('#modalCard').innerHTML = modalHtml(item);
    $('#modal').classList.add('open');
    bindModal(item);
  }
  function bindModal(item) {
    const card = $('#modalCard');
    card.querySelector('[data-close]').addEventListener('click', closeModal);
    card.querySelectorAll('[data-nav]').forEach((b) =>
      b.addEventListener('click', () => {
        const n = item.photos.length;
        state.gallery.i = (state.gallery.i + Number(b.dataset.nav) + n) % n;
        $('#modalCard').innerHTML = modalHtml(item);
        bindModal(item);
      })
    );
  }
  function closeModal() { $('#modal').classList.remove('open'); }

  // ---- init
  async function init() {
    let overlay = {};
    try { overlay = await window.StatusStore.load(); } catch (_) {}
    state.items = window.StatusStore.apply(CATALOG, overlay);
    renderHeader();
    renderChips();
    render();
    $('#sortSel').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }
  init();
})();
