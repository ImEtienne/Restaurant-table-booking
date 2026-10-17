import { showToast } from "../scripts/toast.js";
import { statusLabels } from "./reservationTable.mjs";
import { canChangeReservation, clientReservationPayload } from "./client-rules.mjs";
import { validateReservation } from "../scripts/reservation-validation.mjs";
import { placeholderFor } from "../scripts/placeholders.mjs";

export function mountClient({ api, user, onSessionError }) {
  const root = document.getElementById("admin-client");
  let version = 0;
  let page = 1;
  let saving = false;
  let timezone = "Europe/Paris";
  const node = (tag, text, parent = root) => {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    parent.append(el); return el;
  };
  const button = (text, parent, fn) => {
    const el = node("button", text, parent); el.type = "button"; el.addEventListener("click", fn); return el;
  };
  function failure(error, target) {
    const message = error.code === "ACCOUNT_PENDING_APPROVAL" || error.status === 403 ? "Votre compte n’est pas actif ou vous n’avez pas accès à cette action. Contactez le restaurant." : error.status === 409 ? "Cette réservation ne peut plus être modifiée : elle a été traitée, annulée ou sa date est passée." : error.status === 429 ? "Trop de tentatives. Patientez une minute." : error.message;
    target.textContent = message; showToast(message);
    if ([401, 419].includes(error.status)) onSessionError(error);
  }
  function formFields(form, definitions, initial = {}) {
    const fields = {}, errors = {};
    for (const [name, label, type] of definitions) {
      const group = node("div", null, form);
      const id = `client-${name}`;
      const caption = node("label", label, group); caption.htmlFor = id;
      const input = node("input", null, group); input.type = type; input.id = id; input.name = name; input.value = initial[name] ?? "";
      input.placeholder = placeholderFor(name, type);
      if (name === "registration_token") { input.autocomplete = "off"; input.maxLength = 64; }
      const error = node("small", "", group); error.className = "admin-field-error"; error.id = `${id}-error`;
      input.setAttribute("aria-describedby", error.id); fields[name] = input; errors[name] = error;
    }
    return { fields, display(messages) {
      for (const name of Object.keys(fields)) {
        errors[name].textContent = Array.isArray(messages[name]) ? messages[name].join(" ") : messages[name] || "";
        fields[name].setAttribute("aria-invalid", String(Boolean(messages[name])));
      }
      const first = Object.keys(messages).find((name) => fields[name]);
      if (first) fields[first].focus();
    }, values: () => Object.fromEntries(Object.entries(fields).map(([name, input]) => [name, input.value])) };
  }
  async function editor(reservation = null) {
    const token = ++version;
    root.replaceChildren();
    node("h2", reservation ? `Réservation n° ${reservation.id}` : "Nouvelle réservation");
    if (reservation) node("p", `Statut : ${statusLabels[reservation.status] || reservation.status}`);
    const editable = !reservation || canChangeReservation(reservation, new Date(), timezone);
    if (!editable) node("p", "Cette réservation n’est plus modifiable en ligne. Contactez le restaurant pour toute demande.");
    const form = node("form"); form.className = "admin-account-form"; form.noValidate = true;
    const state = formFields(form, [["name", "Nom", "text"], ["phone", "Téléphone", "tel"], ["date", "Date", "date"], ["time", `Heure (${timezone})`, "time"], ["guests", "Nombre de personnes (1 à 10)", "number"]], reservation ? { ...reservation, time: reservation.time.slice(0, 5) } : { name: user.name, guests: 2 });
    Object.values(state.fields).forEach((input) => { input.disabled = !editable; });
    const notice = node("p", "", form); notice.setAttribute("role", "status");
    const submit = node("button", reservation ? "Enregistrer" : "Envoyer ma demande", form); submit.type = "submit"; submit.disabled = !editable;
    button("Retour à mes réservations", form, () => { if (!saving) activate(); });
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); if (saving || !editable) return;
      const data = clientReservationPayload(state.values());
      const today = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const validation = validateReservation({ ...data, email: user.email }, today); state.display(validation.errors);
      if (!validation.valid) return;
      saving = true; submit.disabled = true; form.setAttribute("aria-busy", "true"); notice.textContent = "Enregistrement…";
      try {
        if (reservation) await api.updateClientReservation(reservation.id, data);
        else await api.createClientReservation(data);
        showToast("Demande enregistrée, en attente de confirmation.", "success");
        if (version === token) await activate();
      } catch (error) { if (version === token) { state.display(error.errors || {}); failure(error, notice); } }
      finally { saving = false; submit.disabled = !editable; form.setAttribute("aria-busy", "false"); }
    });
  }
  async function activate() {
    const token = ++version;
    root.replaceChildren();
    node("h2", "Mes réservations");
    const notice = node("p", "Chargement de votre espace…"); notice.setAttribute("role", "status");
    if (user.is_active === false) { notice.textContent = "Votre compte attend son activation par le restaurant."; return; }
    try {
      const results = await Promise.allSettled([api.clientReservations(page), api.clientStats()]);
      if (version !== token) return;
      const failed = results.find((result) => result.status === "rejected"); if (failed) throw failed.reason;
      const [list, stats] = results.map((result) => result.value);
      timezone = stats.meta?.timezone || "Europe/Paris";
      notice.textContent = "Seules les demandes en attente et à venir sont modifiables ou annulables.";
      const cards = node("div"); cards.className = "admin-stats";
      for (const [key, label] of [["total_reservations", "Réservations"], ["upcoming", "À venir"], ["pending", "En attente"], ["confirmed", "Confirmées"], ["rejected", "Refusées"], ["cancelled", "Annulées"], ["total_guests", "Personnes demandées, tous statuts"]]) {
        const card = node("article", null, cards); card.className = "admin-card"; node("h3", label, card); node("strong", String(stats.data[key] ?? 0), card);
      }
      button("Nouvelle réservation", root, () => editor());
      const wrap = node("div"); wrap.className = "admin-table-wrap";
      const table = node("table", null, wrap); const head = node("tr", null, node("thead", null, table));
      for (const label of ["Réservation", "Date / heure", "Personnes", "Statut", "Actions"]) { const th = node("th", label, head); th.scope = "col"; }
      const body = node("tbody", null, table);
      for (const item of list.data) {
        const row = node("tr", null, body);
        for (const text of [`#${item.id} · ${item.name}`, `${item.date} · ${item.time}`, String(item.guests), statusLabels[item.status] || item.status]) node("td", text, row);
        const actions = node("td", null, row);
        button("Voir / Modifier", actions, async () => {
          try { const result = await api.clientReservation(item.id); if (version === token) editor(result.data); }
          catch (error) { failure(error, notice); }
        });
        if (canChangeReservation(item, new Date(), timezone)) button("Annuler", actions, async () => {
          if (saving || !window.confirm(`Annuler la réservation n° ${item.id} ?`)) return;
          saving = true;
          try { await api.cancelClientReservation(item.id); showToast("Réservation annulée.", "success"); if (version === token) await activate(); }
          catch (error) { failure(error, notice); if (error.status === 409 && version === token) await activate(); }
          finally { saving = false; }
        });
      }
      if (!list.data.length) node("p", "Vous n’avez aucune réservation rattachée à ce compte.");
      const nav = node("nav"); nav.className = "admin-pagination";
      button("Précédent", nav, () => { page--; activate(); }).disabled = list.meta.current_page <= 1;
      node("span", `Page ${list.meta.current_page} sur ${list.meta.last_page}`, nav);
      button("Suivant", nav, () => { page++; activate(); }).disabled = list.meta.current_page >= list.meta.last_page;
      const claim = node("form"); claim.className = "admin-account-form"; claim.noValidate = true;
      node("h3", "Retrouver une réservation publique", claim);
      node("p", "Utilisez sa clé confidentielle (valable 7 jours, un seul usage). L’email doit correspondre à votre compte.", claim);
      const state = formFields(claim, [["registration_token", "Clé confidentielle", "password"]]);
      const feedback = node("p", "", claim); feedback.setAttribute("role", "status");
      const submit = node("button", "Rattacher ma réservation", claim); submit.type = "submit";
      claim.addEventListener("submit", async (event) => {
        event.preventDefault(); if (saving) return;
        const key = state.values().registration_token.trim();
        if (key.length !== 64) { state.display({ registration_token: "La clé doit contenir 64 caractères." }); return; }
        saving = true; submit.disabled = true;
        try { await api.claimReservation(key); state.fields.registration_token.value = ""; showToast("Réservation rattachée à votre compte.", "success"); if (version === token) { page = 1; await activate(); } }
        catch (error) { state.display(error.errors || {}); failure(error.status === 404 ? { message: "Clé invalide, expirée, déjà utilisée ou email différent de votre compte." } : error, feedback); }
        finally { saving = false; submit.disabled = false; }
      });
    } catch (error) { if (version === token) failure(error, notice); }
  }
  return { activate, deactivate() { version++; } };
}
