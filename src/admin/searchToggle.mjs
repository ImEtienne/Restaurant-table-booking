export function mountSearchToggle(doc = document, win = window) {
  const toggle = doc.getElementById("admin-search-toggle");
  const input = doc.getElementById("admin-global-query");
  const header = doc.querySelector(".admin-header");
  if (!toggle || !header) return;
  const isOpen = () => header.classList.contains("admin-search-open");
  const set = (open) => {
    header.classList.toggle("admin-search-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) input?.focus();
  };
  toggle.addEventListener("click", () => set(!isOpen()));
  win.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) { set(false); toggle.focus(); }
  });
  win.matchMedia?.("(min-width: 761px)")?.addEventListener?.("change", (event) => { if (event.matches) set(false); });
}
