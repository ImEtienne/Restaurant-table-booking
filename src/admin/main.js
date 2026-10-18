import "../styles/admin.css";
import { createAdminService } from "../services/adminService.mjs";
import { renderReservations } from "./reservationTable.mjs";
import { renderMetrics, validatePeriod } from "./statistics.mjs";
import { showToast } from "../scripts/toast.js";
import { searchReservations } from "./search.mjs";
import { mountAccounts } from "./accounts.js";
import { mountClient } from "./client.js";
import { applyPlaceholders } from "../scripts/placeholders.mjs";
import { renderSidebarProfile, mountProfileMenu } from "./sidebarProfile.mjs";
applyPlaceholders();

const api = createAdminService();
const $ = (id) => document.getElementById(`admin-${id}`);
let page = 1;
let lastPage = 1;
let busy = false;
let filters = {};
let period = {};
let statsBusy = false;
let currentUser = null;
let accounts = null;
let client = null;
let assigning = false;
$("assignment").addEventListener("submit", async (event) => {
  event.preventDefault(); if (assigning) return;
  const form = event.currentTarget;
  const fields = Object.fromEntries(new FormData(form));
  assigning = true;
  const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
  $("assignment-status").textContent = "Rattachement en cours…";
  try {
    await api.assignClient(Number(fields.reservation_id), Number(fields.user_id));
    $("assignment-status").textContent = "Réservation rattachée au client. Son statut est inchangé.";
    showToast("Rattachement effectué.", "success");
    await load();
  } catch (error) {
    $("assignment-status").textContent = error.status === 409 ? "Cette réservation appartient déjà à un autre client." : Object.values(error.errors || {}).flat().join(" ") || error.message;
    showToast($("assignment-status").textContent);
    if ([401, 419].includes(error.status)) handleError(error);
  } finally { assigning = false; submit.disabled = false; }
});
let currentReservations = [];
let searchVersion = 0;
$("global-search").addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = $("global-query").value.trim();
  const version = ++searchVersion;
  $("global-results").hidden = false;
  $("global-status").textContent = "Recherche en cours…";
  $("global-users").replaceChildren();
  $("global-reservations").replaceChildren();
  $("global-results").setAttribute("aria-busy", "true");
  try {
    const result = await api.search(query);
    if (version !== searchVersion) return;
    const { users, reservations } = result.data;
    for (const user of users) {
      const item = document.createElement("li");
      item.textContent = `${user.name} · ${user.email} · ${user.is_admin ? "Administrateur" : "Utilisateur"}`;
      $("global-users").append(item);
    }
    if (!users.length) $("global-users").textContent = "Aucun utilisateur trouvé.";
    renderReservations($("global-reservations"), reservations);
    // Les décisions restent dans le tableau principal pour conserver un seul parcours de traitement.
    $("global-reservations").querySelectorAll("button[data-id]").forEach((button) => { button.disabled = true; button.title = "Traitez cette demande depuis le tableau des réservations."; });
    const more = result.meta.has_more.users || result.meta.has_more.reservations;
    $("global-status").textContent = `${users.length} utilisateur(s) et ${reservations.length} réservation(s) pour « ${query} ».${more ? " D’autres résultats existent : précisez votre recherche." : ""}`;
  } catch (error) {
    if (version !== searchVersion) return;
    $("global-status").textContent = error.status === 429 ? "Trop de recherches. Patientez une minute avant de réessayer." : error.message;
    if ([401, 403, 419].includes(error.status)) handleError(error);
  } finally {
    if (version === searchVersion) $("global-results").setAttribute("aria-busy", "false");
  }
});
$("close-search").addEventListener("click", () => {
  searchVersion++;
  $("global-results").hidden = true;
  $("global-results").setAttribute("aria-busy", "false");
  $("global-query").focus();
});
function renderSearch() {
  const matches = searchReservations(currentReservations, $("search").value);
  renderReservations($("rows"), matches);
  $("search-count").textContent = $("search").value.trim()
    ? `${matches.length} résultat(s) sur ${currentReservations.length} réservation(s) de cette page.` : "";
}
$("search").addEventListener("input", renderSearch);

