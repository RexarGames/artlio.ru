const downloadLinks = document.querySelectorAll(".download-button, .topbar__button");

downloadLinks.forEach((link) => {
  link.addEventListener("click", () => {
    link.classList.add("is-downloading");
    setTimeout(() => link.classList.remove("is-downloading"), 1800);
  });
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
