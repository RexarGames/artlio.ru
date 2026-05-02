// Единственный URL — никаких ключей
const API_URL = "https://llihkhqbixjgvcltcajn.supabase.co/functions/v1/api";

// Универсальная функция запроса
async function api(action, payload = {}) {
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return resp.json();
}

// Матричный фон
const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const chars = "01ガフカケコサシスセゾタダチヂツテデトドZYXWVUTSRQPONMLKJIHGFEDCBA";
const drops = Array(Math.floor(canvas.width / 20)).fill(1);
function drawMatrix() {
  ctx.fillStyle = "rgba(10, 10, 10, 0.1)";
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

// Генерация/получение ID пользователя
function getUserId() {
  let id = localStorage.getItem("dexxure_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dexxure_user_id", id);
  }
  return id;
}

// Загрузка настроек через API
async function loadSettings() {
  const userId = getUserId();
  const response = await api("loadSettings", { user_id: userId });
  if (response.ok) return response.data || { theme: "cyber", volume: 0.8 };
  console.error("Ошибка загрузки настроек:", response.error);
  return { theme: "cyber", volume: 0.8 };
}

// Сохранение настроек
async function saveSettings(theme, volume) {
  const userId = getUserId();
  const response = await api("saveSettings", { user_id: userId, theme, volume });
  return response.ok;
}

// Навигация
const navLinks = document.querySelectorAll(".nav-link");
const main = document.getElementById("app");

function showSection(sectionId) {
  main.innerHTML = "";
  const template = document.getElementById(`tmpl-${sectionId}`);
  if (template) {
    const clone = template.content.cloneNode(true);
    main.appendChild(clone);
  }
  if (sectionId === "settings") initSettings();
  if (sectionId === "posts") loadPosts();
  if (sectionId === "workshop") initWorkshop();

  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.section === sectionId);
  });
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

const initialSection = location.hash.slice(1) || "posts";
showSection(initialSection);

// Шаблоны секций
const templates = `
  <template id="tmpl-posts">
    <div class="section active">
      <div id="posts-container">Загрузка постов...</div>
    </div>
  </template>

  <template id="tmpl-team">
    <div class="section">
      <h2 class="glitch" data-text="НАША КОМАНДА">НАША КОМАНДА</h2>
      <div class="team-member">
        <strong>Босс</strong> – @Dexxure
        <p>Основатель, главный идеолог.</p>
      </div>
      <div class="team-member">
        <strong>Разработчик</strong> – @code_ghost
        <p>Пишет код, оптимизирует баги.</p>
      </div>
      <p style="margin-top:1rem;">Полный состав появится позже, когда будут ссылки.</p>
    </div>
  </template>

  <template id="tmpl-workshop">
    <div class="section">
      <h2 class="glitch" data-text="МАСТЕРСКАЯ">МАСТЕРСКАЯ</h2>
      <p>Загружай свои моды для игр Dexxure Games.</p>
      <form id="upload-mod-form" class="upload-form">
        <input type="text" id="mod-name" placeholder="Название мода" required>
        <textarea id="mod-desc" placeholder="Описание" rows="3"></textarea>
        <input type="file" id="mod-file" required>
        <button type="submit">Загрузить</button>
      </form>
      <div id="mods-list"></div>
      <p class="small" style="margin-top:1rem;">Функция в стадии тестирования.</p>
    </div>
  </template>

  <template id="tmpl-about">
    <div class="section">
      <h2 class="glitch" data-text="ИНФОРМАЦИЯ">ИНФОРМАЦИЯ</h2>
      <p>Dexxure Games — независимая команда разработчиков игр и модов.</p>
      <p>Контакты: t.me/DexxureEnt</p>
      <p>Подробнее будет на artlio.ru (ссылки скинешь).</p>
    </div>
  </template>

  <template id="tmpl-settings">
    <div class="section">
      <h2 class="glitch" data-text="НАСТРОЙКИ">НАСТРОЙКИ</h2>
      <form id="settings-form" class="settings-form">
        <label>
          Тема (не используется):
          <select id="theme-select">
            <option value="cyber">Cyber</option>
            <option value="acid">Acid</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Громкость звуков (0-1):
          <input type="range" id="volume-range" min="0" max="1" step="0.1" value="0.8">
          <span id="volume-value">0.8</span>
        </label>
        <button type="submit">Сохранить настройки</button>
      </form>
      <p id="settings-status"></p>
    </div>
  </template>
`;

document.body.insertAdjacentHTML("beforeend", templates);

// Функции разделов
async function loadPosts() {
  const container = document.getElementById("posts-container");
  if (!container) return;

  const { ok, data, error } = await api("getPosts");
  if (!ok) {
    container.innerHTML = "Ошибка загрузки постов.";
    return;
  }
  if (data.length === 0) {
    container.innerHTML = "Постов пока нет. Они появятся после первого запуска Edge Function.";
    return;
  }
  container.innerHTML = data
    .map(
      (post) => `
    <div class="post-card">
      <time>${new Date(post.posted_at).toLocaleString("ru-RU")}</time>
      <div>${post.content.replace(/\n/g, "<br>")}</div>
    </div>`
    )
    .join("");
}

function initWorkshop() {
  const form = document.getElementById("upload-mod-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Загрузка пока не подключена. Ждём интеграции Supabase Storage.");
    });
  }
}

let currentSettings = { theme: "cyber", volume: 0.8 };

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
    volumeRange.addEventListener("input", () => {
      volumeValue.textContent = volumeRange.value;
    });
  }

  const form = document.getElementById("settings-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const theme = themeSelect.value;
      const volume = parseFloat(volumeRange.value);
      const success = await saveSettings(theme, volume);
      if (status) {
        status.textContent = success
          ? "Настройки сохранены."
          : "Ошибка сохранения.";
        status.style.color = success ? "var(--acid)" : "red";
      }
    });
  }
}
