import test from "node:test";
import assert from "node:assert/strict";
import { mountMobileMenu } from "../src/admin/mobileMenu.mjs";
import { mountSearchToggle } from "../src/admin/searchToggle.mjs";
import { sortReservations } from "../src/admin/sort.mjs";
import { activeFilters, mountFiltersToggle } from "../src/admin/mobileFilters.mjs";
import { labelTables } from "../src/admin/tableLabels.mjs";
import { mountStatsScroller } from "../src/admin/statsScroller.mjs";

function element() {
  return {
    attrs: {}, events: {}, focused: 0, hidden: false, inert: false,
    setAttribute(key, value) { this.attrs[key] = value; },
    removeAttribute(key) { delete this.attrs[key]; },
    addEventListener(type, fn) { this.events[type] = fn; },
    focus() { this.focused++; },
  };
}

function menuHarness() {
  const classes = new Set();
  const nodes = Object.fromEntries(["admin-menu", "admin-menu-close", "admin-sidebar", "admin-backdrop"].map((id) => [id, element()]));
  const main = element();
  const listeners = {};
  const doc = {
    body: { classList: { contains: (name) => classes.has(name), toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) } },
    getElementById: (id) => nodes[id],
    querySelector: () => main,
  };
  mountMobileMenu(doc, { addEventListener: (type, fn) => { listeners[type] = fn; } });
  return { classes, nodes, main, listeners };
}

test("mobile drawer opens, makes the page inert and focuses the close button", () => {
  const { classes, nodes, main } = menuHarness();
  nodes["admin-menu"].events.click();
  assert.equal(classes.has("admin-menu-open"), true);
  assert.equal(nodes["admin-menu"].attrs["aria-expanded"], "true");
  assert.equal(main.inert, true);
  assert.equal(nodes["admin-menu-close"].focused, 1);
});

test("mobile drawer closes with close button, backdrop, Escape, link click and hashchange", () => {
  const { classes, nodes, main, listeners } = menuHarness();
  const open = () => nodes["admin-menu"].events.click();
  const closers = [
    () => nodes["admin-menu-close"].events.click(),
    () => nodes["admin-backdrop"].events.click(),
    () => listeners.keydown({ key: "Escape" }),
    () => nodes["admin-sidebar"].events.click({ target: { closest: () => ({}) } }),
    () => listeners.hashchange(),
  ];
  for (const close of closers) {
    open();
    assert.equal(classes.has("admin-menu-open"), true);
    close();
    assert.equal(classes.has("admin-menu-open"), false);
    assert.equal(main.inert, false);
    assert.equal(nodes["admin-menu"].attrs["aria-expanded"], "false");
  }
});

test("closing with the keyboard returns focus to the menu button, link clicks do not", () => {
  const { nodes, listeners } = menuHarness();
  nodes["admin-menu"].events.click();
  listeners.keydown({ key: "Escape" });
  assert.equal(nodes["admin-menu"].focused, 1);
  nodes["admin-menu"].events.click();
  nodes["admin-sidebar"].events.click({ target: { closest: () => ({}) } });
  assert.equal(nodes["admin-menu"].focused, 1);
});

function cell(text, colSpan = 1) { return { ...element(), textContent: text, colSpan }; }

test("labelTables copies header labels onto cells and skips merged cells", () => {
  const headers = [cell("Client"), cell("Statut")];
  const full = { ...element(), children: [cell("#1 · Ada"), cell("En attente")] };
  const empty = { ...element(), children: [cell("Aucune réservation", 2)] };
  const group = element();
  const table = {
    ...element(),
    querySelectorAll: (selector) => ({ "thead th": headers, "thead, tbody": [group], tr: [full, empty], th: headers, "tbody tr": [full, empty] })[selector],
  };
  labelTables({ querySelectorAll: () => [table] });
  assert.equal(full.children[0].attrs["data-label"], "Client");
  assert.equal(full.children[1].attrs["data-label"], "Statut");
  assert.equal(empty.children[0].attrs["data-label"], undefined);
  assert.equal(table.attrs.role, "table");
  assert.equal(full.children[0].attrs.role, "cell");
});

test("stats scroller shows controls only when cards overflow and scrolls by a screen portion", () => {
  const track = { ...element(), scrollWidth: 900, clientWidth: 300, scrollLeft: 0, scrolled: [], scrollBy(options) { this.scrolled.push(options.left); } };
  const prev = element();
  const next = element();
  const nodes = { "admin-stats": track, "admin-stats-prev": prev, "admin-stats-next": next };
  mountStatsScroller({ getElementById: (id) => nodes[id] }, { addEventListener() {} });
  assert.equal(prev.hidden, true);
  assert.equal(next.hidden, false);
  next.events.click();
  assert.deepEqual(track.scrolled, [240]);
  track.scrollLeft = 600;
  track.events.scroll();
  assert.equal(prev.hidden, false);
  assert.equal(next.hidden, true);
  prev.events.click();
  assert.deepEqual(track.scrolled, [240, -240]);
});

