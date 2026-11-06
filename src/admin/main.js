import { createAdminService } from "../services/adminService.mjs";
import { renderReservations } from "./reservationTable.mjs";
import { renderStackedBars, renderAreaChart, renderSparkline, kpiSeries, trendOf, formatTrend, kpiTone, renderDonut, renderLegend, recentReservations, renderCalendarDay, isoDate, shiftDate } from "./statistics.mjs";
import { statusLabels } from "./reservationTable.mjs";
import { animateCards, animateCharts, animateSection, animateTitle, countUp, mountChartInteractions } from "./chartMotion.mjs";
import { showToast } from "../scripts/toast.js";
import { searchReservations } from "./search.mjs";
import { sortReservations } from "./sort.mjs";
import { mountFiltersToggle } from "./mobileFilters.mjs";
import { mountAccounts } from "./accounts.js";
import { mountClient } from "./client.js";
import { mountServices } from "./services.js";
import { applyPlaceholders } from "../scripts/placeholders.mjs";
import { renderSidebarProfile, mountProfileMenu } from "./sidebarProfile.mjs";
import { mountMobileMenu } from "./mobileMenu.mjs";
import { mountTableLabels } from "./tableLabels.mjs";
import { mountStatsScroller } from "./statsScroller.mjs";
import { mountSearchToggle } from "./searchToggle.mjs";
import { mountNotifications } from "./notifications.mjs";
import { greetingFor } from "./greeting.mjs";
applyPlaceholders();

const api = createAdminService();
const $ = (id) => document.getElementById(`admin-${id}`);
let page = 1;
let lastPage = 1;
let busy = false;
let filters = {};
let calendarStart = isoDate(new Date());
let calendarRun = 0;
let statsBusy = false;
let cardsAnimated = false;
let currentUser = null;
let greeting = null;
let accounts = null;
let client = null;
let services = null;
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
  const matches = sortReservations(searchReservations(currentReservations, $("search").value), $("sort").value);
  renderReservations($("rows"), matches);
  $("search-count").textContent = $("search").value.trim()
    ? `${matches.length} résultat(s) sur ${currentReservations.length} réservation(s) de cette page.` : "";
}
$("search").addEventListener("input", renderSearch);
$("sort").addEventListener("change", renderSearch);
mountFiltersToggle();

const dayLabel = (value, long = false) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value).slice(5);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", ...(long ? { year: "numeric" } : {}), timeZone: "UTC" }).format(date);
};

function renderKpiTrends(daily) {
  const series = kpiSeries(daily);
  for (const [id, values] of Object.entries(series)) {
    const trend = trendOf(values, id === "rate" ? "avg" : "sum");
    const tone = kpiTone(trend, id === "pending");
    $(`${id}-spark`).innerHTML = renderSparkline(values, tone);
    const badge = $(`${id}-trend`);
    badge.textContent = formatTrend(trend);
    badge.className = `kpi-trend is-${tone}`;
    badge.hidden = !trend;
  }
}

async function loadActivity(pending) {
  const link = $("todo-link");
  link.textContent = pending > 0 ? `${pending} en attente →` : "Voir tout";
  try {
    const result = await api.reservations({ page: 1 });
    const items = recentReservations(result.data).map((reservation) => {
      const item = document.createElement("li");
      const text = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = reservation.name;
      const meta = document.createElement("small");
      meta.textContent = `${reservation.guests} pers. · ${reservation.date} à ${reservation.time}`;
      text.append(name, meta);
      const badge = document.createElement("span");
      badge.className = `admin-badge ${Object.hasOwn(statusLabels, reservation.status) ? reservation.status : ""}`;
      badge.textContent = statusLabels[reservation.status] || "Inconnu";
      item.append(text, badge);
      return item;
    });
    $("activity").replaceChildren(...items);
    if (!items.length) $("activity").textContent = "Aucune réservation pour le moment.";
  } catch {
    $("activity").replaceChildren();
  }
}

async function loadStats() {
  if (statsBusy) return;
  statsBusy = true;
  $("statistics").setAttribute("aria-busy", "true");
  $("stats-notice").textContent = "Chargement des statistiques…";
  try {
    const results = await Promise.allSettled([api.stats(), api.dailyStats(), api.hourlyStats()]);
    const failed = results.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
    const [summary, daily, hourly] = results.map((result) => result.value);
    for (const [id, key] of Object.entries({ total: "total_reservations", pending: "pending", confirmed: "confirmed", "confirmed-guests": "confirmed_guests", rate: "confirmation_rate" })) {
      const suffix = id === "rate" ? " %" : "";
      $(id).textContent = `${new Intl.NumberFormat("fr-FR").format(summary.data[key])}${suffix}`;
      countUp($(id), summary.data[key], suffix);
    }
    $("daily").innerHTML = renderAreaChart(daily.data, "date", (value) => dayLabel(value), (value) => dayLabel(value, true));
    $("daily-range").textContent = `${dayLabel(summary.meta.start_date, true)} – ${dayLabel(summary.meta.end_date, true)}`;
    $("hourly").innerHTML = renderStackedBars(hourly.data, "hour", (value) => String(value).slice(0, 5), { width: 360 });
    renderKpiTrends(daily.data);
    $("donut").innerHTML = renderDonut(summary.data) || "<p>Aucune donnée sur la période.</p>";
    $("legend").replaceChildren(renderLegend(summary.data));
    animateCharts($("statistics"));
    if (!cardsAnimated) { cardsAnimated = true; animateCards($("statistics")); }
    $("stats-notice").textContent = "";
    loadActivity(summary.data.pending);
  } catch (error) {
    $("stats").querySelectorAll("strong").forEach((node) => { node.textContent = "—"; });
    $("stats").querySelectorAll(".kpi-spark").forEach((node) => node.replaceChildren());
    $("stats").querySelectorAll(".kpi-trend").forEach((node) => { node.hidden = true; });
    $("daily-range").textContent = "";
    $("daily").replaceChildren();
    $("hourly").replaceChildren();
    $("donut").replaceChildren();
    $("legend").replaceChildren();
    $("stats-notice").textContent = error.message;
    if ([401, 403, 419].includes(error.status)) handleError(error);
  } finally {
    statsBusy = false;
    $("statistics").setAttribute("aria-busy", "false");
  }
}

