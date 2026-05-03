const menuButton = document.querySelector("[data-menu]");
const nav = document.querySelector("[data-nav]");

if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
        nav.classList.toggle("open");
    });
}

const currentPath = location.pathname.replace(/\/+$/, "") || "/";
document.querySelectorAll("[data-nav] a").forEach((link) => {
    const href = link.getAttribute("href").replace(/\/+$/, "") || "/";
    if (href === currentPath) {
        link.classList.add("active");
    }
});
