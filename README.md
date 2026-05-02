# Dexxure Games Multisite

Хакерский мультисайт для Dexxure Games: главная страница, Telegram-посты, команда, мастерская модов, информация о команде и сохранение настроек пользователей через Supabase.

## Важно по ключам

В браузер можно вставлять только publishable/anon key. Secret/service-role ключ нельзя хранить в `index.html`, `app.js`, GitHub Pages или публичном репозитории. Если секрет уже был отправлен в чат или опубликован, его нужно перевыпустить в Supabase Dashboard.

## Структура

```txt
index.html
src/
  app.js
  styles.css
supabase/
  sql/schema.sql
  functions/sync-telegram-posts/index.ts
```

## Быстрый запуск локально

Откройте папку через локальный сервер, потому что ES modules нельзя нормально тестировать двойным кликом по HTML:

```bash
python -m http.server 5500
```

Потом открыть:

```txt
http://localhost:5500
```

## Настройка Supabase

1. Откройте Supabase Dashboard.
2. Перейдите в SQL Editor.
3. Вставьте и выполните файл `supabase/sql/schema.sql`.
4. Перейдите в Authentication -> Sign In / Providers или User Signups.
5. Включите Anonymous Sign-Ins.
6. Проверьте Storage bucket `mods`. Он создаётся SQL-скриптом.

## Публикация на GitHub Pages

1. Залейте `index.html`, `src`, `supabase` в репозиторий.
2. Settings -> Pages.
3. Source: Deploy from branch.
4. Branch: `main`, folder: `/root`.
5. Сохраните.

## Как модерировать моды

Новые моды создаются со статусом `pending`. Чтобы показать мод на сайте:

```sql
update public.mods
set status = 'approved'
where id = 'MOD_ID';
```

Чтобы скрыть:

```sql
update public.mods
set status = 'rejected'
where id = 'MOD_ID';
```

## Telegram-посты

Фронтенд читает таблицу `telegram_posts`. Чтобы она наполнялась, разверните Edge Function:

```bash
supabase functions deploy sync-telegram-posts
```

Добавьте секреты. Никогда не добавляйте service-role/secret ключ в публичный репозиторий:

```bash
supabase secrets set TELEGRAM_CHANNEL=DexxureEnt
supabase secrets set SUPABASE_URL=https://llihkhqbixjgvcltcajn.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_OR_SECRET_KEY
supabase secrets set SYNC_SECRET=YOUR_RANDOM_SYNC_PASSWORD
```

Проверочный вызов:

```bash
curl -X POST \
  -H "x-sync-secret: YOUR_RANDOM_SYNC_PASSWORD" \
  https://llihkhqbixjgvcltcajn.functions.supabase.co/sync-telegram-posts
```

Telegram может менять HTML-разметку публичных страниц. Если парсер перестанет находить посты, лучше перевести обновление на Telegram Bot API и добавить бота админом канала.

## Что менять под себя

В `src/app.js` уже стоит URL проекта и publishable key. Когда отправите оригинальные ссылки, их можно будет добавить в таблицу `site_links` или прямо в блок `about`.

Команду можно менять через SQL:

```sql
insert into public.team_members (name, role, description, skills, order_index)
values ('Имя', 'Роль', 'Описание', array['Unity', 'C#'], 50);
```
