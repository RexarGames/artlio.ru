import { supabase, trackEvent } from './supabase.js';
import { TELEGRAM_CHANNEL, TELEGRAM_PUBLIC_URL } from './config.js';

const postsGrid = document.querySelector('#postsGrid');
const refreshInfo = document.querySelector('#refreshInfo');
const openChannel = document.querySelector('#openChannel');

openChannel.href = TELEGRAM_PUBLIC_URL;
openChannel.textContent = `Открыть ${TELEGRAM_CHANNEL}`;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderPost(post) {
  const date = post.published_at ? new Date(post.published_at).toLocaleString('ru-RU') : 'Дата не указана';
  return `
    <article class="post-card glass-card">
      <div class="post-card__meta">${escapeHtml(date)} · ${escapeHtml(post.views || 'DexxureEnt')}</div>
      <h3>${escapeHtml(post.title || 'Пост Dexxure Entertainment')}</h3>
      <p>${escapeHtml(post.content || 'Текст поста пока не загружен.')}</p>
      ${post.image_url ? `<img src="${escapeHtml(post.image_url)}" alt="Изображение поста" loading="lazy">` : ''}
      <a class="cyber-link" href="${escapeHtml(post.telegram_url || TELEGRAM_PUBLIC_URL)}" target="_blank" rel="noreferrer">Читать в Telegram</a>
    </article>
  `;
}

async function loadPosts() {
  postsGrid.innerHTML = '<div class="terminal-line">Загружаю посты из кэша Supabase...</div>';

  const { data, error } = await supabase
    .from('telegram_posts')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(12);

  if (error) {
    postsGrid.innerHTML = `<div class="error-box">Ошибка загрузки: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!data?.length) {
    postsGrid.innerHTML = `
      <div class="empty-box glass-card">
        <h3>Посты ещё не синхронизированы</h3>
        <p>Задеплой Edge Function <code>sync-telegram-posts</code> и запусти её вручную или по расписанию.</p>
      </div>
    `;
    return;
  }

  postsGrid.innerHTML = data.map(renderPost).join('');
  const newest = data[0]?.published_at ? new Date(data[0].published_at).toLocaleString('ru-RU') : 'неизвестно';
  refreshInfo.textContent = `Последнее обновление кэша: ${newest}`;
}

loadPosts();
trackEvent('posts_opened');
