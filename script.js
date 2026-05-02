const API_URL = "https://llihkhqbixjgvcltcajn.supabase.co/functions/v1/api";

async function api(action, payload = {}) {
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return resp.json();
}

// ---------- Auth ----------
const AUTH_KEY = "dexxure_auth_token";
function getToken() { return localStorage.getItem(AUTH_KEY); }
function setToken(t) { localStorage.setItem(AUTH_KEY, t); }
function clearToken() { localStorage.removeItem(AUTH_KEY); }
let currentUser = null;

async function checkAuth() {
  const token = getToken();
  if (!token) return false;
  try {
    const { ok, data } = await api("getUser", { token });
    if (ok && data) { currentUser = data; return true; }
  } catch (e) { console.error("checkAuth failed", e); }
  clearToken();
  return false;
}

// ---------- Settings ----------
async function loadSettings() {
  const token = getToken();
  const { ok, data } = await api("loadSettings", { token });
  return (ok && data) ? data : { theme: "cyber", volume: 0.8, avatar_url: null };
}

async function saveSettings(theme, volume, avatar_url = undefined) {
  const token = getToken();
  const payload: any = { token, theme, volume };
  if (avatar_url !== undefined) payload.avatar_url = avatar_url;
  const { ok } = await api("saveSettings", payload);
  return ok;
}

// ---------- Matrix ----------
const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const chars = "01ガフカケコサシスセゾタダチヂツテデトドZYXWVUTSRQPONMLKJIHGFEDCBA";
const drops = Array(Math.floor(canvas.width / 20)).fill(1);
function drawMatrix() {
  ctx.fillStyle = "rgba(10,10,10,0.1)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#0f0";
  ctx.font = "15px monospace";
  for (let i = 0; i < drops.length; i++) {
    const text = chars[Math.floor(Math.random() * chars.length)];
    ctx.fillText(text, i * 20, drops[i] * 20);
    if (drops[i] * 20 > canvas.height && Math.random() > 0.975) drops[i] = 0;
    drops[i]++;
  }
}
setInterval(drawMatrix, 50);

// ---------- Templates ----------
const templatesHTML = `
<template id="tmpl-posts"><div class="section active"><div id="posts-container">Загрузка постов...</div></div></template>
<template id="tmpl-team"><div class="section"><h2 class="glitch" data-text="НАША КОМАНДА">НАША КОМАНДА</h2><div class="team-member"><strong>Босс</strong> – @Dexxure<p>Основатель, главный идеолог.</p></div><div class="team-member"><strong>Разработчик</strong> – @code_ghost<p>Пишет код, оптимизирует баги.</p></div><p style="margin-top:1rem;">Полный состав появится позже, когда будут ссылки.</p></div></template>
<template id="tmpl-workshop"><div class="section"><h2 class="glitch" data-text="МАСТЕРСКАЯ">МАСТЕРСКАЯ</h2><p>Загружай свои моды для игр Dexxure Games.</p><form id="upload-mod-form" class="upload-form"><input type="text" id="mod-name" placeholder="Название мода" required><textarea id="mod-desc" placeholder="Описание" rows="3"></textarea><input type="file" id="mod-file" required><button type="submit">Загрузить</button></form><div id="mods-list"></div><p class="small" style="margin-top:1rem;">Функция в стадии тестирования.</p></div></template>
<template id="tmpl-about"><div class="section"><h2 class="glitch" data-text="ИНФОРМАЦИЯ">ИНФОРМАЦИЯ</h2><p><strong>Dexxure Games &copy; 2023-2026 DEXXURE GAMES. Все права защищены.</strong></p><p>DEXXURE Games™ — независимая игровая команда, занимающаяся разработкой видеоигр на движках Unity. Мы создаём проекты разных жанров, экспериментируем с механиками и уделяем особое внимание атмосфере, геймплею и качеству исполнения.</p><p>У DEXXURE Games есть собственный игровой Launcher — DG Launcher, в котором будет собрана большая часть наших текущих и будущих проектов. Это единая платформа для удобного доступа к нашим играм, обновлениям и новостям.</p><p>Мы активно развиваем своё сообщество:</p><ul><li>ведём собственный канал, где делимся прогрессом разработки, анонсами и закулисьем создания игр;</li></ul><p>DEXXURE Games™ — это развитие, идеи и постоянное движение вперёд. Мы делаем игры, в которые хотим играть сами.</p></div></template>
<template id="tmpl-settings"><div class="section"><h2 class="glitch" data-text="НАСТРОЙКИ">НАСТРОЙКИ</h2><form id="settings-form" class="settings-form"><label>Тема (в разработке):<select id="theme-select"><option value="cyber">Cyber</option><option value="acid">Acid</option><option value="dark">Dark</option></select></label><label>Громкость звуков (0-1):<input type="range" id="volume-range" min="0" max="1" step="0.1" value="0.8"><span id="volume-value">0.8</span></label><button type="submit">Сохранить настройки</button></form><p id="settings-status"></p><button id="logout-btn" style="margin-top:1rem; background:#330000;">Выйти</button></div></template>
`;
document.body.insertAdjacentHTML("beforeend", templatesHTML);

