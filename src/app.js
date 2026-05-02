import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.1';

const SUPABASE_URL = 'https://llihkhqbixjgvcltcajn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_oaO2n57GQqfRhZkhkUfQ2g_Grpo6B8K';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const DEFAULT_TEAM = [
  {
    name: 'Dexxure Games',
    role: 'Core Team',
    description: 'Основная команда разработки, дизайна и публикации проектов.',
    skills: ['Unity', 'Game Design', 'Publishing'],
  },
  {
    name: 'Game Dev',
    role: 'Developer',
    description: 'Разработка игровых систем, прототипов, интерфейсов и логики.',
    skills: ['C#', 'Gameplay', 'UI'],
  },
  {
    name: 'Creative',
    role: 'Design',
    description: 'Визуальная подача, атмосфера, промо-материалы и страницы игр.',
    skills: ['Art Direction', 'Branding'],
  },
  {
    name: 'Community',
    role: 'Moderation',
    description: 'Проверка модов, обратная связь и работа с сообществом.',
    skills: ['Workshop', 'Support'],
  },
];

const fallbackPosts = [
  {
    title: 'Подключите sync-telegram-posts',
    text: 'После запуска Edge Function здесь появятся реальные посты из @DexxureEnt.',
    url: 'https://t.me/DexxureEnt',
    published_at: new Date().toISOString(),
  },
  {
    title: 'Мастерская готова к тесту',
    text: 'Форма загрузки сохраняет файл в Supabase Storage и создаёт запись в таблице mods.',
    url: '#workshop',
    published_at: new Date().toISOString(),
  },
  {
    title: 'Настройки пользователя',
    text: 'Акцентный цвет, скан-линии, компактность и ник сохраняются через Supabase Auth Anonymous.',
    url: '#settings',
    published_at: new Date().toISOString(),
  },
];

const state = {
  user: null,
  settings: {
    nickname: '',
    accent: 'acid',
    scanlines: true,
    reduced_motion: false,
    compact_mode: false,
  },
  mods: [],
  team: [],
  posts: [],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  nav: $('#nav'),
  navToggle: $('#navToggle'),
  bootLog: $('#bootLog'),
  profileState: $('#profileState'),
  modsCount: $('#modsCount'),
  telegramFeed: $('#telegramFeed'),
  teamGrid: $('#teamGrid'),
  modsGrid: $('#modsGrid'),
  modForm: $('#modForm'),
  modSearch: $('#modSearch'),
  gameFilter: $('#gameFilter'),
  formStatus: $('#formStatus'),
  settingsForm: $('#settingsForm'),
  settingsStatus: $('#settingsStatus'),
  toast: $('#toast'),
  cursorGlow: $('#cursorGlow'),
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё_.-]+/gi, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function formatDate(value) {
  if (!value) return 'без даты';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function setStatus(el, message, type = '') {
  el.textContent = message;
  el.className = `form-status ${type}`.trim();
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove('show'), 3200);
}

function updateBoot(message) {
  els.bootLog.textContent += `\n${message}`;
}

async function ensureAnonymousUser() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    state.user = sessionData.session.user;
    return state.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    updateBoot(`anonymous auth error: ${error.message}`);
    return null;
  }

  state.user = data.user;
  return state.user;
}

function applySettings(settings) {
  state.settings = { ...state.settings, ...settings };
  document.documentElement.dataset.accent = state.settings.accent || 'acid';
  document.body.classList.toggle('scanlines', Boolean(state.settings.scanlines));
  document.body.classList.toggle('no-motion', Boolean(state.settings.reduced_motion));
  document.body.classList.toggle('compact', Boolean(state.settings.compact_mode));

  if (els.settingsForm) {
    els.settingsForm.nickname.value = state.settings.nickname || '';
    els.settingsForm.accent.value = state.settings.accent || 'acid';
    els.settingsForm.scanlines.checked = Boolean(state.settings.scanlines);
    els.settingsForm.reduced_motion.checked = Boolean(state.settings.reduced_motion);
    els.settingsForm.compact_mode.checked = Boolean(state.settings.compact_mode);
  }

  localStorage.setItem('dg_settings_cache', JSON.stringify(state.settings));
}

async function loadSettings() {
  const cached = localStorage.getItem('dg_settings_cache');
  if (cached) {
    try { applySettings(JSON.parse(cached)); } catch (_) {}
  } else {
    applySettings(state.settings);
  }

  if (!state.user) return;

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('user_id', state.user.id)
    .maybeSingle();

  if (error) {
    updateBoot(`settings table warning: ${error.message}`);
    return;
  }

  if (data) {
    applySettings(data);
  } else {
    await saveSettings(state.settings, false);
  }
}

