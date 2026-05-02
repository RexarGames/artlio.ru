# Dexxure Games Portal v3

Обновлённая версия сайта с отдельным входом и отдельной регистрацией.

## Что изменено

- `index.html` теперь только вход.
- `register.html` теперь отдельная регистрация.
- Убрана функция автоматической синхронизации Telegram-постов.
- Убраны тексты про Supabase из интерфейса сайта.
- Мастерская принимает ссылку на мод, а не прямую загрузку файла.
- Добавлена страница `games.html` со списком проектов по публичной странице itch.io.
- Внизу страниц добавлено предупреждение о фейковых сайтах.
- JS собран в `assets/app.min.js` в минифицированном виде.

## Что загрузить в GitHub Pages

Загружай содержимое папки проекта в корень репозитория:

```txt
index.html
register.html
home.html
games.html
posts.html
team.html
workshop.html
about.html
settings.html
assets/
```

Папку `supabase/` можно не публиковать на GitHub Pages, если не хочешь показывать SQL и функцию.

## Supabase SQL

Выполни файл:

```txt
supabase/sql/update-v3.sql
```

Он добавляет новые поля для мастерской:

```txt
download_url
preview_url
```

## Telegram tracking

Оставлена только функция отслеживания событий:

```txt
supabase/functions/track-event/index.ts
```

Secrets для неё:

```txt
SUPABASE_URL=https://llihkhqbixjgvcltcajn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=новый_service_role_key
TELEGRAM_BOT_TOKEN=новый_токен_бота
TELEGRAM_ADMIN_CHAT_ID=твой_chat_id
```

Старый токен бота и secret key лучше перевыпустить, потому что они были отправлены в чат.

## Важное про защиту кода

Фронтенд-код на обычном сайте нельзя полностью скрыть: браузер всё равно должен скачать HTML, CSS и JS. В этой версии JS минифицирован, чтобы его было сложнее читать, но это не является настоящей защитой от копирования.


## Clean URLs

В этой версии разделы лежат в папках: `/home/`, `/games/`, `/team/`, `/workshop/`, `/about/`, `/settings/`. Поэтому в адресе больше не показывается `.html`. Для GitHub Pages загружай всю структуру папок как есть.
