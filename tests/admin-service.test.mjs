import test from "node:test";
import assert from "node:assert/strict";
import { createAdminService, AdminApiError } from "../src/services/adminService.mjs";

test("global search uses q and per-type limit with encoded literal characters", async () => {
  let requested;
  const result = { data: { users: [], reservations: [] }, meta: { has_more: { users: true, reservations: false } } };
  const api = createAdminService({ baseUrl: "http://localhost:8000/api", fetchImpl: async (url, options) => {
    requested = new URL(url);
    assert.equal(options.credentials, "include");
    return { ok: true, status: 200, json: async () => result };
  } });
  assert.equal(await api.search(" #42%_! ", 5), result);
  assert.equal(requested.pathname, "/api/admin/search");
  assert.equal(requested.searchParams.get("q"), "#42%_!");
  assert.equal(requested.searchParams.get("limit"), "5");
  for (const query of ["", "a", "a".repeat(101)]) assert.throws(() => api.search(query));
  for (const limit of [0, 21, 1.5]) assert.throws(() => api.search("Ada", limit));
});

test("development proxy keeps CSRF and login requests on the frontend origin", async () => {
  const calls = [];
  const api = createAdminService({ baseUrl: "/api", getCookie: () => "XSRF-TOKEN=test",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 204 };
    },
  });
  await api.login("admin@example.com", "test");
  assert.deepEqual(calls.map(({ url }) => url), ["/sanctum/csrf-cookie", "/api/admin/login"]);
  assert.equal(calls[1].options.headers["X-XSRF-TOKEN"], "test");
  assert.ok(calls.every(({ options }) => options.credentials === "include"));
});

test("Sanctum login initializes cookies at the backend root and reads the fresh CSRF token", async () => {
  const calls = [];
  let cookie = "";
  const api = createAdminService({ baseUrl: "http://127.0.0.1:8000/api/", getCookie: () => cookie,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      cookie = "other=1; XSRF-TOKEN=fresh%3Dtoken";
      return { ok: true, status: calls.length === 1 ? 204 : 200, json: async () => ({ data: { is_admin: true } }) };
    },
  });
  await api.login("admin@example.com", "password");
  assert.equal(calls[0].url, "http://127.0.0.1:8000/sanctum/csrf-cookie");
  assert.equal(calls[1].url, "http://127.0.0.1:8000/api/admin/login");
  assert.equal(calls[1].options.headers["X-XSRF-TOKEN"], "fresh=token");
  assert.deepEqual(JSON.parse(calls[1].options.body), { email: "admin@example.com", password: "password" });
  assert.ok(calls.every(({ options }) => options.credentials === "include"));
});

test("filters and pagination are sent to the documented reservation route", async () => {
  let url;
  const api = createAdminService({ baseUrl: "http://localhost:8000/api", fetchImpl: async (value) => {
    url = new URL(value);
    return { ok: true, status: 200, json: async () => ({ data: [], meta: { total: 0 } }) };
  } });
  await api.reservations({ date: "2027-10-15", status: "pending", page: 2 });
  assert.equal(url.pathname, "/api/admin/reservations");
  assert.equal(url.searchParams.get("date"), "2027-10-15");
  assert.equal(url.searchParams.get("status"), "pending");
  assert.equal(url.searchParams.get("page"), "2");
});

test("status changes and logout use the current CSRF token, never a cached token", async () => {
  let cookie = "XSRF-TOKEN=one";
  const calls = [];
  const api = createAdminService({ baseUrl: "http://localhost:8000/api", getCookie: () => cookie,
    fetchImpl: async (url, options) => { calls.push({ url, options }); return { ok: true, status: 204 }; },
  });
  await api.updateReservation(42, "confirmed");
  cookie = "XSRF-TOKEN=two";
  await api.logout();
  assert.equal(calls[0].options.method, "PATCH");
  assert.equal(calls[0].url, "http://localhost:8000/api/admin/reservations/42");
  assert.deepEqual(JSON.parse(calls[0].options.body), { status: "confirmed" });
  assert.equal(calls[1].options.headers["X-XSRF-TOKEN"], "two");
});

for (const status of [401, 403, 409, 419, 422, 429, 500]) {
  test(`HTTP ${status} remains available to the interface without retrying mutations`, async () => {
    let calls = 0;
    const api = createAdminService({ baseUrl: "http://localhost:8000/api", getCookie: () => "XSRF-TOKEN=test",
      fetchImpl: async () => { calls++; return { ok: false, status, json: async () => ({ message: "Refus API" }) }; },
    });
    await assert.rejects(api.updateReservation(1, "rejected"), (error) => error instanceof AdminApiError && error.status === status);
    assert.equal(calls, 1);
  });
}

test("missing CSRF and invalid status prevent mutation requests", async () => {
  let calls = 0;
  const api = createAdminService({ baseUrl: "http://localhost:8000/api", getCookie: () => "", fetchImpl: () => { calls++; } });
  await assert.rejects(api.logout(), (error) => error.status === 419);
  assert.throws(() => api.updateReservation(1, "pending"));
  assert.equal(calls, 0);
});