async function saveSettings(settings, showMessage = true) {
  applySettings(settings);
  if (!state.user) {
    if (showMessage) setStatus(els.settingsStatus, 'Настройки сохранены только локально. Включите Anonymous Sign-Ins в Supabase.', 'err');
    return;
  }

  const payload = {
    user_id: state.user.id,
    nickname: settings.nickname || '',
    accent: settings.accent || 'acid',
    scanlines: Boolean(settings.scanlines),
    reduced_motion: Boolean(settings.reduced_motion),
    compact_mode: Boolean(settings.compact_mode),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('site_settings')
    .upsert(payload, { onConflict: 'user_id' });

  if (showMessage) {
    if (error) setStatus(els.settingsStatus, `Ошибка Supabase: ${error.message}`, 'err');
    else {
      setStatus(els.settingsStatus, 'Настройки сохранены.', 'ok');
      toast('Профиль обновлён');
    }
  }
}

async function loadTelegramPosts() {
  const { data, error } = await supabase
    .from('telegram_posts')
    .select('title,text,url,published_at')
    .order('published_at', { ascending: false })
    .limit(9);

  if (error || !data?.length) {
    state.posts = fallbackPosts;
    if (error) updateBoot(`telegram feed warning: ${error.message}`);
  } else {
    state.posts = data;
  }
  renderPosts();
}

function renderPosts() {
  els.telegramFeed.innerHTML = state.posts.map((post) => `
    <article class="post-card reveal">
      <time>${escapeHtml(formatDate(post.published_at))}</time>
      <h3>${escapeHtml(post.title || 'Пост Dexxure')}</h3>
      <p>${escapeHtml(post.text || '').slice(0, 320)}</p>
      <a href="${escapeHtml(post.url || '#')}" target="_blank" rel="noreferrer">Открыть источник</a>
    </article>
  `).join('');
}

async function loadTeam() {
  const { data, error } = await supabase
    .from('team_members')
    .select('name,role,description,skills,order_index')
    .order('order_index', { ascending: true });

  state.team = error || !data?.length ? DEFAULT_TEAM : data;
  if (error) updateBoot(`team table warning: ${error.message}`);
  renderTeam();
}

function initials(name = 'DG') {
  return name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function renderTeam() {
  els.teamGrid.innerHTML = state.team.map((member) => `
    <article class="member-card reveal">
      <div class="member-avatar">${escapeHtml(initials(member.name))}</div>
      <span class="member-role">${escapeHtml(member.role || 'Team')}</span>
      <h3>${escapeHtml(member.name)}</h3>
      <p>${escapeHtml(member.description || '')}</p>
      <div class="member-skills">
        ${(member.skills || []).map(skill => `<span>${escapeHtml(skill)}</span>`).join('')}
      </div>
    </article>
  `).join('');
}

async function loadMods() {
  const { data, error } = await supabase
    .from('mods')
    .select('id,title,game_title,author,description,version,file_url,status,created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    updateBoot(`mods table warning: ${error.message}`);
    state.mods = [];
  } else {
    state.mods = data || [];
  }

  renderGameFilter();
  renderMods();
  els.modsCount.textContent = `${state.mods.length} MODS`;
}

function renderGameFilter() {
  const games = [...new Set(state.mods.map(mod => mod.game_title).filter(Boolean))];
  els.gameFilter.innerHTML = '<option value="all">Все игры</option>' + games.map(game => `
    <option value="${escapeHtml(game)}">${escapeHtml(game)}</option>
  `).join('');
}

function renderMods() {
  const query = els.modSearch.value.trim().toLowerCase();
  const game = els.gameFilter.value;
  const filtered = state.mods.filter((mod) => {
    const haystack = `${mod.title} ${mod.game_title} ${mod.author} ${mod.description}`.toLowerCase();
    const matchQuery = !query || haystack.includes(query);
    const matchGame = game === 'all' || mod.game_title === game;
    return matchQuery && matchGame;
  });

  if (!filtered.length) {
    els.modsGrid.innerHTML = '<div class="empty">Пока нет одобренных модов. Загруженные файлы появятся здесь после проверки.</div>';
    return;
  }

  els.modsGrid.innerHTML = filtered.map((mod) => `
    <article class="mod-card reveal">
      <span class="mod-meta">${escapeHtml(mod.game_title || 'Game')} / ${escapeHtml(mod.version || 'no version')}</span>
      <h3>${escapeHtml(mod.title)}</h3>
      <p>${escapeHtml(mod.description || '').slice(0, 260)}</p>
      <footer>
        <span class="tag">${escapeHtml(mod.author || 'Unknown')}</span>
        <a href="${escapeHtml(mod.file_url || '#')}" target="_blank" rel="noreferrer">Скачать</a>
      </footer>
    </article>
  `).join('');
}

async function submitMod(event) {
  event.preventDefault();
  setStatus(els.formStatus, 'Загрузка файла...', '');

  if (!state.user) {
    setStatus(els.formStatus, 'Нужен анонимный вход Supabase. Проверьте Auth → Anonymous Sign-Ins.', 'err');
    return;
  }

  const form = new FormData(els.modForm);
  const file = form.get('file');
  if (!file || !file.size) {
    setStatus(els.formStatus, 'Выберите файл мода.', 'err');
    return;
  }
  if (file.size > 100 * 1024 * 1024) {
    setStatus(els.formStatus, 'Файл больше 100 МБ. Сожмите архив или увеличьте лимит в коде.', 'err');
    return;
  }

  const safeFileName = `${Date.now()}-${slugify(file.name)}`;
  const filePath = `${state.user.id}/${safeFileName}`;

  const upload = await supabase.storage
    .from('mods')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (upload.error) {
    setStatus(els.formStatus, `Ошибка загрузки: ${upload.error.message}`, 'err');
    return;
  }

  const { data: publicUrl } = supabase.storage.from('mods').getPublicUrl(filePath);

  const payload = {
    owner_id: state.user.id,
    title: String(form.get('title') || '').trim(),
    game_title: String(form.get('game_title') || '').trim(),
    game_slug: slugify(form.get('game_title') || ''),
    version: String(form.get('version') || '').trim() || 'v1.0.0',
    author: String(form.get('author') || '').trim() || state.settings.nickname || 'Guest',
    description: String(form.get('description') || '').trim(),
    file_path: filePath,
    file_url: publicUrl.publicUrl,
    status: 'pending',
  };

  const insert = await supabase.from('mods').insert(payload);
  if (insert.error) {
    setStatus(els.formStatus, `Файл загружен, но запись не создана: ${insert.error.message}`, 'err');
    return;
  }

  els.modForm.reset();
  setStatus(els.formStatus, 'Мод отправлен на проверку. После одобрения он появится в мастерской.', 'ok');
  toast('Мод отправлен на модерацию');
}

function setupNavigation() {
  const syncActive = () => {
    const hash = location.hash.replace('#', '') || 'home';
    $$('[data-route]').forEach(link => link.classList.toggle('active', link.dataset.route === hash));
    const target = document.getElementById(hash);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.nav.classList.remove('open');
  };

  els.navToggle.addEventListener('click', () => els.nav.classList.toggle('open'));
  window.addEventListener('hashchange', syncActive);
  syncActive();
}

function setupPointerGlow() {
  window.addEventListener('pointermove', (event) => {
    els.cursorGlow.style.setProperty('--x', `${event.clientX}px`);
    els.cursorGlow.style.setProperty('--y', `${event.clientY}px`);
  }, { passive: true });
}

function setupForms() {
  els.settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(els.settingsStatus, 'Сохраняю...', '');
    const form = new FormData(els.settingsForm);
    await saveSettings({
      nickname: String(form.get('nickname') || '').trim(),
      accent: String(form.get('accent') || 'acid'),
      scanlines: form.get('scanlines') === 'on',
      reduced_motion: form.get('reduced_motion') === 'on',
      compact_mode: form.get('compact_mode') === 'on',
    });
  });

  els.modForm.addEventListener('submit', submitMod);
  els.modSearch.addEventListener('input', renderMods);
  els.gameFilter.addEventListener('change', renderMods);
}

async function init() {
  setupNavigation();
  setupPointerGlow();
  setupForms();
  applySettings(state.settings);

  updateBoot('supabase client: ready');
  const user = await ensureAnonymousUser();
  if (user) {
    updateBoot(`anonymous user: ${user.id.slice(0, 8)}...`);
    els.profileState.textContent = 'SYNCED';
  } else {
    els.profileState.textContent = 'LOCAL';
  }

  await loadSettings();
  await Promise.all([loadTelegramPosts(), loadTeam(), loadMods()]);
  updateBoot('ui: online');
}

init();
