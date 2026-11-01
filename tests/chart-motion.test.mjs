import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = (await readFile(new URL("../src/admin/chartMotion.mjs", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "").replaceAll("export function", "function");

function node() {
  const classes = new Set();
  return {
    children: [], events: {}, dataset: {}, style: {}, textContent: "",
    classList: { add: (v) => classes.add(v), remove: (v) => classes.delete(v), contains: (v) => classes.has(v) },
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    setAttribute(k, v) { this[k] = v; },
    addEventListener(k, fn) { this.events[k] = fn; },
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 120, height: 60 }),
    closest() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
  };
}

function harness(reduced = true) {
  const root = node(), document = node(), animations = [];
  document.createElement = () => node();
  const context = vm.createContext({ document, window: { innerWidth: 800 },
    matchMedia: () => ({ matches: reduced }),
    animate: (...args) => animations.push(args), stagger: (step) => step,
  });
  vm.runInContext(source, context);
  context.mountChartInteractions(root);
  function target(svg = node(), data = { title: '<img src=x onerror="alert(1)">', total: 5, rows: [["pending", "En attente", 2], ["confirmed", "Confirmées", 3]] }) {
    const item = node();
    item.dataset = { tip: JSON.stringify(data), value: "2", label: "En attente" };
    item.closest = (selector) => selector === "svg" ? svg : selector === "[data-tip]" ? item : null;
    return { item, svg };
  }
  const move = (item, x = 100, y = 100) => root.events.pointermove({ target: item, clientX: x, clientY: y });
  return { context, root, document, animations, tip: root.children[0], target, move };
}

test("chart tooltip displays untrusted labels as text and shows multi-status totals", () => {
  const h = harness(), { item, svg } = h.target();
  assert.equal(h.tip.hidden, true);
  assert.equal(h.tip.role, "status");
  h.move(item);
  assert.equal(h.tip.hidden, false);
  assert.equal(h.tip.children[0].textContent, '<img src=x onerror="alert(1)">');
  assert.equal(h.tip.children[1].children.length, 2);
  assert.equal(h.tip.children[1].children[0].children[1].textContent, "2");
  assert.equal(h.tip.children[2].textContent, "Total : 5");
  assert.equal(item.classList.contains("is-active"), true);
  assert.equal(svg.classList.contains("has-active"), true);
  assert.equal(h.animations.length, 0);
});

for (const event of ["pointerleave", "focusout", "Escape", "background"]) {
  test(`chart tooltip closes and restores donut totals on ${event}`, () => {
    const h = harness(), value = node(), label = node(), svg = node();
    value.dataset.default = "5"; label.dataset.default = "réservations";
    svg.querySelector = (s) => s === ".chart-donut-total" ? value : label;
    const { item } = h.target(svg);
    h.root.events.focusin({ target: item });
    assert.equal(value.textContent, "2");
    assert.equal(label.textContent, "En attente");
    if (event === "Escape") h.document.events.keydown({ key: "Escape" });
    else if (event === "background") h.move(node());
    else h.root.events[event]();
    assert.equal(h.tip.hidden, true);
    assert.equal(value.textContent, "5");
    assert.equal(label.textContent, "réservations");
    assert.equal(svg.classList.contains("has-active"), false);
    assert.equal(item.classList.contains("is-active"), false);
  });
}

test("moving between charts clears the previous SVG highlight", () => {
  const h = harness(), a = h.target(), b = h.target();
  h.move(a.item); h.move(b.item);
  assert.equal(a.svg.classList.contains("has-active"), false);
  assert.equal(a.item.classList.contains("is-active"), false);
  assert.equal(b.svg.classList.contains("has-active"), true);
});

test("invalid tooltip payloads stay hidden across repeated pointer events", () => {
  for (const payload of ["{", "null", "{}", '{"rows":null}', '{"rows":[null]}']) {
    const h = harness(), { item, svg } = h.target();
    item.dataset.tip = payload;
    assert.doesNotThrow(() => { h.move(item); h.move(item); });
    assert.equal(h.tip.hidden, true, payload);
    assert.equal(svg.classList.contains("has-active"), false);
  }
});

test("tooltip follows the pointer without restarting its animation and fits the right edge", () => {
  const h = harness(false), { item } = h.target();
  h.move(item, 790, 10);
  assert.equal(h.tip.style.left, "672px");
  assert.equal(h.tip.style.top, "24px");
  h.move(item, 200, 200);
  assert.equal(h.tip.style.left, "214px");
  assert.equal(h.tip.style.top, "126px");
  assert.equal(h.animations.length, 1);
  h.document.events.keydown({ key: "Enter" });
  assert.equal(h.tip.hidden, false);
});

test("single-status tooltip omits the redundant total", () => {
  const h = harness(), { item } = h.target(undefined, { title: "Confirmées", total: 3, rows: [["confirmed", "100 %", 3]] });
  h.move(item);
  assert.equal(h.tip.children.length, 2);
});

test("reduced motion suppresses all chart and counter animations", () => {
  const h = harness();
  h.context.countUp(node(), 10);
  h.context.animateCards(h.root);
  h.context.animateCharts(h.root);
  assert.equal(h.animations.length, 0);
});

test("counter ignores invalid inputs and ends on the formatted target", () => {
  const h = harness(false), element = node();
  for (const value of [NaN, Infinity, -Infinity, "invalid"]) h.context.countUp(element, value);
  h.context.countUp(null, 42);
  assert.equal(h.animations.length, 0);
  h.context.countUp(element, "42.5", " %");
  const options = h.animations[0][2];
  options.onUpdate(12.34);
  assert.equal(element.textContent, "12,3 %");
  options.onComplete();
  assert.equal(element.textContent, "42,5 %");
});

test("chart animations target bars, lines, areas, sparklines and donut arcs", () => {
  const h = harness(false), bars = [node()], line = node(), area = node(), sparks = [node()], arcs = [node(), node()];
  arcs.forEach((arc) => { arc.getAttribute = () => "49.20 50.80"; });
  const selections = { "rect.chart-seg": bars, "path.chart-line": [line], "path.chart-area": [area], ".kpi-spark .spark": sparks, "circle.chart-arc": arcs };
  h.root.querySelectorAll = (selector) => selections[selector] || [];
  h.context.animateCharts(h.root);
  assert.equal(h.animations.length, 6);
  assert.equal(h.animations[0][0], bars);
  assert.equal(h.animations[1][0], line);
  assert.equal(h.animations[2][0], area);
  assert.equal(h.animations[3][0], sparks);
  assert.equal(h.animations[4][1].strokeDasharray[1], "49.20 50.80");
  assert.equal(h.animations[5][2].delay, 0.1);
  h.animations.length = 0;
  h.context.animateCharts(node());
  assert.equal(h.animations.length, 0);
});

test("card animation targets dashboard cards and works without matchMedia", () => {
  const h = harness(false), cards = [node()];
  delete h.context.matchMedia;
  h.root.querySelectorAll = (selector) => { assert.equal(selector, ".admin-card"); return cards; };
  h.context.animateCards(h.root);
  assert.equal(h.animations[0][0], cards);
  assert.equal(h.animations[0][2].delay, 0.06);
});

test("switching away from a donut restores its center before showing another chart", () => {
  const h = harness(), value = node(), label = node(), svg = node();
  value.dataset.default = "9"; label.dataset.default = "réservations";
  svg.querySelector = (s) => s === ".chart-donut-total" ? value : label;
  h.move(h.target(svg).item);
  h.move(h.target().item);
  assert.equal(value.textContent, "9");
  assert.equal(label.textContent, "réservations");
});
