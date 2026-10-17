import { createAdminService } from "../services/adminService.mjs";
import { showToast } from "./toast.js";

export function mountSiteAccount(api = createAdminService()) {
  const $ = (id) => document.getElementById(`site-${id}`);
  if (!$("account")) return;
  let revision = 0;
  let loggingOut = false;
  function close() {
    $("account-panel").hidden = true;
    $("account-toggle").setAttribute("aria-expanded", "false");
  }
  function signedOut() {
    close(); $("account").hidden = true; $("signin").hidden = false;
    $("account-name").textContent = ""; $("account-avatar").textContent = "";
  }
  async function refresh() {
    const version = ++revision;
    try {
      const { data: user } = await api.profile();
      if (version !== revision) return;
      $("signin").hidden = true; $("account").hidden = false;
      $("account-name").textContent = user.name;
      $("account-avatar").textContent = user.name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toLocaleUpperCase("fr");
      $("account-dashboard").href = user.is_admin ? "/dashboard.html" : "/dashboard.html#client";
      $("account-dashboard").textContent = user.is_admin ? "Tableau de bord" : "Mes réservations";
    } catch (error) {
      if (version !== revision) return;
      if ([401, 403, 419].includes(error.status)) signedOut();
      // Une panne réseau n’invalide pas la session et ne déclenche jamais de logout.
    }
  }
  $("account-toggle").addEventListener("click", () => {
    const open = $("account-panel").hidden;
    $("account-panel").hidden = !open;
    $("account-toggle").setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => { if (!$("account").contains(event.target)) close(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("account-panel").hidden) { close(); $("account-toggle").focus(); }
  });
  $("account-logout").addEventListener("click", async () => {
    if (loggingOut) return;
    loggingOut = true; revision++;
    $("account-logout").disabled = true;
    try {
      await api.userLogout(); signedOut(); showToast("Vous êtes déconnecté.", "success");
    } catch (error) {
      if (error.status === 401) signedOut();
      else showToast("La déconnexion n’a pas pu être confirmée. Réessayez.");
    } finally { loggingOut = false; $("account-logout").disabled = false; }
  });
  window.addEventListener("pageshow", (event) => { if (event.persisted) refresh(); });
  window.addEventListener("focus", refresh);
  const ready = refresh();
  return { refresh, ready };
}

mountSiteAccount();
