import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { mountCookieBanner, CONSENT_KEY } from "../src/scripts/cookie-consent.mjs";
import { mountDishesCarousel } from "../src/scripts/dishes-carousel.mjs";
import { mountTableLabels } from "../src/admin/tableLabels.mjs";

function documentHarness() {
  const nodes = [];
  const doc = {
    getElementById: (id) => nodes.find((n) => n.id === id),
    createElement(tag) {
      const node = { tag, children: [], events: {}, attributes: {}, focused: 0,
        append(...items) { this.children.push(...items); },
        replaceChildren(...items) { this.children = items; },
        setAttribute(k, v) { this.attributes[k] = v; },
        addEventListener(k, fn) { this.events[k] = fn; },
        focus() { this.focused++; }, remove() { this.removed = true; },
      };
      nodes.push(node); return node;
    },
  };
  doc.body = doc.createElement("body");
  return { doc, nodes, byClass: (cls) => nodes.find((n) => n.className === cls) };
}

function cookies(saved = null, blocked = false) {
  const h = documentHarness(), writes = [];
  const storage = { getItem: () => saved, setItem(key, value) {
    if (blocked) throw new Error("Storage blocked");
    writes.push([key, JSON.parse(value)]);
  } };
  mountCookieBanner(h.doc, storage);
  return { ...h, storage, writes, banner: h.doc.getElementById("cookie-banner"), fab: h.doc.getElementById("cookie-fab") };
}

test("new visitors can edit consent, refuse optional cookies and reopen preferences", () => {
  const h = cookies();
  assert.equal(h.banner.hidden, false);
  assert.equal(h.fab.hidden, true);
  assert.equal(h.banner.attributes.role, "dialog");
  const essential = h.nodes.filter((n) => n.tag === "input")[0];
  assert.equal(essential.checked, true);
  assert.equal(essential.disabled, true);
  const edit = h.byClass("cookie-edit");
  edit.events.click();
  assert.equal(edit.attributes["aria-expanded"], "true");
  assert.equal(h.byClass("cookie-settings").hidden, false);
  h.nodes.filter((n) => n.tag === "input")[1].checked = false;
  edit.events.click();
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0][0], CONSENT_KEY);
  assert.equal(h.writes[0][1].optional, false);
  assert.equal(h.writes[0][1].essential, true);
  assert.ok(Number.isFinite(Date.parse(h.writes[0][1].savedAt)));
  assert.equal(h.banner.hidden, true);
  assert.equal(h.fab.hidden, false);
  h.fab.events.click();
  assert.equal(h.banner.hidden, false);
  assert.equal(h.byClass("cookie-accept").focused, 1);
  assert.equal(edit.attributes["aria-expanded"], "false");
});

for (const optional of [true, false]) {
  test(`saved optional consent ${optional} is restored without prompting or rewriting storage`, () => {
    const h = cookies(JSON.stringify({ optional }));
    assert.equal(h.banner.hidden, true);
    assert.equal(h.fab.hidden, false);
    assert.equal(h.nodes.filter((n) => n.tag === "input")[1].checked, optional);
    assert.equal(h.writes.length, 0);
  });
}

for (const close of ["button", "Escape"]) {
  test(`closing cookie preferences with ${close} does not grant consent`, () => {
    const h = cookies();
    h.byClass("cookie-edit").events.click();
    if (close === "button") h.byClass("cookie-close").events.click();
    else h.banner.events.keydown({ key: "Escape" });
    assert.equal(h.banner.hidden, true);
    assert.equal(h.byClass("cookie-settings").hidden, true);
    assert.equal(h.writes.length, 0);
  });
}

for (const editing of [true, false]) {
  test(`accepting cookies works with editing=${editing}, even if storage is blocked`, () => {
    const h = cookies(null, true);
    if (editing) h.byClass("cookie-edit").events.click();
    assert.doesNotThrow(() => h.byClass("cookie-accept").events.click());
    assert.equal(h.banner.hidden, true);
    assert.equal(h.nodes.filter((n) => n.tag === "input")[1].checked, true);
  });
}

