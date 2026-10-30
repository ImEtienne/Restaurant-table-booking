import assert from "node:assert/strict";
import test from "node:test";
import { getAvailability, ReservationServiceError } from "../src/services/reservationService.mjs";
import { createAdminService } from "../src/services/adminService.mjs";
import { parseSlotValue, renderSlotOptions, slotValue } from "../src/scripts/availability-slots.mjs";
import { exceptionPayload, schedulePayload } from "../src/admin/service-rules.mjs";

const slot = { service_key: "dinner", service_name: "Dîner", time: "19:30", duration_minutes: 90, capacity_guests: 40, remaining_capacity: 12 };

test("availability sends the date and guests and returns the slots", async () => {
  let request;
  const slots = await getAvailability({ date: "2027-10-15", guests: 2 }, {
    baseUrl: "http://localhost:8000/api/",
    fetchImpl: async (url, options) => {
      request = { url: new URL(url), options };
      return { ok: true, status: 200, json: async () => ({ data: [slot], meta: { date: "2027-10-15", timezone: "Europe/Paris" } }) };
    },
  });
  assert.equal(request.url.pathname, "/api/availability");
  assert.equal(request.url.searchParams.get("date"), "2027-10-15");
  assert.equal(request.url.searchParams.get("guests"), "2");
  assert.equal(request.options.method, undefined);
  assert.deepEqual(slots, [slot]);
});

test("availability omits guests when unknown and exposes validation errors", async () => {
  let url;
  await assert.rejects(
    getAvailability({ date: "2020-01-01" }, {
      baseUrl: "http://localhost:8000/api",
      fetchImpl: async (requested) => {
        url = new URL(requested);
        return { ok: false, status: 422, json: async () => ({ message: "Date passée", errors: { date: ["Date passée"] } }) };
      },
    }),
    (error) => error instanceof ReservationServiceError && error.code === "VALIDATION_FAILED" && error.validationErrors.date[0] === "Date passée",
  );
  assert.equal(url.searchParams.has("guests"), false);
});

test("slot values round-trip service key and time", () => {
  assert.equal(slotValue(slot), "dinner|19:30");
  assert.deepEqual(parseSlotValue("dinner|19:30"), { serviceKey: "dinner", time: "19:30" });
  assert.deepEqual(parseSlotValue(""), { serviceKey: "", time: "" });
});

test("slot options show the service only when several services are open", () => {
  const created = [];
  const doc = { createElement: () => { const option = { value: "", textContent: "" }; created.push(option); return option; } };
  const select = { disabled: true, replaceChildren(...items) { this.items = items; } };

  renderSlotOptions(select, [slot], doc);
  assert.deepEqual(select.items.map((item) => item.textContent), ["Choisissez un créneau", "19:30"]);
  assert.equal(select.disabled, false);

  renderSlotOptions(select, [slot, { ...slot, service_key: "lunch", service_name: "Déjeuner", time: "12:00" }], doc);
  assert.deepEqual(select.items.map((item) => item.textContent), ["Choisissez un créneau", "19:30 · Dîner", "12:00 · Déjeuner"]);

  renderSlotOptions(select, [], doc);
  assert.equal(select.items[0].textContent, "Aucun créneau disponible");
  assert.equal(select.disabled, true);
});

test("admin service schedules and exceptions use the documented routes with CSRF", async () => {
  const calls = [];
  const api = createAdminService({
    baseUrl: "http://localhost:8000/api",
    getCookie: () => "XSRF-TOKEN=abc",
    fetchImpl: async (url, options) => {
      calls.push({ path: new URL(url).pathname, method: options.method, csrf: options.headers["X-XSRF-TOKEN"], body: options.body });
      return { ok: true, status: options.method === "DELETE" ? 204 : 200, json: async () => ({ data: [] }) };
    },
  });
  await api.serviceSchedules();
  await api.createServiceSchedule({ service_key: "dinner" });
  await api.updateServiceSchedule(3, { service_name: "Dîner" });
  await api.deleteServiceSchedule(3);
  await api.serviceExceptions();
  await api.createServiceException({ service_key: "*" });
  await api.updateServiceException(4, { is_closed: true });
  await api.deleteServiceException(4);
  assert.deepEqual(calls.map(({ method, path }) => `${method} ${path}`), [
    "GET /api/admin/service-schedules",
    "POST /api/admin/service-schedules",
    "PUT /api/admin/service-schedules/3",
    "DELETE /api/admin/service-schedules/3",
    "GET /api/admin/service-exceptions",
    "POST /api/admin/service-exceptions",
    "PUT /api/admin/service-exceptions/4",
    "DELETE /api/admin/service-exceptions/4",
  ]);
  assert.deepEqual(calls.map(({ csrf }) => csrf), [undefined, "abc", "abc", "abc", undefined, "abc", "abc", "abc"]);
  assert.throws(() => api.deleteServiceSchedule(0));
});

test("schedule payload casts numbers and keeps key and day only on creation", () => {
  const values = { service_key: " dinner ", service_name: " Dîner ", day_of_week: "5", opens_at: "19:00", closes_at: "22:00", slot_interval_minutes: "30", duration_minutes: "90", capacity_guests: "40" };
  assert.deepEqual(schedulePayload(values, { creating: true }), { service_key: "dinner", service_name: "Dîner", day_of_week: 5, opens_at: "19:00", closes_at: "22:00", slot_interval_minutes: 30, duration_minutes: 90, capacity_guests: 40 });
  const update = schedulePayload(values, { creating: false });
  assert.equal("service_key" in update, false);
  assert.equal("day_of_week" in update, false);
});

test("exception payload sends hours only for non-closing exceptions", () => {
  const values = { service_key: "*", start_date: "2027-12-24", end_date: "2027-12-26", is_closed: true, service_name: "x", opens_at: "10:00", closes_at: "11:00", slot_interval_minutes: "30", duration_minutes: "60", capacity_guests: "10" };
  assert.deepEqual(exceptionPayload(values, { creating: true }), { service_key: "*", start_date: "2027-12-24", end_date: "2027-12-26", is_closed: true });
  const open = exceptionPayload({ ...values, service_key: "dinner", is_closed: false, service_name: " Brunch " }, { creating: false });
  assert.deepEqual(open, { start_date: "2027-12-24", end_date: "2027-12-26", is_closed: false, service_name: "Brunch", opens_at: "10:00", closes_at: "11:00", slot_interval_minutes: 30, duration_minutes: 60, capacity_guests: 10 });
});