async function loadStats() {
  if (statsBusy) return;
  const error = validatePeriod(period);
  if (error) { $("stats-notice").textContent = error; return; }
  statsBusy = true;
  $("statistics").setAttribute("aria-busy", "true");
  $("period").querySelectorAll("button, input").forEach((control) => { control.disabled = true; });
  $("stats-notice").textContent = "Chargement des statistiques…";
  try {
    const results = await Promise.allSettled([api.stats(period), api.dailyStats(period), api.hourlyStats(period)]);
    const failed = results.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
    const [summary, daily, hourly] = results.map((result) => result.value);
    for (const [id, key] of Object.entries({ total: "total_reservations", pending: "pending", confirmed: "confirmed", rejected: "rejected", cancelled: "cancelled", guests: "total_guests", "confirmed-guests": "confirmed_guests", average: "average_party_size", rate: "confirmation_rate" })) {
      $(id).textContent = `${new Intl.NumberFormat("fr-FR").format(summary.data[key])}${id === "rate" ? " %" : ""}`;
    }
    $("period-label").textContent = `Du ${summary.meta.start_date} au ${summary.meta.end_date} inclus · ${summary.meta.timezone} · Date prévue de réservation`;
    renderMetrics($("daily"), daily.data, "date");
    renderMetrics($("hourly"), hourly.data, "hour");
    $("stats-notice").textContent = "";
  } catch (error) {
    $("stats").querySelectorAll("strong").forEach((node) => { node.textContent = "—"; });
    $("daily").replaceChildren();
    $("hourly").replaceChildren();
    $("stats-notice").textContent = error.message;
    if ([401, 403, 419].includes(error.status)) handleError(error);
  } finally {
    statsBusy = false;
    $("statistics").setAttribute("aria-busy", "false");
    $("period").querySelectorAll("button, input").forEach((control) => { control.disabled = false; });
  }
}
$("period").addEventListener("submit", (event) => {
  event.preventDefault();
  period = Object.fromEntries(new FormData(event.currentTarget));
  loadStats();
});
$("period").addEventListener("reset", () => { period = {}; loadStats(); });