test("mounting the cookie banner twice does not duplicate controls", () => {
  const h = cookies(), count = h.nodes.length;
  mountCookieBanner(h.doc, h.storage);
  assert.equal(h.nodes.length, count);
  h.banner.events.keydown({ key: "Enter" });
  assert.equal(h.banner.hidden, false);
});

for (const width of [240, 0, null]) {
  test(`dishes carousel uses the current card width (${width}) or viewport fallback`, () => {
    const h = documentHarness(), calls = [];
    for (const id of ["popular-track", "popular-prev", "popular-next"]) h.doc.createElement("div").id = id;
    const track = h.doc.getElementById("popular-track");
    track.clientWidth = 500;
    track.firstElementChild = width === null ? null : { getBoundingClientRect: () => ({ width }) };
    track.scrollBy = (options) => calls.push(options);
    mountDishesCarousel(h.doc);
    h.doc.getElementById("popular-next").events.click();
    h.doc.getElementById("popular-prev").events.click();
    const step = (width || 500) + 20;
    assert.deepEqual(calls, [{ left: step, behavior: "smooth" }, { left: -step, behavior: "smooth" }]);
    track.clientWidth = 700;
    track.firstElementChild = null;
    h.doc.getElementById("popular-next").events.click();
    assert.equal(calls[2].left, 720);
  });
}

test("carousel safely skips pages without its markup", () => {
  assert.doesNotThrow(() => mountDishesCarousel({ getElementById: () => null }));
});

test("responsive table labels batch DOM mutations and observe future updates", async () => {
  let callback, scans = 0, observed;
  const root = { querySelectorAll() { scans++; return []; } };
  class Observer {
    constructor(fn) { callback = fn; }
    observe(target, options) { observed = { target, options }; }
  }
  mountTableLabels({ querySelector: () => root }, Observer);
  assert.equal(scans, 1);
  assert.deepEqual(observed, { target: root, options: { childList: true, subtree: true } });
  callback(); callback(); callback();
  assert.equal(scans, 1);
  await Promise.resolve();
  assert.equal(scans, 2);
  callback();
  await Promise.resolve();
  assert.equal(scans, 3);
});

test("responsive table labels support missing containers and browsers without observers", () => {
  assert.doesNotThrow(() => mountTableLabels({ querySelector: () => null }));
  let scans = 0;
  mountTableLabels({ querySelector: () => ({ querySelectorAll() { scans++; return []; } }) }, null);
  assert.equal(scans, 1);
});

const toastSource = (await readFile(new URL("../src/scripts/toast.js", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");

test("toasts share an accessible region, render text safely and replace previous messages", () => {
  const h = documentHarness(), timers = [];
  const context = vm.createContext({ document: h.doc, setTimeout: (fn, delay) => timers.push({ fn, delay }) });
  vm.runInContext(toastSource, context);
  context.showToast("<img onerror=alert(1)>");
  const region = h.doc.getElementById("toast-region"), first = region.children[0];
  assert.equal(region.attributes["aria-live"], "polite");
  assert.equal(first.children[0].textContent, "<img onerror=alert(1)>");
  assert.equal(timers.length, 0);
  first.children[1].events.click();
  assert.equal(first.removed, true);
  context.showToast("OK", "success");
  const success = region.children[0];
  assert.equal(success.className, "site-toast site-toast-success");
  assert.equal(timers[0].delay, 7000);
  context.showToast("Nouvelle erreur");
  const error = region.children[0];
  timers[0].fn();
  assert.equal(success.removed, true);
  assert.equal(error.removed, undefined);
  assert.equal(region.children.length, 1);
  assert.equal(h.nodes.filter((n) => n.id === "toast-region").length, 1);
});