test("stats scroller hides both controls when nothing overflows", () => {
  const track = { ...element(), scrollWidth: 300, clientWidth: 300, scrollLeft: 0 };
  const prev = element();
  const next = element();
  const nodes = { "admin-stats": track, "admin-stats-prev": prev, "admin-stats-next": next };
  mountStatsScroller({ getElementById: (id) => nodes[id] }, { addEventListener() {} });
  assert.equal(prev.hidden, true);
  assert.equal(next.hidden, true);
});

test("mobile search toggle opens the search bar, focuses the field and closes with Escape", () => {
  const classes = new Set();
  const toggle = element();
  const input = element();
  const nodes = { "admin-search-toggle": toggle, "admin-global-query": input };
  const header = { classList: { contains: (name) => classes.has(name), toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) } };
  const listeners = {};
  mountSearchToggle({ getElementById: (id) => nodes[id], querySelector: () => header }, { addEventListener: (type, fn) => { listeners[type] = fn; } });

  toggle.events.click();
  assert.equal(classes.has("admin-search-open"), true);
  assert.equal(toggle.attrs["aria-expanded"], "true");
  assert.equal(input.focused, 1);

  listeners.keydown({ key: "Escape" });
  assert.equal(classes.has("admin-search-open"), false);
  assert.equal(toggle.attrs["aria-expanded"], "false");
  assert.equal(toggle.focused, 1);

  toggle.events.click();
  toggle.events.click();
  assert.equal(classes.has("admin-search-open"), false);
});

const rows = [
  { id: 1, name: "Élodie", date: "2026-11-02", time: "20:00", status: "confirmed" },
  { id: 2, name: "Bastien", date: "2026-11-01", time: "19:30", status: "cancelled" },
  { id: 3, name: "Chloé", date: "2026-11-01", time: "12:00", status: "pending" },
];
const ids = (list) => list.map((row) => row.id);

test("sortReservations orders by date, name and status without mutating the input", () => {
  assert.deepEqual(ids(sortReservations(rows, "date-asc")), [3, 2, 1]);
  assert.deepEqual(ids(sortReservations(rows, "date-desc")), [1, 2, 3]);
  assert.deepEqual(ids(sortReservations(rows, "name")), [2, 3, 1]);
  assert.deepEqual(ids(sortReservations(rows, "status")), [3, 1, 2]);
  assert.deepEqual(ids(rows), [1, 2, 3]);
});

test("sortReservations keeps the server order for an empty or unknown key", () => {
  assert.equal(sortReservations(rows, ""), rows);
  assert.equal(sortReservations(rows, "inconnu"), rows);
});

function filtersHarness() {
  const classes = new Set();
  const toggle = element();
  const count = element();
  const fields = [{ name: "date", value: "" }, { name: "status", value: "" }, { name: "", value: "ignoré" }];
  const panel = { ...element(), elements: fields, classList: { contains: (name) => classes.has(name), toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) } };
  const nodes = { "admin-filters-toggle": toggle, "admin-filters": panel, "admin-filters-count": count };
  mountFiltersToggle({ getElementById: (id) => nodes[id] });
  return { classes, toggle, count, panel, fields };
}

test("filters panel toggles open and closed", () => {
  const { classes, toggle } = filtersHarness();
  toggle.events.click();
  assert.equal(classes.has("is-open"), true);
  assert.equal(toggle.attrs["aria-expanded"], "true");
  toggle.events.click();
  assert.equal(classes.has("is-open"), false);
});

test("filters panel counts active filters, closes on submit and clears on reset", () => {
  const { classes, toggle, count, panel, fields } = filtersHarness();
  assert.equal(activeFilters(panel), 0);
  toggle.events.click();
  fields[0].value = "2026-11-01";
  fields[1].value = "pending";
  panel.events.submit();
  assert.equal(count.textContent, "2");
  assert.equal(count.hidden, false);
  assert.equal(toggle.attrs["aria-label"], "Filtres, 2 actifs");
  assert.equal(classes.has("is-open"), false);

  panel.events.reset();
  assert.equal(count.hidden, true);
  assert.equal(toggle.attrs["aria-label"], "Filtres");
});