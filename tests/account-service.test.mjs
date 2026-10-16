import test from "node:test";
import assert from "node:assert/strict";
import { createAdminService } from "../src/services/adminService.mjs";

test("account endpoints use correct methods, paths, cookies and CSRF headers", async () => {
  const calls = [];
  const api = createAdminService({ baseUrl: "/api", getCookie: () => "XSRF-TOKEN=fresh%3Dtoken", fetchImpl: async (url, options) => {
    calls.push({ url, ...options }); return { ok: true, status: 204 };
  } });
  await api.userLogin("a@example.com", "test");
  await api.profile();
  await api.updateProfile({ name: "Ada" });
  await api.users(2);
  await api.user(42);
  await api.createUser({ name: "Ada", is_admin: false });
  await api.updateUser(42, { is_admin: true });
  await api.deleteUser(42);
  await api.userLogout();
  assert.deepEqual(calls.map(({ url, method }) => `${method} ${url}`), [
    "GET /sanctum/csrf-cookie", "POST /api/login", "GET /api/profile", "PATCH /api/profile", "GET /api/admin/users?page=2", "GET /api/admin/users/42", "POST /api/admin/users", "PATCH /api/admin/users/42", "DELETE /api/admin/users/42", "POST /api/logout",
  ]);
  for (const call of calls) {
    assert.equal(call.credentials, "include");
    if (call.method !== "GET") assert.equal(call.headers["X-XSRF-TOKEN"], "fresh=token");
  }
  assert.deepEqual(JSON.parse(calls[7].body), { is_admin: true });
});
test("invalid user identifiers never reach the API", () => {
  const api = createAdminService({ fetchImpl() { assert.fail("Unexpected HTTP call"); } });
  for (const id of [0, -1, 1.5, "42", "../profile", NaN]) {
    assert.throws(() => api.user(id));
    assert.throws(() => api.updateUser(id, {}));
    assert.throws(() => api.deleteUser(id));
  }
});
for (const status of [401, 403, 404, 409, 419, 422, 429, 500]) {
  test(`user mutation preserves HTTP ${status} and field errors, without automatic retry`, async () => {
    let calls = 0;
    const api = createAdminService({ baseUrl: "/api", getCookie: () => "XSRF-TOKEN=test", fetchImpl: async () => {
      calls++; return { ok: false, status, json: async () => ({ message: "Refus", errors: { email: ["Adresse invalide"] } }) };
    } });
    await assert.rejects(api.updateUser(42, { is_admin: false }), (error) => error.status === status && error.errors.email[0] === "Adresse invalide");
    assert.equal(calls, 1);
  });
}
