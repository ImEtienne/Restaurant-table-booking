import { showToast } from "../scripts/toast.js";
import { confirmDialog } from "../scripts/confirm-dialog.js";
import { exceptionPayload, schedulePayload } from "./service-rules.mjs";

const DAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const HOUR_FIELDS = [
  ["opens_at", "Ouverture", "time"],
  ["closes_at", "Dernière heure de réservation", "time"],
  ["slot_interval_minutes", "Intervalle entre créneaux (minutes)", "number", { min: 5, max: 240 }],
  ["duration_minutes", "Durée d’occupation de la table (minutes)", "number", { min: 15, max: 480 }],
  ["capacity_guests", "Capacité simultanée (convives)", "number", { min: 1, max: 500 }],
];

export function mountServices({ api, onSessionError }) {
  const root = document.getElementById("admin-services");
  let version = 0;
  let saving = false;

  const node = (tag, text, parent = root) => {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    parent.append(el);
    return el;
  };
  const button = (text, parent, action) => {
    const el = node("button", text, parent);
    el.type = "button";
    el.addEventListener("click", action);
    return el;
  };
  const time = (value) => String(value ?? "").slice(0, 5);

  function fail(error, target) {
    const messages = Object.values(error.errors || {}).flat();
    const message = error.status === 409
      ? "Des réservations à venir utilisent encore ce service : il ne peut pas être supprimé."
      : messages.join(" ") || error.message;
    target.textContent = message;
    showToast(message);
    if ([401, 403, 419].includes(error.status)) onSessionError(error);
  }

  function buildForm(parent, definitions, initial) {
    const form = node("form", null, parent);
    form.className = "admin-account-form";
    form.noValidate = true;
    const inputs = {};
    const errors = {};
    for (const [name, label, type, extra = {}] of definitions) {
      const group = node("div", null, form);
      const id = `services-${parent.id}-${name}`;
      node("label", label, group).htmlFor = id;
      let input;
      if (type === "select") {
        input = node("select", null, group);
        for (const [value, text] of extra.options) input.append(new Option(text, value));
      } else {
        input = node("input", null, group);
        input.type = type;
        if (extra.min != null) input.min = extra.min;
        if (extra.max != null) input.max = extra.max;
      }
      input.id = id;
      input.name = name;
      if (type === "checkbox") input.checked = Boolean(initial[name]);
      else input.value = initial[name] ?? extra.default ?? "";
      if (extra.disabled) input.disabled = true;
      if (extra.placeholder) input.placeholder = extra.placeholder;
      const error = node("small", "", group);
      error.className = "admin-field-error";
      error.id = `${id}-error`;
      input.setAttribute("aria-describedby", error.id);
      inputs[name] = input;
      errors[name] = error;
    }
    return {
      form,
      inputs,
      values: () => Object.fromEntries(Object.entries(inputs).map(([name, input]) => [name, input.type === "checkbox" ? input.checked : input.value])),
      display(messages) {
        for (const name of Object.keys(inputs)) {
          errors[name].textContent = [].concat(messages[name] || []).join(" ");
          inputs[name].setAttribute("aria-invalid", String(Boolean(messages[name])));
        }
      },
    };
  }

  function table(parent, headers) {
    const wrap = node("div", null, parent);
    wrap.className = "admin-table-wrap";
    const tableEl = node("table", null, wrap);
    const row = node("tr", null, node("thead", null, tableEl));
    for (const label of headers) node("th", label, row).scope = "col";
    return node("tbody", null, tableEl);
  }

  function addRow(body, headers, cells) {
    const row = node("tr", null, body);
    cells.forEach((text, index) => {
      const cell = node("td", null, row);
      cell.dataset.label = headers[index];
      if (typeof text === "function") text(cell);
      else cell.textContent = text;
    });
  }

  async function submit(form, notice, action, success) {
    if (saving) return;
    saving = true;
    const submitButton = form.form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    notice.textContent = "Enregistrement…";
    try {
      await action();
      showToast(success, "success");
      await activate();
    } catch (error) {
      form.display(error.errors || {});
      fail(error, notice);
    } finally {
      saving = false;
      submitButton.disabled = false;
    }
  }

  async function remove(label, action) {
    if (saving) return;
    const accepted = await confirmDialog({ title: "Confirmer la suppression", message: label, confirmLabel: "Supprimer" });
    if (!accepted) return;
    saving = true;
    try {
      await action();
      showToast("Suppression effectuée.", "success");
    } catch (error) {
      const notice = document.getElementById("services-notice");
      fail(error, notice || document.createElement("p"));
    } finally {
      saving = false;
    }
    await activate();
  }

  let closeMenu = null;
  document.addEventListener("click", () => closeMenu?.());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu?.();
  });
  window.addEventListener("scroll", () => closeMenu?.(), true);

  function actionMenu(cell, label, actions) {
    const toggle = button("⋮", cell, () => {});
    toggle.className = "admin-kebab";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("aria-haspopup", "menu");
    toggle.setAttribute("aria-expanded", "false");
    const menu = node("div", null, cell);
    menu.className = "admin-dropdown";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    for (const [text, action, danger] of actions) {
      const item = button(text, menu, () => {
        closeMenu?.();
        action();
      });
      item.setAttribute("role", "menuitem");
      if (danger) item.className = "is-danger";
    }
    const hide = () => {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (closeMenu === hide) closeMenu = null;
    };
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const wasOpen = !menu.hidden;
      closeMenu?.();
      if (wasOpen) return;
      menu.hidden = false;
      const rect = toggle.getBoundingClientRect();
      const height = menu.offsetHeight;
      const below = rect.bottom + 4 + height <= window.innerHeight;
      menu.style.top = `${below ? rect.bottom + 4 : rect.top - height - 4}px`;
      menu.style.left = `${Math.max(8, rect.right - menu.offsetWidth)}px`;
      toggle.setAttribute("aria-expanded", "true");
      closeMenu = hide;
      menu.querySelector("button").focus();
    });
  }

  function openModal(title, id, build) {
    const dialog = node("dialog");
    dialog.className = "admin-modal";
    dialog.setAttribute("aria-labelledby", `${id}-title`);
    const head = node("div", null, dialog);
    head.className = "admin-modal-head";
    node("h3", title, head).id = `${id}-title`;
    const close = button("×", head, () => dialog.close());
    close.setAttribute("aria-label", "Fermer");
    const wrap = node("div", null, dialog);
    wrap.id = id;
    build(wrap, () => dialog.close());
    dialog.addEventListener("close", () => dialog.remove());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.showModal();
  }

  function panelHead(section, title, addLabel, onAdd) {
    const head = node("div", null, section);
    head.className = "admin-panel-head";
    node("h3", title, head);
    const add = button(addLabel, head, onAdd);
    add.className = "admin-add-button";
  }

  function scheduleSection(schedules) {
    const section = node("section", null, grid);
    section.id = "schedules";
    panelHead(section, "Services hebdomadaires", "+ Ajouter un service", () => scheduleModal(null));
    const headers = ["Jour", "Service", "Horaires", "Créneaux", "Durée", "Capacité", "Actions"];
    const body = table(section, headers);
    for (const item of schedules) {
      addRow(body, headers, [
        DAYS[item.day_of_week] || String(item.day_of_week),
        `${item.service_name} (${item.service_key})`,
        `${time(item.opens_at)} – ${time(item.closes_at)}`,
        `${item.slot_interval_minutes} min`,
        `${item.duration_minutes} min`,
        `${item.capacity_guests} couverts`,
        (cell) => {
          actionMenu(cell, `Actions pour ${item.service_name} (${DAYS[item.day_of_week]})`, [
            ["Modifier", () => scheduleModal(item)],
            ["Supprimer", () => remove(`Supprimer le service « ${item.service_name} » du ${DAYS[item.day_of_week].toLowerCase()} ?`, () => api.deleteServiceSchedule(item.id)), true],
          ]);
        },
      ]);
    }
    if (!schedules.length) node("p", "Aucun service configuré : aucune réservation ne peut être acceptée tant qu’un service n’existe pas.", section);

  }

  function scheduleModal(edited) {
    const title = edited ? `Modifier « ${edited.service_name} » (${DAYS[edited.day_of_week]})` : "Ajouter un service";
    openModal(title, "schedule-form", (wrap, closeModal) => {
    const form = buildForm(wrap, [
      ["service_key", "Identifiant du service (minuscules, chiffres, - ou _)", "text", { disabled: Boolean(edited), placeholder: "Ex. dinner" }],
      ["service_name", "Nom affiché", "text", { placeholder: "Ex. Dîner" }],
      ["day_of_week", "Jour", "select", { disabled: Boolean(edited), options: DAYS.slice(1).map((name, index) => [String(index + 1), name]) }],
      ...HOUR_FIELDS,
    ], edited ? { ...edited, day_of_week: String(edited.day_of_week), opens_at: time(edited.opens_at), closes_at: time(edited.closes_at) } : {});
    const notice = node("p", "", form.form);
    notice.setAttribute("role", "status");
    notice.id = "services-notice";
    node("button", edited ? "Enregistrer" : "Ajouter le service", form.form).type = "submit";
    button("Annuler", form.form, closeModal);
    form.form.addEventListener("submit", (event) => {
      event.preventDefault();
      const body = schedulePayload(form.values(), { creating: !edited });
      return submit(form, notice, () => (edited ? api.updateServiceSchedule(edited.id, body) : api.createServiceSchedule(body)), edited ? "Service mis à jour." : "Service ajouté.");
    });
    });
  }

  function exceptionSection(exceptions) {
    const section = node("section", null, grid);
    section.id = "exceptions";
    panelHead(section, "Exceptions de calendrier", "+ Ajouter une exception", () => exceptionModal(null));
    const headers = ["Service", "Période", "Régime", "Actions"];
    const body = table(section, headers);
    for (const item of exceptions) {
      addRow(body, headers, [
        item.service_key === "*" ? "Tout le restaurant" : `${item.service_name || item.service_key} (${item.service_key})`,
        item.start_date === item.end_date ? item.start_date : `${item.start_date} → ${item.end_date}`,
        item.is_closed ? "Fermé" : `${time(item.opens_at)} – ${time(item.closes_at)} · ${item.capacity_guests} couverts`,
        (cell) => {
          actionMenu(cell, `Actions pour l’exception du ${item.start_date}`, [
            ["Modifier", () => exceptionModal(item)],
            ["Supprimer", () => remove(`Supprimer l’exception du ${item.start_date} au ${item.end_date} ?`, () => api.deleteServiceException(item.id)), true],
          ]);
        },
      ]);
    }
    if (!exceptions.length) node("p", "Aucune exception de calendrier.", section);

  }

  function exceptionModal(edited) {
    openModal(edited ? "Modifier cette exception" : "Ajouter une exception", "exception-form", (wrap, closeModal) => {
    const form = buildForm(wrap, [
      ["service_key", "Service concerné (* = tout le restaurant)", "text", { disabled: Boolean(edited), default: "*", placeholder: "* ou dinner" }],
      ["start_date", "Date de début", "date"],
      ["end_date", "Date de fin", "date"],
      ["is_closed", "Fermeture (aucune réservation sur la période)", "checkbox"],
      ["service_name", "Nom affiché (horaires exceptionnels)", "text"],
      ...HOUR_FIELDS,
    ], edited ? { ...edited, opens_at: time(edited.opens_at), closes_at: time(edited.closes_at) } : { is_closed: true });
    const toggleHours = () => {
      const closed = form.inputs.is_closed.checked;
      for (const name of ["service_name", ...HOUR_FIELDS.map(([field]) => field)]) form.inputs[name].closest("div").hidden = closed;
    };
    form.inputs.is_closed.addEventListener("change", toggleHours);
    toggleHours();
    const notice = node("p", "", form.form);
    notice.setAttribute("role", "status");
    node("button", edited ? "Enregistrer" : "Ajouter l’exception", form.form).type = "submit";
    button("Annuler", form.form, closeModal);
    form.form.addEventListener("submit", (event) => {
      event.preventDefault();
      const body = exceptionPayload(form.values(), { creating: !edited });
      return submit(form, notice, () => (edited ? api.updateServiceException(edited.id, body) : api.createServiceException(body)), edited ? "Exception mise à jour." : "Exception ajoutée.");
    });
    });
  }

  let grid = root;

  async function activate() {
    const token = ++version;
    root.hidden = false;
    root.replaceChildren();
    node("h2", "Services et horaires");
    node("p", "Les créneaux proposés aux clients dépendent de ces services, des exceptions de calendrier et de la capacité restante.");
    const loading = node("p", "Chargement des services…");
    loading.setAttribute("role", "status");
    try {
      const [schedules, exceptions] = await Promise.all([api.serviceSchedules(), api.serviceExceptions()]);
      if (version !== token) return;
      loading.remove();
      grid = node("div");
      grid.className = "admin-services-grid";
      scheduleSection(schedules.data ?? []);
      exceptionSection(exceptions.data ?? []);
    } catch (error) {
      if (version === token) fail(error, loading);
    }
  }

  return {
    activate,
    deactivate() {
      version++;
      root.replaceChildren();
    },
  };
}
