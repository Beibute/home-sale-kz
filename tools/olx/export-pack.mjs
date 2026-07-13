#!/usr/bin/env node
// export-pack.mjs — из registry/items.json генерит готовые пакеты для ручной подачи на OLX.kz.
// Пишет dist/olx/{id}.md (заголовок ≤70, категория, цена, локация, описание для вставки, список фото)
// + dist/olx/INDEX.md. Телефон — отдельно (в поле контактов OLX, не в тексте, чтобы не флагали).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const items = JSON.parse(readFileSync(join(ROOT, 'registry', 'items.json'), 'utf8'));

// вытащить контакты/город из data/config.js
global.window = {};
await import('file://' + join(ROOT, 'data', 'config.js'));
const cfg = global.window.SALE_CONFIG || {};
const city = cfg.city || 'Астана';
const phone = (cfg.contacts && cfg.contacts.phone) || '';
const wa = (cfg.contacts && cfg.contacts.whatsapp) || '';

const OUT = join(ROOT, 'dist', 'olx');
mkdirSync(OUT, { recursive: true });

const kzt = (n) => (Number(n) || 0).toLocaleString('ru-RU') + ' ₸';
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…');

function photosFor(item) {
  const dir = join(ROOT, 'public', 'photos', item.id);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
    .map((f) => `public/photos/${item.id}/${f}`);
}

function pack(item) {
  const title = clip(item.title, 70);
  const specs = (item.specs || []).map((s) => `• ${s}`).join('\n');
  const photos = photosFor(item);
  const discount = item.priceNewKzt && item.priceOursKzt < item.priceNewKzt
    ? ` (ниже новой ~${kzt(item.priceNewKzt)})` : '';

  // Тело описания для вставки в OLX (без телефона/ссылок в тексте)
  const desc = [
    item.descriptionSource,
    '',
    'Характеристики:',
    specs,
    item.color ? `Цвет: ${item.color}.` : null,
    '',
    `Цена: ${kzt(item.priceOursKzt)}${discount}. Торг уместен.`,
    `Город: ${city}. Самовывоз/встреча.`,
  ].filter((l) => l !== null).join('\n');

  return `# OLX-пакет: ${item.title}

**Заголовок** (≤70 симв., скопировать в поле «Название»):
\`\`\`
${title}
\`\`\`

**Категория OLX:** ${item.olx?.categoryHint || 'Детский мир / Детские автокресла'}
**Тип объявления:** Частное
**Цена:** ${item.priceOursKzt} (тенге). ${item.priceNewKzt ? `Новая ориентир: ${kzt(item.priceNewKzt)} — ${item.priceNewSource}` : ''}
**Состояние (поле OLX):** Б/у
**Локация:** ${city}
**Контакт (поле OLX, НЕ в текст описания):** тел/WhatsApp +${phone}

**Описание** (скопировать целиком в поле «Описание»):
\`\`\`
${desc}
\`\`\`

**Фото для загрузки** (по порядку, из папки проекта):
${photos.length ? photos.map((p, i) => `${i + 1}. ${p}`).join('\n') : '— (нет фото)'}

---
⚠️ Заметки: возраст ~${item.year} — у автокресел есть срок службы, указано честно в описании.${item.id === 'maxi-cosi-2waypearl' ? ' Кресло 2wayPearl крепится ТОЛЬКО на базу 2wayFix — упомянуть покупателю.' : ''}
`;
}

let index = `# OLX-пакеты — готовы к подаче (${items.length} шт.)\n\nГород: ${city}. Контакт: +${phone} (тел/WhatsApp).\nКатегория для всех: Детский мир → Детские автокресла. Тип: Частное, состояние Б/у.\n\n| # | Вещь | Цена | Файл пакета |\n|---|---|---|---|\n`;
items.forEach((it, i) => {
  const file = `${it.id}.md`;
  writeFileSync(join(OUT, file), pack(it), 'utf8');
  index += `| ${i + 1} | ${it.title} | ${kzt(it.priceOursKzt)} | [${file}](./${file}) |\n`;
});
writeFileSync(join(OUT, 'INDEX.md'), index, 'utf8');
console.log(`✓ dist/olx/: ${items.length} пакетов + INDEX.md`);
