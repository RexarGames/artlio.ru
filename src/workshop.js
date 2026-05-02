import { supabase, getSession, trackEvent } from './supabase.js';

const uploadForm = document.querySelector('#uploadForm');
const uploadMessage = document.querySelector('#uploadMessage');
const modsGrid = document.querySelector('#modsGrid');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setUploadMessage(text, type = 'info') {
  uploadMessage.textContent = text;
  uploadMessage.dataset.type = type;
}

function normalizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9а-яё._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderMod(mod) {
  const created = mod.created_at ? new Date(mod.created_at).toLocaleDateString('ru-RU') : 'Недавно';
  return `
    <article class="mod-card glass-card">
      <div class="mod-card__topline">${escapeHtml(mod.game_title)} · ${escapeHtml(created)}</div>
      <h3>${escapeHtml(mod.title)}</h3>
      <p>${escapeHtml(mod.description)}</p>
      <div class="mod-card__status">Статус: ${escapeHtml(mod.status)}</div>
      ${mod.public_url ? `<a class="cyber-button cyber-button--small" href="${escapeHtml(mod.public_url)}" target="_blank" rel="noreferrer">Скачать</a>` : ''}
    </article>
  `;
}

async function loadMods() {
  modsGrid.innerHTML = '<div class="terminal-line">Загружаю мастерскую...</div>';

  const { data, error } = await supabase
    .from('mods')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    modsGrid.innerHTML = `<div class="error-box">Ошибка загрузки: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!data?.length) {
    modsGrid.innerHTML = `
      <div class="empty-box glass-card">
        <h3>Мастерская пока пустая</h3>
        <p>Загруженные моды сначала получают статус <code>pending</code>. После проверки админ меняет статус на <code>approved</code>.</p>
      </div>
    `;
    return;
  }

  modsGrid.innerHTML = data.map(renderMod).join('');
}

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const session = await getSession();
  if (!session) return;

  const form = new FormData(uploadForm);
  const title = String(form.get('title')).trim();
  const gameTitle = String(form.get('game_title')).trim();
  const description = String(form.get('description')).trim();
  const file = form.get('file');

  if (!title || !gameTitle || !description || !file?.name) {
    setUploadMessage('Заполни все поля и выбери файл.', 'error');
    return;
  }

  const safeName = normalizeFileName(file.name);
  const filePath = `${session.user.id}/${Date.now()}-${safeName}`;

  setUploadMessage('Загружаю файл в Supabase Storage...');
  const { error: uploadError } = await supabase.storage
    .from('mods')
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    setUploadMessage(uploadError.message || 'Не удалось загрузить файл.', 'error');
    return;
  }

  const { data: publicUrlData } = supabase.storage.from('mods').getPublicUrl(filePath);

  const { error: insertError } = await supabase.from('mods').insert({
    owner_id: session.user.id,
    title,
    game_title: gameTitle,
    description,
    file_path: filePath,
    public_url: publicUrlData.publicUrl,
    status: 'pending',
  });

  if (insertError) {
    setUploadMessage(insertError.message || 'Файл загружен, но запись мода не создана.', 'error');
    return;
  }

  uploadForm.reset();
  setUploadMessage('Мод отправлен на проверку.', 'success');
  await trackEvent('mod_uploaded', { title, game_title: gameTitle, file_name: file.name });
  await loadMods();
});

loadMods();
trackEvent('workshop_opened');
