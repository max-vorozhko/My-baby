# My Baby

PWA-щоденник українською для батьків малюків 6–12 міс: сон, груди / пляшечка, прикорм, шкіра і статистика.
Застосунок не дає медичних порад — лише записи, патерни з ваших даних і цифри.
Офлайн-first: усі дані зберігаються на телефоні (IndexedDB), синхронізація — пізніше (Supabase).

## Запуск

```bash
npm install
npm run dev      # розробка
npm run build    # продакшн-збірка в dist/ (з service worker)
npm run preview  # перевірка збірки, у т.ч. офлайн
```

## Деплой (GitHub Pages)

Workflow `.github/workflows/deploy.yml` збирає застосунок під `/<repo>/` і публікує при пуші в `main`.
Один раз потрібно ввімкнути: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Анонімна статистика (GoatCounter)

Лічильник переглядів екранів без cookies і персональних даних (`src/lib/analytics.ts`): надсилається лише назва екрана (`/sleep`, `/stats`…) і розмір дисплея. Код сайту — `mybaby` (статистика: https://mybaby.goatcounter.com); можна змінити змінною репозиторію **`GOATCOUNTER_CODE`** (Settings → Secrets and variables → Actions → Variables). Користувач може вимкнути в налаштуваннях застосунку.

## Казка на ніч: підключення сервера

Ключ AI не можна класти у фронтенд, тому казки створює Edge Function `supabase/functions/generate-story`. Без налаштування розділ у застосунку прихований.

1. Створіть проєкт Supabase. **Authentication → Providers → Anonymous sign-ins** — увімкнути (вхід без пошти; на нього рахуються ліміти).
2. Застосуйте `supabase/migrations/*.sql` (таблиця й функції лімітів: `supabase db push` або SQL Editor).
3. Секрети: `supabase secrets set ANTHROPIC_API_KEY=…`. Необов'язково: `STORY_MODEL` (за замовчуванням `claude-sonnet-5-5`), `STORY_DAILY_LIMIT` (5 казок на пристрій за добу), `STORY_GLOBAL_DAILY_LIMIT` (300 на всіх за добу — стеля витрат), `ALLOWED_ORIGINS`.
4. `supabase functions deploy generate-story`.
5. GitHub → Settings → Secrets and variables → Actions → **Variables**: `SUPABASE_URL` і `SUPABASE_ANON_KEY` (publishable-ключ, він публічний). Для локальної роботи — `.env.local` за зразком `.env.example`.

Тексти тем і казок на сервері не зберігаються: у базі лише лічильники генерацій.

## Кількість користувачів

Раз на добу кожен пристрій надсилає в Supabase випадковий ID (без імен і даних) — `src/lib/usagePing.ts`, міграція `supabase/migrations/20261120000000_device_pings.sql`. Вимикається тим самим перемикачем «Анонімна статистика».

Подивитись цифри: Supabase → SQL Editor → `select * from usage_summary();`
(`dau` / `wau` / `mau` — активні за день / 7 / 30 днів, `devices_total` — усього пристроїв, `installed_total` — встановили на головний екран, `d7_*` / `d30_*` — утримання).

## Стек

React + Vite + TypeScript, Tailwind CSS v4, vite-plugin-pwa (Workbox), Dexie.js.

## Структура

```
src/
  app/        роутинг, layout, нижня навігація, SOS-кнопка
  features/   onboarding, profile, today, food, sleep (+ засинання), development, more, sos
  db/         Dexie-схема і типи сутностей (ТЗ, розділ 5)
  lib/        вік, тема (нічна 21:00–7:00), сховище / встановлення PWA
  ui/         кнопки, картки, іконки
```

## Статус

- [x] Крок 1 — каркас, онбординг, профіль, нічна тема, SOS-заглушка, експорт JSON
- [x] Крок 2 — сон + груди / пляшечка
- [x] Крок 3 — прикорм (база ~40 продуктів — чернетка, без перевірки педіатром)
- [x] Крок 4 — перша допомога (чернетка), медичний дисклеймер, Lighthouse 100/100/100/100
- [x] Крок 5 — модуль «Шкіра» (атопічний дерматит), вкладка «Здоров'я»
- [x] Крок 6 — трекер без порад, спокійний дизайн, статистика, прогноз сну за власними патернами
- [x] Етап A — «Засинання» (Сон → Засинання): білий/м'який/глибокий шум, серцебиття, музична скринька, таймер із затуханням, власні колискові (запис голосом або файл)
- [x] Етап C — «Казка на ніч»: тема текстом чи голосом → AI-казка (Edge Function), бібліотека, читання вголос. Потребує підключення Supabase (нижче)
- [ ] Крок 7 — Supabase: сім'я, синхронізація

> My Baby — щоденник спостережень. Він не дає медичних порад і не замінює лікаря.
