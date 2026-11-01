import test from "node:test";
import assert from "node:assert/strict";
import { createAdminService } from "../src/services/adminService.mjs";
import { validatePeriod, renderStackedBars, renderDonut, recentReservations, renderAreaChart, monotonePath, trendOf, formatTrend, kpiTone, kpiSeries, renderSparkline, renderCalendarDay, shiftDate, isoDate } from "../src/admin/statistics.mjs";

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
test("charts keep empty days, stack statuses and escape labels", () => {
  const svg = renderStackedBars([
    { date: "2026-10-15", pending: 0, confirmed: 0, rejected: 0, cancelled: 0 },
    { date: "<b>", pending: 1, confirmed: 2, rejected: 0, cancelled: 1 },
  ], "date", (value) => value);
  assert.equal((svg.match(/class="chart-col"/g) || []).length, 2);
  assert.equal((svg.match(/<rect class="chart-seg/g) || []).length, 3);
  assert.equal(svg.includes("<b>"), false);
  assert.match(svg, /data-tip="[^"]*&quot;total&quot;:4/);
  assert.equal(renderStackedBars([], "date", String), "");
});
test("donut shows the total, tooltip data and is empty without data", () => {
  const svg = renderDonut({ pending: 1, confirmed: 3, rejected: 0, cancelled: 0 });
  assert.equal((svg.match(/<circle/g) || []).length, 2);
  assert.equal((svg.match(/data-tip=/g) || []).length, 2);
  assert.match(svg, /data-default="4">4<\/text>/);
  assert.equal(renderDonut({}), "");
});
test("area chart exposes one hoverable point per day with a smooth line", () => {
  const rows = [3, 0, 5].map((confirmed, index) => ({ date: `2026-10-1${index}`, pending: 0, confirmed, rejected: 0, cancelled: 0 }));
  const svg = renderAreaChart(rows, "date", String);
  assert.equal((svg.match(/class="chart-col chart-point"/g) || []).length, 3);
  assert.match(svg, /class="chart-line" d="M[^"]* C/);
  assert.match(svg, /class="chart-area"/);
  assert.equal(renderAreaChart([], "date", String), "");
  assert.match(renderAreaChart([rows[0]], "date", String), /chart-point/);
});
test("monotone path never overshoots the data", () => {
  const path = monotonePath([[0, 10], [10, 10], [20, 0]]);
  const ys = [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[2]));
  assert.ok(Math.min(...ys) >= 0 && Math.max(...ys) <= 10);
});
test("trends compare the second half of the period with the first", () => {
  assert.deepEqual(trendOf([1, 1, 2, 2]), { percent: 100, direction: "up" });
  assert.deepEqual(trendOf([4, 4, 2, 2]), { percent: -50, direction: "down" });
  assert.equal(trendOf([0, 0, 3, 3]), null);
  assert.equal(trendOf([5]), null);
  assert.equal(formatTrend({ percent: 20, direction: "up" }), "↑ +20 %");
  assert.equal(formatTrend({ percent: -8, direction: "down" }), "↓ −8 %");
  assert.equal(kpiTone({ percent: 20, direction: "up" }, true), "bad");
  assert.equal(kpiTone({ percent: -20, direction: "down" }, true), "good");
  assert.equal(kpiTone(null), "neutral");
});
test("KPI series and sparkline handle empty and flat data", () => {
  const series = kpiSeries([{ total_reservations: 2, confirmed: 1, pending: 1, confirmed_guests: 3 }, { total_reservations: 0 }]);
  assert.deepEqual(series.rate, [50, 50]);
  assert.deepEqual(series.total, [2, 0]);
  assert.equal(renderSparkline([], "good"), "");
  assert.match(renderSparkline([2, 2, 2], "good"), /class="spark is-good"/);
  assert.match(renderSparkline([4], "bad"), /spark-line/);
});
test("calendar day lists reservations by time with status colors and overflow", () => {
  const html = renderCalendarDay("2026-11-03", [
    { time: "20:00:00", name: "<i>Zoé</i>", guests: 4, status: "confirmed" },
    { time: "12:30:00", name: "Paul", guests: 2, status: "pending" },
  ], 6, (value) => `Jour ${value}`, 2);
  assert.ok(html.indexOf("12:30") < html.indexOf("20:00"));
  assert.match(html, /cal-item chart-pending/);
  assert.match(html, /\+ 4 autre\(s\)/);
  assert.equal(html.includes("<i>"), false);
  assert.match(renderCalendarDay("2026-11-04", [], 0, String), /Aucune réservation/);
});
test("date helpers stay on local calendar days", () => {
  assert.equal(shiftDate("2026-10-31", 2), "2026-11-02");
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  assert.equal(isoDate(new Date(2026, 0, 5)), "2026-01-05");
});
test("recent reservations are the newest first and limited", () => {
  const rows = [1, 5, 3, 2, 4, 6, 7].map((id) => ({ id }));
  assert.deepEqual(recentReservations(rows, 3).map((r) => r.id), [7, 6, 5]);
});
