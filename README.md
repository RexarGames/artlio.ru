# Dexxure Multisite v2

Статический сайт для GitHub Pages + Supabase:

- обязательный вход/регистрация перед сайтом;
- отдельные страницы: главная, посты, команда, мастерская, о команде, настройки;
- Supabase Auth для аккаунтов;
- Supabase Database для настроек, команды, постов, модов и событий;
- Supabase Storage для файлов модов;
- Edge Function `track-event` для отслеживания событий и уведомлений в Telegram;
- Edge Function `sync-telegram-posts` для кэша постов канала `@DexxureEnt`.

## 1. Важно про ключи

В `src/config.js` можно хранить только public/publishable key.

Secret key и Telegram bot token нельзя вставлять в `index.html`, `app.js`, `config.js` и нельзя коммитить в GitHub.

Если токен бота или secret key уже был отправлен в чат или загружен в публичный репозиторий, перевыпусти его:

- Telegram: BotFather → `/revoke` или пересоздать токен;
- Supabase: Project Settings → API Keys → rotate/revoke secret key.

## 2. Установка базы

Открой Supabase → SQL Editor и выполни файл:

```sql
supabase/sql/schema.sql
```

## 3. Настройка Auth

В Supabase включи email/password регистрацию:

```txt
Authentication → Providers → Email
```

Для теста удобнее отключить подтверждение почты:

```txt
Authentication → Providers → Email → Confirm email = OFF
```

Если подтверждение почты включено, после регистрации пользователь должен подтвердить email.

## 4. Деплой сайта на GitHub Pages

Залей в репозиторий:

```txt
index.html
home.html
posts.html
team.html
workshop.html
about.html
settings.html
src/
supabase/
README.md
```

Потом:

```txt
GitHub → Settings → Pages → Deploy from branch → main → root
```

## 5. Telegram-отслеживание через бота

Сайт отправляет события в Edge Function `track-event`:

- вход;
- регистрация;
- открытие страниц;
- сохранение настроек;
- загрузка мода;
- выход.

Функция сохраняет событие в таблицу `site_events` и отправляет сообщение админу в Telegram.

Нужно узнать свой `TELEGRAM_ADMIN_CHAT_ID`:

1. Напиши своему боту любое сообщение, например `/start`.
2. Открой в браузере:

```txt
https://api.telegram.org/botНОВЫЙ_ТОКЕН/getUpdates
```

3. Найди в ответе `chat.id`.

Затем установи секреты Supabase:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN="НОВЫЙ_ТОКЕН_БОТА"
supabase secrets set TELEGRAM_ADMIN_CHAT_ID="ТВОЙ_CHAT_ID"
```

Деплой функции:

```bash
supabase functions deploy track-event --no-verify-jwt
```

`--no-verify-jwt` нужен потому, что функция сама проверяет JWT пользователя внутри кода через Supabase Auth.

## 6. Синхронизация постов Telegram

Установи секреты:

```bash
supabase secrets set TELEGRAM_CHANNEL="DexxureEnt"
supabase secrets set SYNC_SECRET="любой_длинный_секрет"
```

Деплой функции:

```bash
supabase functions deploy sync-telegram-posts --no-verify-jwt
```

Ручной запуск:

```bash
curl -X POST "https://llihkhqbixjgvcltcajn.supabase.co/functions/v1/sync-telegram-posts" \
  -H "x-sync-secret: любой_длинный_секрет"
```

После успешного запуска посты появятся в таблице `telegram_posts` и на странице `posts.html`.

## 7. Модерация модов

Новые моды создаются со статусом `pending`. Чтобы показать мод всем:

```sql
update public.mods
set status = 'approved', updated_at = now()
where id = 'ID_МОДА';
```

Чтобы отклонить:

```sql
update public.mods
set status = 'rejected', updated_at = now()
where id = 'ID_МОДА';
```

## 8. Состав команды

Сейчас в SQL уже прописано:

- Dexxure — Владелец;
- Link — основной разработчик игр на Unity и Unreal Engine;
- afryder — программист;
- Jiterset — тестировщик игр.

Редактировать можно в таблице `team_members`.