// ---------- Avatar container ----------
const avatarContainer = document.createElement("div");
avatarContainer.id = "avatar-container";
avatarContainer.innerHTML = '<img id="user-avatar-img" src="" alt="аватар" title="Нажми, чтобы сменить" style="display:none;">';
document.body.appendChild(avatarContainer);

function updateAvatar(url) {
  const img = document.getElementById("user-avatar-img");
  if (url) {
    img.src = url;
    img.style.display = "block";
    img.onerror = () => { img.style.display = "none"; };
  } else {
    img.src = "";
    img.style.display = "none";
  }
}

// Обработчик клика по аватарке
avatarContainer.addEventListener("click", () => {
  if (!currentUser) return;
  const currentUrl = (currentSettings && currentSettings.avatar_url) || "";
  const newUrl = prompt("Введите URL изображения для аватара:", currentUrl);
  if (newUrl !== null) {
    (async () => {
      const success = await saveSettings(
        currentSettings.theme,
        currentSettings.volume,
        newUrl
      );
      if (success) {
        currentSettings.avatar_url = newUrl;
        updateAvatar(newUrl);
      } else {
        alert("Не удалось сохранить аватар");
      }
    })();
  }
});

// ---------- Navigation ----------
const nav = document.querySelector("nav");
nav.style.display = "none";
const main = document.getElementById("app");
const navLinks = document.querySelectorAll(".nav-link");

function showSection(sectionId) {
  main.innerHTML = "";
  const template = document.getElementById(`tmpl-${sectionId}`);
  if (template) {
    main.appendChild(template.content.cloneNode(true));
  } else {
    main.innerHTML = "<p>Раздел не найден</p>";
  }
  if (sectionId === "settings") initSettings();
  if (sectionId === "posts") loadPosts();
  if (sectionId === "workshop") initWorkshop();
  navLinks.forEach(l => l.classList.toggle("active", l.dataset.section === sectionId));
}

navLinks.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const section = link.dataset.section;
    showSection(section);
    history.pushState(null, "", `#${section}`);
  });
});
window.addEventListener("popstate", () => {
  const section = location.hash.slice(1) || "posts";
  showSection(section);
});

// ---------- Posts ----------
async function loadPosts() {
  const c = document.getElementById("posts-container");
  if (!c) return;
  const { ok, data } = await api("getPosts");
  if (!ok) {
    c.innerHTML = "Ошибка загрузки.";
    return;
  }
  if (data.length === 0) {
    c.innerHTML = "Постов пока нет. Они появятся после первого запуска парсинга Telegram.";
    return;
  }
  c.innerHTML = data.map(p => `
    <div class="post-card">
      <time>${new Date(p.posted_at).toLocaleString("ru-RU")}</time>
      <div>${p.content.replace(/\n/g, "<br>")}</div>
    </div>`).join("");
}

