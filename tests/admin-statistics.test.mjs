import test from "node:test";
import assert from "node:assert/strict";
import { createAdminService } from "../src/services/adminService.mjs";
import { validatePeriod, renderMetrics } from "../src/admin/statistics.mjs";

test("all statistics endpoints send the selected inclusive period with session cookies", async () => {
  const calls = [];
  const api = createAdminService({ baseUrl: "http://127.0.0.1:8000/api", fetchImpl: async (url, options) => {
    calls.push({ url: new URL(url), options });
    return { ok: true, status: 200, json: async () => ({ data: [], meta: {} }) };
  } });
  for (const name of ["stats", "dailyStats", "hourlyStats"]) await api[name]({ start_date: "2026-10-01", end_date: "2026-10-16" });
  assert.deepEqual(calls.map(({ url }) => url.pathname), ["/api/admin/stats", "/api/admin/stats/daily", "/api/admin/stats/hourly"]);
  for (const { url, options } of calls) {
    assert.equal(url.searchParams.get("start_date"), "2026-10-01");
    assert.equal(url.searchParams.get("end_date"), "2026-10-16");
    assert.equal(options.credentials, "include");
  }
  await api.stats({ start_date: "", end_date: "2026-10-16" });
  assert.equal(calls[3].url.searchParams.has("start_date"), false);
  await api.stats();
  assert.equal(calls[4].url.search, "");
});
test("inclusive periods accept 366 days and reject longer or reversed ranges", () => {
  assert.equal(validatePeriod({ start_date: "2024-01-01", end_date: "2024-12-31" }), "");
  assert.notEqual(validatePeriod({ start_date: "2024-01-01", end_date: "2025-01-01" }), "");
  assert.notEqual(validatePeriod({ start_date: "2026-10-16", end_date: "2026-10-15" }), "");
  assert.equal(validatePeriod({ end_date: "2026-10-16" }), "");
});
test("statistics preserve empty days and distinguish requested from confirmed guests", () => {
  const node = () => ({ children: [], append(...children) { this.children.push(...children); }, replaceChildren() { this.children = []; } });
  const tbody = node();
  renderMetrics(tbody, [
    { date: "2026-10-15", total_reservations: 0, pending: 0, confirmed: 0, rejected: 0, total_guests: 0, confirmed_guests: 0 },
    { date: "2026-10-16", total_reservations: 2, pending: 1, confirmed: 1, rejected: 0, total_guests: 8, confirmed_guests: 3 },
  ], "date", { createElement: node });
  assert.equal(tbody.children.length, 2);
  assert.equal(tbody.children[0].children[1].textContent, "0");
  assert.equal(tbody.children[1].children[5].textContent, "8");
  assert.equal(tbody.children[1].children[6].textContent, "3");
});