const calendarLabel = (value) => {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  const text = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

async function loadCalendar() {
  const run = ++calendarRun;
  const days = [calendarStart, shiftDate(calendarStart, 1)];
  try {
    const results = await Promise.all(days.map((date) => api.reservations({ date, page: 1 })));
    if (run !== calendarRun) return;
    $("calendar-days").innerHTML = results.map((result, index) => renderCalendarDay(days[index], result.data, result.meta?.total ?? result.data.length, calendarLabel)).join("");
  } catch {
    if (run === calendarRun) $("calendar-days").textContent = "Calendrier indisponible.";
  }
}
$("cal-prev").addEventListener("click", () => { calendarStart = shiftDate(calendarStart, -2); loadCalendar(); });
$("cal-next").addEventListener("click", () => { calendarStart = shiftDate(calendarStart, 2); loadCalendar(); });
$("cal-today").addEventListener("click", () => { calendarStart = isoDate(new Date()); loadCalendar(); });

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
    await Promise.all([loadStats(), loadCalendar()]);
  }
  if (failure) handleError(failure);
  else $("notice").textContent = "Statut mis à jour. Aucun email n’a été envoyé.";
});
mountProfileMenu();
mountMobileMenu();
mountTableLabels();
mountStatsScroller();
mountSearchToggle();
mountNotifications();
mountChartInteractions($("statistics"));
$("logout").addEventListener("click", async () => {
  $("logout").disabled = true;
  try { await api.userLogout(); location.replace("/login.html"); }
  catch (error) { handleError(error); $("logout").disabled = false; }
});
let shownSection = null;
function section() {
  let selectedSection = location.hash.slice(1) || "dashboard";
  if (!["dashboard", "reservations", "users", "profile", "client", "services"].includes(selectedSection)) selectedSection = "dashboard";
  if (currentUser && !currentUser.is_admin && selectedSection !== "profile") selectedSection = "client";
  if (currentUser?.is_admin && selectedSection === "client") selectedSection = "dashboard";
  const accountSection = ["users", "profile"].includes(selectedSection);
  $("statistics").hidden = selectedSection !== "dashboard";
  $("caption").hidden = selectedSection === "dashboard";
  $("reservation-section").hidden = selectedSection !== "reservations";
  $("assignment-section").hidden = selectedSection !== "reservations";
  $("accounts").hidden = !accountSection;
  $("client").hidden = selectedSection !== "client";
  $("services").hidden = selectedSection !== "services";
  $("title").textContent = { dashboard: "Tableau de bord", reservations: "Réservations", users: "Utilisateurs", profile: "Mon profil", client: "Mes réservations", services: "Services et horaires" }[selectedSection];
  document.title = `${$("title").textContent} | Restaurant XYZ`;
  $("crumb-current").textContent = $("title").textContent;
  $("tagline").hidden = !(selectedSection === "dashboard" && greeting);
  $("export").hidden = $("tagline").hidden;
  if (selectedSection === "dashboard" && greeting) $("title").textContent = greeting;
  if (selectedSection !== shownSection) {
    const wasShown = shownSection !== null;
    shownSection = selectedSection;
    if (wasShown) {
      animateTitle($("title"));
      if (selectedSection === "dashboard") {
        if (cardsAnimated) { animateCards($("statistics")); animateCharts($("statistics")); }
      } else {
        animateSection({ reservations: $("reservation-section"), client: $("client"), services: $("services"), users: $("accounts"), profile: $("accounts") }[selectedSection]);
      }
    }
  }
  accounts?.activate(selectedSection);
  if (selectedSection === "client") client?.activate();
  else client?.deactivate();
  if (selectedSection === "services") services?.activate();
  else services?.deactivate();
  document.querySelectorAll("[data-section]").forEach((link) => {
    if (link.dataset.section === selectedSection) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
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
    try { greeting = user.is_admin ? greetingFor(user, localStorage) : null; } catch { greeting = null; }
    if (greeting && !$("statistics").hidden) { $("title").textContent = greeting; $("tagline").hidden = false; $("export").hidden = false; animateTitle($("title")); }
    function updateIdentity(updated) {
      $("identity").textContent = updated.name;
      renderSidebarProfile(updated);
      document.querySelectorAll('[data-section="dashboard"], [data-section="reservations"], [data-section="users"], [data-section="services"]').forEach((link) => { link.hidden = !updated.is_admin; });
      document.querySelectorAll('[data-section="client"]').forEach((link) => { link.hidden = updated.is_admin; });
      $("global-search").hidden = !updated.is_admin;
      $("search-toggle").hidden = !updated.is_admin;
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
    services = mountServices({ api, onSessionError: handleError });
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
      await Promise.allSettled([load(), loadStats(), loadCalendar()]);
    }
  } catch (error) { handleError(error); }
}
initialize();