function initWorkshop() {
  const form = document.getElementById("upload-mod-form");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      alert("Загрузка пока в разработке.");
    });
  }
}

// ---------- Settings section ----------
let currentSettings = { theme: "cyber", volume: 0.8, avatar_url: null };

async function initSettings() {
  currentSettings = await loadSettings();
  const themeSelect = document.getElementById("theme-select");
  const volumeRange = document.getElementById("volume-range");
  const volumeValue = document.getElementById("volume-value");
  const status = document.getElementById("settings-status");

  if (themeSelect) themeSelect.value = currentSettings.theme;
  if (volumeRange) {
    volumeRange.value = currentSettings.volume;
    volumeValue.textContent = currentSettings.volume;
    volumeRange.oninput = () => { volumeValue.textContent = volumeRange.value; };
  }

  document.getElementById("settings-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const theme = themeSelect.value;
    const volume = parseFloat(volumeRange.value);
    const ok = await saveSettings(theme, volume);
    if (status) {
      status.textContent = ok ? "Настройки сохранены." : "Ошибка сохранения.";
      status.style.color = ok ? "var(--acid)" : "red";
    }
  });

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await api("signout", { token: getToken() });
    clearToken();
    currentUser = null;
    nav.style.display = "none";
    updateAvatar(null);
    showAuthForm("signin");
  });

  updateAvatar(currentSettings.avatar_url);
}

// ---------- Auth form ----------
function showAuthForm(mode = "signin") {
  main.innerHTML = `
    <div class="auth-form">
      <h2 class="glitch" data-text="${mode === 'signin' ? 'ВХОД' : 'РЕГИСТРАЦИЯ'}">${mode === 'signin' ? 'ВХОД' : 'РЕГИСТРАЦИЯ'}</h2>
      <form id="auth-form">
        <input type="email" id="auth-email" placeholder="Email" required>
        <input type="password" id="auth-password" placeholder="Пароль" required minlength="6">
        <button type="submit">${mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}</button>
      </form>
      <p id="auth-switch">
        ${mode === 'signin'
          ? 'Нет аккаунта? <a href="#" id="switch-to-signup">Регистрация</a>'
          : 'Есть аккаунт? <a href="#" id="switch-to-signin">Войти</a>'}
      </p>
      <p id="auth-error" style="color:red;"></p>
    </div>
  `;

  document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    const action = mode === "signin" ? "signin" : "signup";
    const { ok, data, error } = await api(action, { email, password });

    if (ok) {
      if (mode === "signup") {
        const signinRes = await api("signin", { email, password });
        if (signinRes.ok) {
          setToken(signinRes.data.session.access_token);
          initApp();
        } else {
          document.getElementById("auth-error").textContent =
            "Регистрация прошла, но войти не удалось. Попробуйте войти вручную.";
        }
      } else {
        setToken(data.session.access_token);
        initApp();
      }
    } else {
      document.getElementById("auth-error").textContent = error || "Ошибка";
    }
  });

  document.getElementById("switch-to-signup")?.addEventListener("click", e => {
    e.preventDefault();
    showAuthForm("signup");
  });
  document.getElementById("switch-to-signin")?.addEventListener("click", e => {
    e.preventDefault();
    showAuthForm("signin");
  });
}

// ---------- Init after login ----------
async function initApp() {
  nav.style.display = "flex";
  // Загружаем настройки и аватар
  currentSettings = await loadSettings();
  updateAvatar(currentSettings.avatar_url);
  showSection(location.hash.slice(1) || "posts");
}

// ---------- Safe start ----------
(async () => {
  try {
    const isLogged = await checkAuth();
    if (isLogged) {
      await initApp();
    } else {
      showAuthForm("signin");
    }
  } catch (e) {
    console.error("App start error", e);
    main.innerHTML = `<div style="color:red;text-align:center;margin-top:2rem;">Критическая ошибка загрузки. Попробуйте обновить страницу.</div>`;
  }
})();
