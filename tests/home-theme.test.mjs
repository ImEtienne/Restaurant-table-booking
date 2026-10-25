import test from "node:test";
import assert from "node:assert/strict";
import { HOME_THEME_KEY, mountHomeTheme } from "../src/scripts/home-theme.mjs";

function harness(initialTheme = null, storageOverride = null) {
  const values = initialTheme ? { [HOME_THEME_KEY]: initialTheme } : {};
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        hidden: false,
        textContent: "",
        attributes: {},
        listeners: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, handler) { this.listeners[name] = handler; },
      });
    }
    return elements.get(id);
  };
  const body = { classes: new Set(), classList: {
    toggle(name, enabled) { if (enabled) body.classes.add(name); else body.classes.delete(name); },
    contains(name) { return body.classes.has(name); },
  } };
  const storage = storageOverride ?? {
    getItem(key) { return values[key] ?? null; },
    setItem(key, value) { values[key] = value; },
  };
  const doc = { body, getElementById: element };
  mountHomeTheme(doc, storage);
  return { body, element, values };
}

test("home theme starts in the stored dark mode", () => {
  const h = harness("dark");
  assert.equal(h.body.classList.contains("home-dark"), true);
  assert.equal(h.element("home-theme-toggle").attributes["aria-pressed"], "true");
  assert.equal(h.element("home-theme-moon").hidden, true);
  assert.equal(h.element("home-theme-sun").hidden, false);
});

test("home theme toggle persists each selection", () => {
  const h = harness();
  const toggle = h.element("home-theme-toggle");
  assert.equal(h.body.classList.contains("home-dark"), false);
  toggle.listeners.click();
  assert.equal(h.body.classList.contains("home-dark"), true);
  assert.equal(h.values[HOME_THEME_KEY], "dark");
  toggle.listeners.click();
  assert.equal(h.body.classList.contains("home-dark"), false);
  assert.equal(h.values[HOME_THEME_KEY], "light");
});

test("home theme remains usable when storage is unavailable", () => {
  const h = harness(null, {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  });
  h.element("home-theme-toggle").listeners.click();
  assert.equal(h.body.classList.contains("home-dark"), true);
});
