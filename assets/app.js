const menuButton = document.querySelector("[data-menu]");
const nav = document.querySelector("[data-nav]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

const path = location.pathname.replace(/\/index\.html$/,"/").replace(/\/+$/,"/") || "/";
document.querySelectorAll("[data-link]").forEach((link) => {
  const href = new URL(link.getAttribute("href"), location.href).pathname.replace(/\/index\.html$/,"/").replace(/\/+$/,"/") || "/";
  if (href === path) link.classList.add("active");
});

const themeSelect = document.querySelector("[data-theme]");
const savedTheme = localStorage.getItem("dg_theme") || "dark";

function applyTheme(value){
  document.documentElement.classList.toggle("light", value === "light");
  localStorage.setItem("dg_theme", value);
}

applyTheme(savedTheme);

if (themeSelect) {
  themeSelect.value = savedTheme;
  themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
}

const modForm = document.querySelector("[data-mod-form]");
const modNote = document.querySelector("[data-mod-note]");

if (modForm) {
  modForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(modForm).entries());

    if (!data.title || !data.download_url) {
      showNote("Заполни название и ссылку на файл.");
      return;
    }

    /*
      Supabase подключается здесь.
      Важно: в таблице mods должна быть колонка download_url.
      SQL лежит в файле supabase_mods_fix.sql.
    */

    showNote("Заявка подготовлена. Подключи Supabase в assets/app.js, если нужна настоящая отправка.");
    modForm.reset();
  });
}

function showNote(text){
  if (!modNote) return;
  modNote.textContent = text;
  modNote.style.display = "block";
}
