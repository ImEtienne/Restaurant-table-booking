export function mountMobileMenu(doc = document, win = window) {
  const body = doc.body;
  const button = doc.getElementById("admin-menu");
  const close = doc.getElementById("admin-menu-close");
  const sidebar = doc.getElementById("admin-sidebar");
  const backdrop = doc.getElementById("admin-backdrop");
  const main = doc.querySelector(".admin-main");
  const isOpen = () => body.classList.contains("admin-menu-open");
  const set = (open, restoreFocus) => {
    body.classList.toggle("admin-menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    // Le contenu derrière le tiroir ne doit pas rester atteignable au clavier.
    if (main) main.inert = open;
    if (open) (close || sidebar.querySelector("a[href]"))?.focus();
    else if (restoreFocus) button.focus();
  };
  button.addEventListener("click", () => set(!isOpen(), false));
  close?.addEventListener("click", () => set(false, true));
  backdrop?.addEventListener("click", () => set(false, true));
  sidebar.addEventListener("click", (event) => { if (event.target.closest?.("a[href]")) set(false, false); });
  win.addEventListener("hashchange", () => { if (isOpen()) set(false, false); });
  win.addEventListener("keydown", (event) => { if (event.key === "Escape" && isOpen()) set(false, true); });
  const wide = win.matchMedia?.("(min-width: 761px)");
  wide?.addEventListener?.("change", (event) => { if (event.matches && isOpen()) set(false, false); });
}
