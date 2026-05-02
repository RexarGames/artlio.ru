const API_URL = "https://llihkhqbixjgvcltcajn.supabase.co/functions/v1/api";

async function api(action, payload = {}) {
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    return await resp.json();
  } catch (e) {
    console.error("API error", e);
    return { ok: false, error: "Сетевая ошибка" };
  }
}

// ---------- Auth ----------
const AUTH_KEY = "dexxure_auth_token";
const getToken = () => localStorage.getItem(AUTH_KEY);
const setToken = (t) => localStorage.setItem(AUTH_KEY, t);
const clearToken = () => localStorage.removeItem(AUTH_KEY);
let currentUser = null;

async function checkAuth() {
  const token = getToken();
  if (!token) return false;
  const { ok, data } = await api("getUser", { token });
  if (ok && data) {
    currentUser = data;
    return true;
  }
  clearToken();
  return false;
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
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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

// ---------- Avatar ----------
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

avatarContainer.addEventListener("click", () => {
  if (!currentUser) return;
  const currentUrl = currentSettings?.avatar_url || "";
  const newUrl = prompt("Введите URL изображения для аватара:", currentUrl);
  if (newUrl !== null) {
    (async () => {
      const success = await saveSettings(currentSettings.theme, currentSettings.volume, newUrl);
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
const navLinks = document.querySelectorAll(".nav-link");

function showSection(sectionId) {
  // Скрываем все секции
  document.querySelectorAll("#app .section").forEach(s => s.classList.remove("active"));

  // Показываем нужную секцию
  const sectionEl = document.getElementById(`section-${sectionId}`);
  if (sectionEl) {
    sectionEl.classList.add("active");
  } else {
    // fallback
    document.getElementById("section-posts")?.classList.add("active");
  }

  // Дополнительная инициализация
  if (sectionId === "posts") loadPosts();
  if (sectionId === "workshop") {
    const form = document.getElementById("upload-mod-form");
    if (form && !form.dataset.listener) {
      form.dataset.listener = "true";
      form.addEventListener("submit", (e) => { e.preventDefault(); alert("Загрузка в разработке."); });
    }
  }
  if (sectionId === "settings") {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn && !logoutBtn.dataset.listener) {
      logoutBtn.dataset.listener = "true";
      logoutBtn.addEventListener("click", async () => {
        await api("signout", { token: getToken() });
        clearToken();
        currentUser = null;
        nav.style.display = "none";
        updateAvatar(null);
        showAuthForm("signin");
      });
    }
  }

  // Подсветка текущей ссылки
  navLinks.forEach(link => link.classList.toggle("active", link.dataset.section === sectionId));
}

navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
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
  const container = document.getElementById("posts-container");
  if (!container) return;
  const { ok, data } = await api("getPosts");
  if (!ok) { container.innerHTML = "Ошибка загрузки."; return; }
  if (data.length === 0) { container.innerHTML = "Постов пока нет."; return; }
  container.innerHTML = data.map(p => `
    <div class="post-card">
      <time>${new Date(p.posted_at).toLocaleString("ru-RU")}</time>
      <div>${(p.content || "").replace(/\n/g, "<br>")}</div>
    </div>`).join("");
}

// ---------- Settings data ----------
let currentSettings = { theme: "cyber", volume: 0.8, avatar_url: null };

async function loadSettings() {
  const token = getToken();
  const { ok, data } = await api("loadSettings", { token });
  return (ok && data) ? data : { theme: "cyber", volume: 0.8, avatar_url: null };
}

async function saveSettings(theme, volume, avatar_url = undefined) {
  const token = getToken();
  const payload = { token, theme, volume };
  if (avatar_url !== undefined) payload.avatar_url = avatar_url;
  const { ok } = await api("saveSettings", payload);
  return ok;
}

// ---------- Auth Form ----------
function showAuthForm(mode = "signin") {
  // Скрываем все секции
  document.querySelectorAll("#app .section").forEach(s => s.classList.remove("active"));

  const main = document.getElementById("app");
  // Вставляем форму авторизации
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

  document.getElementById("auth-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    const action = mode === "signin" ? "signin" : "signup";
    const { ok, data, error } = await api(action, { email, password });

    if (ok) {
      if (action === "signup") {
        // signUp теперь возвращает сессию, если не требуется подтверждение
        if (data?.session?.access_token) {
          setToken(data.session.access_token);
          initApp();
        } else if (data?.user?.email_confirmed_at === null) {
          document.getElementById("auth-error").textContent = "Требуется подтверждение email. Проверьте почту.";
        } else {
          // Пробуем signIn, если сессии нет (старая логика)
          const signinRes = await api("signin", { email, password });
          if (signinRes.ok) {
            setToken(signinRes.data.session.access_token);
            initApp();
          } else {
            document.getElementById("auth-error").textContent = "Не удалось войти после регистрации.";
          }
        }
      } else {
        setToken(data.session.access_token);
        initApp();
      }
    } else {
      document.getElementById("auth-error").textContent = error || "Ошибка";
    }
  });

  document.getElementById("switch-to-signup")?.addEventListener("click", (e) => { e.preventDefault(); showAuthForm("signup"); });
  document.getElementById("switch-to-signin")?.addEventListener("click", (e) => { e.preventDefault(); showAuthForm("signin"); });
}

// ---------- Init after login ----------
async function initApp() {
  nav.style.display = "flex";
  // Восстанавливаем секции, если были удалены формой авторизации
  const main = document.getElementById("app");
  if (!document.getElementById("section-posts")) {
    // если вдруг innerHTML стер секции, но такого быть не должно, но перестрахуемся
    main.innerHTML = `
      <div id="section-posts" class="section"><div id="posts-container">Загрузка постов...</div></div>
      <div id="section-team" class="section"><h2 class="glitch" data-text="НАША КОМАНДА">НАША КОМАНДА</h2>...</div>
      ...
    `;
  }
  currentSettings = await loadSettings();
  updateAvatar(currentSettings.avatar_url);
  showSection(location.hash.slice(1) || "posts");
}

// ---------- Старт ----------
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
    const main = document.getElementById("app");
    main.innerHTML = `<div style="color:red;text-align:center;margin-top:2rem;">Критическая ошибка. Обновите страницу.</div>`;
  }
})();
