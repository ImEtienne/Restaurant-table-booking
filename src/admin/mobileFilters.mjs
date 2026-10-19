export function activeFilters(form) {
  return Array.from(form.elements).filter((field) => field.name && String(field.value ?? "").trim() !== "").length;
}

export function mountFiltersToggle(doc = document) {
  const toggle = doc.getElementById("admin-filters-toggle");
  const panel = doc.getElementById("admin-filters");
  const count = doc.getElementById("admin-filters-count");
  if (!toggle || !panel || !count) return;
  const set = (open) => {
    panel.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  const show = (total) => {
    count.textContent = String(total);
    count.hidden = total === 0;
    toggle.setAttribute("aria-label", total ? `Filtres, ${total} actif${total > 1 ? "s" : ""}` : "Filtres");
  };
  toggle.addEventListener("click", () => set(!panel.classList.contains("is-open")));
  panel.addEventListener("submit", () => { show(activeFilters(panel)); set(false); });
  panel.addEventListener("reset", () => { show(0); set(false); });
}
