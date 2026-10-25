export const HOME_THEME_KEY = "restaurant-home-theme";

function defaultStorage() {
  try { return window.localStorage; } catch { return null; }
}

export function mountHomeTheme(doc = document, storage = defaultStorage()) {
  const toggle = doc.getElementById("home-theme-toggle");
  if (!toggle) return;

  const moon = doc.getElementById("home-theme-moon");
  const sun = doc.getElementById("home-theme-sun");
  const label = doc.getElementById("home-theme-label");
  const applyTheme = (dark) => {
    doc.body.classList.toggle("home-dark", dark);
    toggle.setAttribute("aria-pressed", String(dark));
    toggle.setAttribute("aria-label", dark ? "Activer le mode clair" : "Activer le mode sombre");
    toggle.title = dark ? "Mode clair" : "Mode sombre";
    moon.hidden = dark;
    sun.hidden = !dark;
    label.textContent = dark ? "Mode clair" : "Mode sombre";
  };

  let dark = false;
  try { dark = storage?.getItem(HOME_THEME_KEY) === "dark"; } catch { /* La préférence reste limitée à cette page. */ }
  applyTheme(dark);

  toggle.addEventListener("click", () => {
    dark = !doc.body.classList.contains("home-dark");
    applyTheme(dark);
    try { storage?.setItem(HOME_THEME_KEY, dark ? "dark" : "light"); } catch { /* La préférence est facultative. */ }
  });
}