function handleError(error) {
  if ([401, 403, 419].includes(error.status)) {
    $("private").hidden = true;
    location.replace("/login.html#login");
    return;
  }
  $("notice").textContent = error.status === 419 ? "Votre session de sécurité a expiré. Reconnectez-vous." : error.message;
}
function setBusy(value) {
  busy = value;
  $("private").setAttribute("aria-busy", String(value));
  $("private").querySelectorAll("button, input, select").forEach((control) => { control.disabled = value; });
  $("prev").disabled = value || page <= 1;
  $("next").disabled = value || page >= lastPage;
}
async function load() {
  if (busy) return;
  setBusy(true);
  $("notice").textContent = "Chargement des réservations…";
  try {
    const result = await api.reservations({ ...filters, page });
    currentReservations = result.data;
    renderSearch();
    lastPage = result.meta.last_page;
    page = result.meta.current_page;
    $("page-number").textContent = `Page ${page} sur ${lastPage} · ${result.meta.total} réservation(s)`;
    $("notice").textContent = "";
  } catch (error) {
    currentReservations = [];
    $("search-count").textContent = "";
    $("rows").replaceChildren();
    $("page-number").textContent = "Résultats indisponibles";
    handleError(error);
  }
  finally { setBusy(false); }
}
$("filters").addEventListener("submit", (event) => {
  event.preventDefault();
  filters = Object.fromEntries(new FormData(event.currentTarget));
  page = 1;
  load();
});
$("filters").addEventListener("reset", () => { filters = {}; page = 1; load(); });
$("refresh").addEventListener("click", load);
$("prev").addEventListener("click", () => { if (!busy && page > 1) { page--; load(); } });
$("next").addEventListener("click", () => { if (!busy && page < lastPage) { page++; load(); } });
$("rows").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button || busy) return;
  setBusy(true);
  let failure;
  try { await api.updateReservation(Number(button.dataset.id), button.dataset.status); }
  catch (error) { failure = error; }
  finally { setBusy(false); }
  if (!failure || [404, 409].includes(failure.status)) {
    await load();
    await loadStats();
  }
  if (failure) handleError(failure);
  else $("notice").textContent = "Statut mis à jour. Aucun email n’a été envoyé.";
});
mountProfileMenu();
$("logout").addEventListener("click", async () => {
  $("logout").disabled = true;
  try { await api.userLogout(); location.replace("/login.html"); }
  catch (error) { handleError(error); $("logout").disabled = false; }
});
$("menu").addEventListener("click", () => {
  const open = document.body.classList.toggle("admin-menu-open");
  $("menu").setAttribute("aria-expanded", String(open));
});
function section() {
  let selectedSection = location.hash.slice(1) || "dashboard";
  if (!["dashboard", "reservations", "users", "profile", "client"].includes(selectedSection)) selectedSection = "dashboard";
  if (currentUser && !currentUser.is_admin && selectedSection !== "profile") selectedSection = "client";
  if (currentUser?.is_admin && selectedSection === "client") selectedSection = "dashboard";
  const accountSection = ["users", "profile"].includes(selectedSection);
  $("statistics").hidden = selectedSection !== "dashboard";
  $("reservation-section").hidden = accountSection || selectedSection === "client";
  $("accounts").hidden = !accountSection;
  $("client").hidden = selectedSection !== "client";
  $("title").textContent = { dashboard: "Tableau de bord", reservations: "Réservations", users: "Utilisateurs", profile: "Mon profil", client: "Mes réservations" }[selectedSection];
  document.title = `${$("title").textContent} | Restaurant XYZ`;
  accounts?.activate(selectedSection);
  if (selectedSection === "client") client?.activate();
  else client?.deactivate();
  document.querySelectorAll("[data-section]").forEach((link) => {
    if (link.dataset.section === selectedSection) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.body.classList.remove("admin-menu-open");
  $("menu").setAttribute("aria-expanded", "false");
}
window.addEventListener("hashchange", section);
section();
function theme(dark) {
  document.body.classList.toggle("admin-dark", dark);
  $("theme").setAttribute("aria-pressed", String(dark));
  $("theme").setAttribute("aria-label", dark ? "Activer le mode clair" : "Activer le mode sombre");
  $("theme").title = dark ? "Mode clair" : "Mode sombre";
  $("theme-moon").hidden = dark;
  $("theme-sun").hidden = !dark;
}
try { theme(localStorage.getItem("restaurant-admin-theme") === "dark"); } catch { theme(false); }
$("theme").addEventListener("click", () => {
  const dark = !document.body.classList.contains("admin-dark");
  theme(dark);
  try { localStorage.setItem("restaurant-admin-theme", dark ? "dark" : "light"); } catch { /* Préférence facultative. */ }
});
async function initialize() {
  try {
    const { data: user } = await api.profile();
    currentUser = user;
    function updateIdentity(updated) {
      $("identity").textContent = updated.name;
      renderSidebarProfile(updated);
      document.querySelectorAll('[data-section="dashboard"], [data-section="reservations"], [data-section="users"]').forEach((link) => { link.hidden = !updated.is_admin; });
      document.querySelectorAll('[data-section="client"]').forEach((link) => { link.hidden = updated.is_admin; });
      $("global-search").hidden = !updated.is_admin;
      if (!updated.is_admin) {
        searchVersion++;
        $("global-results").hidden = true;
        $("global-users").replaceChildren();
        $("global-reservations").replaceChildren();
        section();
      }
    }
    updateIdentity(user);
    accounts = mountAccounts({ api, currentUser, onIdentity: updateIdentity, onSessionError: handleError });
    client = mountClient({ api, user: currentUser, onSessionError: handleError });
    $("logout").disabled = false;
    $("global-search").querySelectorAll("input, button").forEach((control) => { control.disabled = !user.is_admin; });
    $("private").hidden = false;
    try {
      if (sessionStorage.getItem("auth-success")) {
        sessionStorage.removeItem("auth-success");
        showToast(user.is_admin ? "Connexion réussie. Bienvenue dans votre espace administrateur." : "Connexion réussie. Bienvenue dans votre espace personnel.", "success");
      }
    } catch { /* Notification facultative. */ }
    section();
    if (user.is_admin) {
      await api.me();
      await Promise.allSettled([load(), loadStats()]);
    }
  } catch (error) { handleError(error); }
}
initialize();
