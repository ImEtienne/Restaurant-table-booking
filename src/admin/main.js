import "../styles/admin.css";
import { createAdminService } from "../services/adminService.mjs";
import { renderReservations } from "./reservationTable.mjs";
import { renderMetrics, validatePeriod } from "./statistics.mjs";
import { showToast } from "../scripts/toast.js";

const api = createAdminService();
const $ = (id) => document.getElementById(`admin-${id}`);
let page = 1;
let lastPage = 1;
let busy = false;
let filters = {};
let period = {};
let statsBusy = false;

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
    for (const [id, key] of Object.entries({ total: "total_reservations", pending: "pending", confirmed: "confirmed", rejected: "rejected", guests: "total_guests", "confirmed-guests": "confirmed_guests", average: "average_party_size", rate: "confirmation_rate" })) {
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
    renderReservations($("rows"), result.data);
    lastPage = result.meta.last_page;
    page = result.meta.current_page;
    $("page-number").textContent = `Page ${page} sur ${lastPage} · ${result.meta.total} réservation(s)`;
    $("notice").textContent = "";
  } catch (error) {
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
$("logout").addEventListener("click", async () => {
  $("logout").disabled = true;
  try { await api.logout(); location.replace("/login.html"); }
  catch (error) { handleError(error); $("logout").disabled = false; }
});
$("menu").addEventListener("click", () => {
  const open = document.body.classList.toggle("admin-menu-open");
  $("menu").setAttribute("aria-expanded", String(open));
});
function section() {
  const reservations = location.hash === "#reservations";
  $("statistics").hidden = reservations;
  $("title").textContent = reservations ? "Réservations" : "Tableau de bord";
  document.querySelectorAll("[data-section]").forEach((link) => {
    if (link.dataset.section === (reservations ? "reservations" : "dashboard")) link.setAttribute("aria-current", "page");
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
  $("theme").textContent = dark ? "Mode clair" : "Mode sombre";
}
try { theme(localStorage.getItem("restaurant-admin-theme") === "dark"); } catch { theme(false); }
$("theme").addEventListener("click", () => {
  const dark = !document.body.classList.contains("admin-dark");
  theme(dark);
  try { localStorage.setItem("restaurant-admin-theme", dark ? "dark" : "light"); } catch { /* Préférence facultative. */ }
});
async function initialize() {
  try {
    const { data: user } = await api.me();
    if (!user.is_admin) { location.replace("/login.html"); return; }
    $("identity").textContent = user.name;
    $("logout").disabled = false;
    $("private").hidden = false;
    try {
      if (sessionStorage.getItem("auth-success")) {
        sessionStorage.removeItem("auth-success");
        showToast("Connexion réussie. Bienvenue dans votre espace administrateur.", "success");
      }
    } catch { /* Notification facultative. */ }
    await Promise.allSettled([load(), loadStats()]);
  } catch (error) { handleError(error); }
}
initialize();
