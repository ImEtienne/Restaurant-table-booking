import test from "node:test";
import assert from "node:assert/strict";
import { createAdminService } from "../src/services/adminService.mjs";
import { canChangeReservation, clientReservationPayload } from "../src/admin/client-rules.mjs";

test("new client and admin endpoints use documented verbs and CSRF", async () => {
  const calls = [];
  const api = createAdminService({ baseUrl: "/api", getCookie: () => "XSRF-TOKEN=fresh%3Dtoken", fetchImpl: async (url, options) => { calls.push({ url, ...options }); return { ok: true, status: 204 }; } });
  await api.registerClient({ email: "a@example.com", password: "password12345", password_confirmation: "password12345", registration_token: "a".repeat(64) });
  await api.activateUser(2, false);
  await api.assignClient(42, 2);
  await api.clientReservations(2);
  await api.clientReservation(42);
  await api.createClientReservation({ name: "Ada" });
  await api.updateClientReservation(42, { guests: 3 });
  await api.cancelClientReservation(42);
  await api.claimReservation("a".repeat(64));
  await api.clientStats();
  assert.deepEqual(calls.map(({ method, url }) => `${method} ${url}`), ["GET /sanctum/csrf-cookie", "POST /api/client/register", "PATCH /api/admin/users/2/activation", "PATCH /api/admin/reservations/42/client", "GET /api/client/reservations?page=2", "GET /api/client/reservations/42", "POST /api/client/reservations", "PATCH /api/client/reservations/42", "POST /api/client/reservations/42/cancel", "POST /api/client/reservations/claim", "GET /api/client/stats"]);
  for (const call of calls) {
    assert.equal(call.credentials, "include");
    if (call.method !== "GET") assert.equal(call.headers["X-XSRF-TOKEN"], "fresh=token");
  }
  assert.deepEqual(JSON.parse(calls[2].body), { is_active: false });
  assert.deepEqual(JSON.parse(calls[3].body), { user_id: 2 });
});
test("pending approval error code is preserved for the login toast", async () => {
  const api = createAdminService({ baseUrl: "/api", fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ code: "ACCOUNT_PENDING_APPROVAL", message: "Activation requise" }) }) });
  await assert.rejects(api.profile(), (error) => error.code === "ACCOUNT_PENDING_APPROVAL" && error.status === 403);
});
test("only future pending reservations are editable, with Paris local time", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  for (const status of ["confirmed", "rejected", "cancelled"]) assert.equal(canChangeReservation({ date: "2026-10-18", time: "19:30", status }, now), false);
  assert.equal(canChangeReservation({ date: "2026-10-17", time: "13:59", status: "pending" }, now), false);
  assert.equal(canChangeReservation({ date: "2026-10-17", time: "14:00:00", status: "pending" }, now), false);
  assert.equal(canChangeReservation({ date: "2026-10-17", time: "14:01", status: "pending" }, now), true);
});
test("client payload cannot set email, owner or status", () => {
  assert.deepEqual(clientReservationPayload({ name: " Ada ", phone: " 0123456789 ", date: "2027-10-15", time: "19:30", guests: "2", email: "other@example.com", status: "confirmed", user_id: 99 }), { name: "Ada", phone: "0123456789", date: "2027-10-15", time: "19:30", guests: 2 });
});
for (const status of [401, 403, 404, 409, 419, 422, 429, 500]) {
  test(`client errors ${status} do not retry mutations`, async () => {
    let calls = 0;
    const api = createAdminService({ baseUrl: "/api", getCookie: () => "XSRF-TOKEN=test", fetchImpl: async () => { calls++; return { ok: false, status, json: async () => ({ message: "Refus", errors: { registration_token: ["Clé invalide"] } }) }; } });
    await assert.rejects(api.claimReservation("a".repeat(64)), (error) => error.status === status && error.errors.registration_token.length === 1);
    assert.equal(calls, 1);
  });
}
