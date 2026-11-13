import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { getTodayLocalDate, validateReservation } from "../src/scripts/reservation-validation.mjs";
import { ReservationServiceError } from "../src/services/reservationService.mjs";

const source = (await readFile(new URL("../src/scripts/reservation.js", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "");

function harness({ getAvailability = async () => [], createReservation = async () => ({}) } = {}) {
  class Input {
    constructor(name, value = "") {
      this.name = name;
      this.value = value;
      this.listeners = {};
      this.disabled = false;
    }
    addEventListener(type, listener) { this.listeners[type] = listener; }
  }
  class Select extends Input {
    replaceChildren(...children) { this.children = children; }
  }
  class Option {
    constructor(textContent, value) { this.textContent = textContent; this.value = value; }
  }

  const date = new Input("date", getTodayLocalDate());
  const guests = new Input("personnes", "2");
  const time = new Select("heure", "dinner|19:30");
  const fields = {
    nom: new Input("nom", "Ada Lovelace"),
    email: new Input("email", "ada@example.com"),
    telephone: new Input("telephone", "+33123456789"),
    date,
    personnes: guests,
    heure: time,
  };
  const submitButton = { disabled: false };
  const form = {
    elements: { namedItem: (name) => ({ date, personnes: guests, heure: time })[name] },
    listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    querySelector: () => submitButton,
    reportValidity: () => true,
    reset() { this.wasReset = true; },
  };
  const status = { textContent: "", after() {} };
  const timeHelp = { textContent: "" };
  const document = {
    querySelector: (selector) => selector === "#reservation-form" ? form : status,
    getElementById: (id) => id === "heure-help" ? timeHelp : null,
    createElement: () => ({ append() {}, replaceChildren() {}, addEventListener() {}, setAttribute() {} }),
  };
  const context = {
    document,
    HTMLInputElement: Input,
    HTMLSelectElement: Select,
    Option,
    FormData: class {
      constructor() {}
      [Symbol.iterator]() { return Object.entries(fields).map(([key, field]) => [key, field.value])[Symbol.iterator](); }
    },
    getTodayLocalDate,
    validateReservation,
    getAvailability,
    createReservation,
    ReservationServiceError,
    parseSlotValue: (value) => {
      const [serviceKey = "", slotTime = ""] = String(value).split("|");
      return { serviceKey, time: slotTime };
    },
    renderSlotOptions(select, slots) {
      const options = slots.map((slot) => ({ value: `${slot.service_key}|${slot.time}`, textContent: slot.time }));
      select.replaceChildren({ value: "", textContent: options.length ? "Choisissez un créneau" : "Aucun créneau disponible" }, ...options);
      select.disabled = options.length === 0;
    },
    mountReservationKeyCopy() {},
  };

  vm.runInNewContext(source, context);
  return { date, fields, form, guests, status, submitButton, time, timeHelp };
}

for (const error of [
  new Error("Network unavailable"),
  new ReservationServiceError("API indisponible", { code: "HTTP_ERROR", status: 503 }),
]) {
  test(`availability failure is not presented as an empty day (${error.message})`, async () => {
    const h = harness({ getAvailability: async () => { throw error; } });

    await h.date.listeners.change();

    assert.equal(h.time.disabled, true);
    assert.equal(h.time.children[0].textContent, "Créneaux indisponibles");
    assert.match(h.timeHelp.textContent, /Impossible de charger les créneaux/);
    assert.doesNotMatch(h.timeHelp.textContent, /Aucun créneau n’est disponible/);
  });
}

test("reservation network failure keeps entered fields and allows retry", async () => {
  const h = harness({ createReservation: async () => { throw new Error("Network unavailable"); } });

  await h.form.listeners.submit({ preventDefault() {} });

  assert.equal(h.form.wasReset, undefined);
  assert.equal(h.fields.nom.value, "Ada Lovelace");
  assert.match(h.status.textContent, /Aucune confirmation reçue/);
  assert.equal(h.submitButton.disabled, false);
});
