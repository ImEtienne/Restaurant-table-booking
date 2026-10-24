export const CONSENT_KEY = "restaurant-cookie-consent";

function defaultStorage() {
  try { return window.localStorage; } catch { return null; }
}

export function readConsent(storage = defaultStorage()) {
  try {
    const value = JSON.parse(storage?.getItem(CONSENT_KEY) ?? "null");
    return value && typeof value.optional === "boolean" ? { essential: true, optional: value.optional } : null;
  } catch {
    return null;
  }
}

export function saveConsent(optional, storage = defaultStorage()) {
  const consent = { essential: true, optional: Boolean(optional), savedAt: new Date().toISOString() };
  try { storage?.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch { /* Le choix vaut pour la session si le stockage est bloqué. */ }
  return consent;
}

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(doc, className, text, label) {
  const node = el(doc, "button", className, text);
  node.type = "button";
  if (label) node.setAttribute("aria-label", label);
  return node;
}

export function mountCookieBanner(doc = document, storage = defaultStorage()) {
  if (doc.getElementById("cookie-banner")) return;

  const fab = button(doc, "cookie-fab", "", "Gérer mes préférences cookies");
  fab.id = "cookie-fab";
  fab.hidden = true;
  const fabImg = el(doc, "img");
  fabImg.src = "/img/cookie.jpeg";
  fabImg.alt = "";
  fab.append(fabImg);

  const banner = el(doc, "section", "cookie-banner");
  banner.id = "cookie-banner";
  banner.hidden = true;
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-labelledby", "cookie-title");
  banner.setAttribute("aria-describedby", "cookie-text");

  const close = button(doc, "cookie-close", "×", "Fermer");
  const icon = el(doc, "img", "cookie-icon");
  icon.src = "/img/cookie.jpeg";
  icon.alt = "";
  const title = el(doc, "h2", "cookie-title", "Un petit mot sur les cookies");
  title.id = "cookie-title";
  const text = el(doc, "p", "cookie-text", "Nous utilisons des cookies pour faire fonctionner le site (connexion, réservation) et améliorer votre expérience. Vous pouvez accepter ou choisir ceux que vous autorisez.");
  text.id = "cookie-text";

  const settings = el(doc, "div", "cookie-settings");
  settings.id = "cookie-settings";
  settings.hidden = true;
  const essential = el(doc, "label", "cookie-option");
  const essentialInput = el(doc, "input");
  essentialInput.type = "checkbox";
  essentialInput.checked = true;
  essentialInput.disabled = true;
  essential.append(essentialInput, el(doc, "span", "", "Essentiels : toujours actifs, nécessaires au fonctionnement du site"));
  const optional = el(doc, "label", "cookie-option");
  const optionalInput = el(doc, "input");
  optionalInput.type = "checkbox";
  optional.append(optionalInput, el(doc, "span", "", "Préférences et mesure d’audience : nous aident à améliorer le site"));
  settings.append(essential, optional);

  const actions = el(doc, "div", "cookie-actions");
  const accept = button(doc, "cookie-accept", "Accepter");
  const toggle = button(doc, "cookie-edit", "Paramètres");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "cookie-settings");
  actions.append(accept, toggle);

  banner.append(close, icon, title, text, settings, actions);
  doc.body.append(banner, fab);

  const show = () => { banner.hidden = false; fab.hidden = true; accept.focus?.({ preventScroll: true }); };
  const hide = () => { banner.hidden = true; fab.hidden = false; };
  const decide = (allowOptional) => { saveConsent(allowOptional, storage); optionalInput.checked = allowOptional; hide(); };
  let editing = false;
  const setEditing = (value) => {
    editing = value;
    settings.hidden = !value;
    toggle.setAttribute("aria-expanded", String(value));
    toggle.textContent = value ? "Enregistrer mes choix" : "Paramètres";
    accept.textContent = value ? "Tout accepter" : "Accepter";
  };

  accept.addEventListener("click", () => { setEditing(false); decide(true); });
  toggle.addEventListener("click", () => {
    if (!editing) { setEditing(true); return; }
    setEditing(false);
    decide(optionalInput.checked);
  });
  close.addEventListener("click", () => { setEditing(false); hide(); });
  fab.addEventListener("click", () => { setEditing(false); show(); });
  banner.addEventListener("keydown", (event) => { if (event.key === "Escape") { setEditing(false); hide(); } });

  const saved = readConsent(storage);
  if (saved) { optionalInput.checked = saved.optional; fab.hidden = false; } else banner.hidden = false;
}
