const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function displayName(user) {
  return String(user?.first_name || user?.firstname || user?.name || "").trim();
}

export function greetingFor(user, storage, now = new Date()) {
  const name = displayName(user);
  if (!name) return null;
  const key = `restaurant-admin-last-visit-${user.id ?? user.email ?? name}`;
  const today = dayKey(now);
  let firstOfDay = true;
  try {
    firstOfDay = storage?.getItem(key) !== today;
    if (firstOfDay) storage?.setItem(key, today);
  } catch { /* Stockage indisponible : on affiche l'accueil standard. */ }
  return firstOfDay ? `Bonjour, ${name} 👋` : `Ravi de vous revoir, ${name} 😊`;
}
