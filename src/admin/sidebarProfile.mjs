// Seuls les chemins relatifs et https: sont acceptés pour la photo.
export function safeAvatarUrl(value) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  return /^\/(?!\/)/.test(url) || /^https:\/\/\S+$/i.test(url) ? url : "";
}

export function profileInitials(user) {
  const first = Array.from(String(user?.first_name || user?.firstname || "").trim())[0] || "";
  const last = Array.from(String(user?.name || "").trim())[0] || "";
  return (first + last).toLocaleUpperCase("fr") || "?";
}

export function renderSidebarProfile(user, doc = document) {
  const $ = (id) => doc.getElementById(`admin-${id}`);
  const firstName = String(user?.first_name || user?.firstname || "").trim();
  const img = $("avatar-img");
  const initials = $("avatar-initials");
  const showInitials = () => { img.hidden = true; initials.hidden = false; };
  $("profile-name").textContent = user?.name || "";
  $("profile-firstname").textContent = firstName;
  $("profile-firstname").hidden = !firstName;
  initials.textContent = profileInitials(user);
  img.onerror = showInitials;
  const url = safeAvatarUrl(user?.avatar_url || user?.avatar);
  if (url) {
    img.src = url;
    img.hidden = false;
    initials.hidden = true;
  } else {
    img.removeAttribute("src");
    showInitials();
  }
}

export function mountProfileMenu(doc = document) {
  const toggle = doc.getElementById("admin-profile-toggle");
  const menu = doc.getElementById("admin-profile-menu");
  const set = (open) => { menu.hidden = !open; toggle.setAttribute("aria-expanded", String(open)); };
  toggle.addEventListener("click", () => set(menu.hidden));
  menu.addEventListener("click", () => set(false));
  doc.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !toggle.contains(event.target)) set(false);
  });
  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) { set(false); toggle.focus(); }
  });
}
