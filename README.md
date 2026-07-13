# home-sale-kz — Распродажа личных вещей

Статичный сайт-витрина для распродажи личных вещей: реестр с описаниями из открытых
источников, цена новой vs наша цена (со скидкой), админка со статусами и публикация на OLX.kz.

## Возможности
- **Витрина** (`index.html`): грид карточек, фильтр по категориям, сортировка (цена/скидка),
  модалка с галереей фото и кнопками контакта (WhatsApp / Telegram / Позвонить / OLX).
- **Цены**: у каждой вещи цена новой (из открытых источников) и наша цена, авто-расчёт «−N%».
- **Админка** (`admin.html`, под PIN): статус вещи Доступно / Бронь / Продано + «скрыть».
  «Продано»/«Бронь» гасит карточку и убирает из «Доступных» — **мгновенно, без передеплоя**
  (через Supabase-overlay; без ключей — fallback на `localStorage` + экспорт JSON).
- **OLX**: готовые пакеты для ручной вставки + браузер-публикатор (Playwright).

## Структура
```
registry/items.json      SSOT реестра (правим здесь)
registry/research/*.md    ресёрч по вещи (описание + источники цен)
data/items.js             СГЕНЕРИРОВАН из registry — руками не править
data/config.js            контакты, PIN, ключи Supabase (плейсхолдеры)
public/photos/{id}/       фото по вещам
tools/build-items.mjs     registry/items.json -> data/items.js
tools/olx/                публикатор и экспорт пакетов OLX
index.html · admin.html · css · js
```

## Как запустить локально
```bash
cd projects/home-sale-kz
node tools/build-items.mjs        # собрать data/items.js из реестра
python3 -m http.server 8090       # ES не нужны, но http-сервер удобнее file://
# открыть http://localhost:8090/  и  http://localhost:8090/admin.html
```

## Добавить вещь
1. Дописать объект в `registry/items.json` (см. поля существующих).
2. Положить фото в `public/photos/{id}/` (подхватятся автоматически по имени файла).
3. `node tools/build-items.mjs` → пересобрать `data/items.js`.

## Админка / статусы (Supabase)
По умолчанию статусы живут в `localStorage` (видны только в этом браузере). Для общего
живого состояния — создать таблицу в Supabase и вписать ключи в `data/config.js`:
```sql
create table sale_item_status (
  id text primary key,
  status text not null default 'available',
  hidden boolean not null default false,
  updated_at timestamptz default now()
);
alter table sale_item_status enable row level security;
create policy "read"  on sale_item_status for select using (true);
create policy "write" on sale_item_status for insert with check (true);
create policy "upd"   on sale_item_status for update using (true);
```
Затем в `data/config.js` → `supabase: { url, anonKey, table: 'sale_item_status' }`.
PIN админки — тоже в `data/config.js` (`adminPin`). Обязательно заменить плейсхолдеры.

## Деплой на Vercel
- Root Directory проекта в Vercel = `projects/home-sale-kz`, framework = **Other** (чистая статика).
- Деплой: `vercel --prod` (нужен логин/токен) или подключение git-репозитория.
- Свой домен: купить (Vercel Domains / PS.kz / reg.kz), добавить в проект, прописать DNS
  (A/CNAME по инструкции Vercel), SSL выпустится автоматически.

## OLX.kz
Обычное объявление на OLX.kz — бесплатно (в пределах лимита категории). См. `tools/olx/`
(`export-pack.mjs` — готовые пакеты для вставки; `publish.mjs` — Playwright-публикатор под
сессией владельца). Partner API/бизнес и продвижение — платные, не используются.
