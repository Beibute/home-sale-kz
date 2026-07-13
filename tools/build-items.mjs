#!/usr/bin/env node
// build-items.mjs — источник правды registry/items.json -> data/items.js (window.ITEMS)
// Считает скидку %, резолвит пути к фото. Сгенерированный data/items.js руками НЕ править.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'registry', 'items.json');
const OUT = join(ROOT, 'data', 'items.js');
const PHOTOS_DIR = join(ROOT, 'public', 'photos');

const IMG_RE = /\.(jpe?g|png|webp|avif|gif)$/i;

function photosFor(item) {
  // Если photos заданы явно — используем их; иначе авто-подхват из public/photos/{id}/
  const dir = join(PHOTOS_DIR, item.id);
  let files = Array.isArray(item.photos) ? item.photos.slice() : [];
  if (files.length === 0 && existsSync(dir)) {
    files = readdirSync(dir).filter((f) => IMG_RE.test(f)).sort();
  }
  return files.map((f) => `public/photos/${item.id}/${f}`);
}

function build() {
  const raw = JSON.parse(readFileSync(SRC, 'utf8'));
  if (!Array.isArray(raw)) throw new Error('registry/items.json должен быть массивом');

  const items = raw.map((it) => {
    const priceNew = Number(it.priceNewKzt) || 0;
    const priceOurs = Number(it.priceOursKzt) || 0;
    const discountPct =
      priceNew > 0 && priceOurs > 0 && priceOurs < priceNew
        ? Math.round(((priceNew - priceOurs) / priceNew) * 100)
        : 0;
    return {
      id: it.id,
      title: it.title || '',
      category: it.category || 'Прочее',
      brand: it.brand || '',
      model: it.model || '',
      year: it.year || null,
      condition: it.condition || '',
      specs: Array.isArray(it.specs) ? it.specs : [],
      description: it.descriptionSource || '',
      priceNewKzt: priceNew,
      priceNewSource: it.priceNewSource || '',
      priceOursKzt: priceOurs,
      discountPct,
      photos: photosFor(it),
      status: it.status || 'available',
      olxUrl: (it.olx && it.olx.url) || null,
      olxCategoryHint: (it.olx && it.olx.categoryHint) || '',
    };
  });

  const header =
    '// АВТОГЕНЕРАЦИЯ tools/build-items.mjs из registry/items.json — не редактировать вручную.\n';
  writeFileSync(OUT, header + 'window.ITEMS = ' + JSON.stringify(items, null, 2) + ';\n', 'utf8');
  console.log(`✓ data/items.js: ${items.length} вещей записано`);
}

build();
