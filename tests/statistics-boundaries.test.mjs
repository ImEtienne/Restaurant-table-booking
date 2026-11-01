import test from "node:test";
import assert from "node:assert/strict";
import { renderLegend, chartStatuses, renderDonut, renderAreaChart, renderStackedBars,
  renderCalendarDay, recentReservations, trendOf, formatTrend, kpiTone, kpiSeries,
  shiftDate, monotonePath, validatePeriod } from "../src/admin/statistics.mjs";
import { sortReservations } from "../src/admin/sort.mjs";

test("legend always includes every status and normalizes missing or negative counts", () => {
  const doc = { createElement: () => ({ children: [], append(item) { this.children.push(item); } }) };
  const plain = renderLegend(null, doc);
  assert.equal(plain.className, "chart-legend");
  assert.deepEqual(plain.children.map((n) => n.textContent), chartStatuses.map(([, label]) => label));
  const counts = renderLegend({ pending: -2, confirmed: "4", rejected: "invalid" }, doc);
  assert.deepEqual(counts.children.map((n) => n.textContent.split(" : ")[1]), ["0", "4", "0", "0"]);
});

for (const render of [renderStackedBars, renderAreaChart]) {
  test(`${render.name} handles zero and mixed counts without invalid geometry`, () => {
    const rows = [{ date: "a", pending: -10, confirmed: "3", rejected: "invalid" }, { date: "b" }];
    const before = structuredClone(rows);
    const svg = render(rows, "date", String);
    assert.doesNotMatch(svg, /NaN|Infinity/);
    assert.deepEqual(rows, before);
    assert.match(svg, /tabindex="0"/);
    assert.match(svg, /&quot;total&quot;:3/);
    assert.doesNotMatch(render([{ date: "a" }], "date", String), /NaN|Infinity/);
  });
  test(`${render.name} escapes labels and gives each SVG unique resource IDs`, () => {
    const payload = '\"><script>alert(1)</script>&\'';
    const rows = [{ date: payload, confirmed: 1 }];
    const a = render(rows, "date", String);
    const b = render(rows, "date", String);
    assert.doesNotMatch(a, /<script>/);
    assert.match(a, /&lt;script&gt;/);
    const ids = (svg) => [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(ids(a).length > 0);
    assert.ok(ids(a).every((id) => !ids(b).includes(id)));
  });
}

test("donut handles missing summaries, numeric strings and a full single-status circle", () => {
  for (const summary of [null, undefined, {}, { pending: -1, confirmed: "invalid" }]) assert.equal(renderDonut(summary), "");
  const svg = renderDonut({ confirmed: "7" });
  assert.equal((svg.match(/<circle /g) || []).length, 1);
  assert.match(svg, /stroke-dasharray="100.00 0.00"/);
  assert.match(svg, /data-default="7"/);
  assert.match(svg, /100 %/);
});

test("trends ignore the middle day of odd periods and normalize unusable counts", () => {
  assert.deepEqual(trendOf([2, 1000, 4]), { percent: 100, direction: "up" });
  assert.deepEqual(trendOf([0, 0]), { percent: 0, direction: "flat" });
  assert.deepEqual(trendOf([-1, "bad", 0, null]), { percent: 0, direction: "flat" });
  assert.deepEqual(trendOf([4, 8, 2, 4], "avg"), { percent: -50, direction: "down" });
  assert.equal(trendOf([]), null);
  assert.equal(formatTrend(null), "");
  assert.equal(formatTrend({ percent: 0, direction: "flat" }), "→ 0 %");
  assert.equal(kpiTone({ direction: "flat" }, true), "neutral");
  assert.equal(kpiTone({ direction: "up" }), "good");
  assert.equal(kpiTone({ direction: "down" }), "bad");
});

test("KPI rates retain the last available rate over empty days and reset with new data", () => {
  const series = kpiSeries([{}, { total_reservations: 4, confirmed: 1, pending: "3", confirmed_guests: "2" }, {}, { total_reservations: 2, confirmed: 2 }, {}]);
  assert.deepEqual(series.rate, [0, 25, 25, 100, 100]);
  assert.deepEqual(series.pending, [0, 3, 0, 0, 0]);
  assert.deepEqual(series["confirmed-guests"], [0, 2, 0, 0, 0]);
  assert.ok(Object.values(kpiSeries([])).every((values) => values.length === 0));
});

test("calendar escapes all dynamic fields, limits rows and preserves input order", () => {
  const rows = [{ time: "20:00", name: "<b>A</b>", guests: '<img>', status: '\" onclick="alert(1)' }, { time: "12:00", name: "B", guests: 2, status: "pending" }];
  const before = structuredClone(rows);
  const html = renderCalendarDay("2026-01-01", rows, 0, () => "<script>date</script>", 1);
  assert.deepEqual(rows, before);
  assert.match(html, /\+ 1 autre/);
  assert.doesNotMatch(html, /20:00|<script>/);
  const all = renderCalendarDay("2026-01-01", rows, 2, String);
  assert.doesNotMatch(all, /<b>|<img>|onclick=/);
  assert.match(all, /Inconnu/);
  assert.match(all, /&lt;img&gt;/);
});

test("recent reservations supports zero limit, string IDs and does not reorder input", () => {
  const rows = [{ id: "2" }, { id: "10" }, { id: "1" }];
  assert.deepEqual(recentReservations(rows).map((r) => r.id), ["10", "2", "1"]);
  assert.deepEqual(rows.map((r) => r.id), ["2", "10", "1"]);
  assert.deepEqual(recentReservations(rows, 0), []);
  assert.deepEqual(recentReservations([]), []);
});

for (const [day, offset, expected] of [["2024-03-01", -1, "2024-02-29"], ["2026-12-31", 1, "2027-01-01"], ["2026-03-28", 2, "2026-03-30"], ["2026-10-24", 2, "2026-10-26"], ["2026-01-01", 0, "2026-01-01"]]) {
  test(`calendar shift ${day} by ${offset} days`, () => assert.equal(shiftDate(day, offset), expected));
}

test("period boundaries include the first and last days", () => {
  assert.equal(validatePeriod({ start_date: "2026-01-01", end_date: "2026-01-01" }), "");
  assert.equal(validatePeriod({ start_date: "2026-01-01", end_date: "2027-01-01" }), "");
  assert.notEqual(validatePeriod({ start_date: "2026-01-01", end_date: "2027-01-02" }), "");
});

test("monotone paths support empty, single, repeated and sharply varying points", () => {
  assert.equal(monotonePath([]), "");
  assert.equal(monotonePath([[1, 2]]), "");
  for (const points of [[[0, 2], [0, 2], [1, 2]], [[0, 0], [1, 100], [2, 0], [3, 1]]]) {
    assert.doesNotMatch(monotonePath(points), /NaN|Infinity/);
  }
});

test("reservation sorting handles missing fields, unknown statuses and stable ties", () => {
  const rows = [{ id: 1, status: "unknown" }, { id: 2, status: "pending", date: "2026-01-01", time: "20:00" }, { id: 3, status: "pending", date: "2026-01-01", time: "12:00" }, { id: 4 }];
  assert.deepEqual(sortReservations(rows, "status").map((r) => r.id), [3, 2, 1, 4]);
  assert.deepEqual(sortReservations(rows, "name").map((r) => r.id), [1, 2, 3, 4]);
  assert.deepEqual(sortReservations([], "date-desc"), []);
});
