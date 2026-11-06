import test from "node:test";
import assert from "node:assert/strict";
import { mountNotifications } from "../src/admin/notifications.mjs";

function harness() {
  const listeners = {};
  const node = () => ({
    hidden: true, attributes: {}, events: {}, focused: false,
    addEventListener(type, handler) { this.events[type] = handler; },
    setAttribute(name, value) { this.attributes[name] = value; },
    contains(target) { return target === this; },
    focus() { this.focused = true; },
  });
  const toggle = node();
  const panel = node();
  const doc = {
    getElementById(id) { return id === "admin-notifications" ? toggle : panel; },
    addEventListener(type, handler) { listeners[type] = handler; },
  };
  mountNotifications(doc);
  return { toggle, panel, listeners };
}

test("notification button opens and closes the panel and updates aria-expanded", () => {
  const { toggle, panel } = harness();
  toggle.events.click();
  assert.equal(panel.hidden, false);
  assert.equal(toggle.attributes["aria-expanded"], "true");
  toggle.events.click();
  assert.equal(panel.hidden, true);
  assert.equal(toggle.attributes["aria-expanded"], "false");
});

test("outside click closes the panel but clicks inside and on the toggle do not", () => {
  const { toggle, panel, listeners } = harness();
  toggle.events.click();
  listeners.click({ target: panel });
  listeners.click({ target: toggle });
  assert.equal(panel.hidden, false);
  listeners.click({ target: {} });
  assert.equal(panel.hidden, true);
  assert.equal(toggle.attributes["aria-expanded"], "false");
});

test("Escape closes the panel and returns focus to the button", () => {
  const { toggle, panel, listeners } = harness();
  toggle.events.click();
  listeners.keydown({ key: "Enter" });
  assert.equal(panel.hidden, false);
  listeners.keydown({ key: "Escape" });
  assert.equal(panel.hidden, true);
  assert.equal(toggle.attributes["aria-expanded"], "false");
  assert.equal(toggle.focused, true);
});
