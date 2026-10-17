import test from "node:test";
import assert from "node:assert/strict";
import { safeAvatarUrl, profileInitials, renderSidebarProfile, mountProfileMenu } from "../src/admin/sidebarProfile.mjs";

function fakeDocument() {
  const nodes = {};
  const get = (id) => nodes[id] ??= {
    hidden: false, textContent: "", src: undefined, onerror: null,
    removeAttribute(name) { if (name === "src") this.src = undefined; },
  };
  return { getElementById: (id) => get(id.replace("admin-", "")), nodes };
}

test("safeAvatarUrl accepts relative paths and https only", () => {
  assert.equal(safeAvatarUrl("/img/a.png"), "/img/a.png");
  assert.equal(safeAvatarUrl("https://cdn.example/a.png"), "https://cdn.example/a.png");
  for (const bad of ["http://x/a.png", "//evil/a.png", "javascript:alert(1)", "data:image/png;base64,AA", "", null, 42]) {
    assert.equal(safeAvatarUrl(bad), "");
  }
});

test("profileInitials combines first name and name, with fallback", () => {
  assert.equal(profileInitials({ first_name: "ada", name: "lovelace" }), "AL");
  assert.equal(profileInitials({ name: "Lovelace" }), "L");
  assert.equal(profileInitials({ name: "😀 Smile" }), "😀");
  assert.equal(profileInitials({}), "?");
});

test("renderSidebarProfile shows name only when there is no first name", () => {
  const doc = fakeDocument();
  renderSidebarProfile({ name: "Ada" }, doc);
  assert.equal(doc.nodes["profile-name"].textContent, "Ada");
  assert.equal(doc.nodes["profile-firstname"].hidden, true);
  assert.equal(doc.nodes["avatar-img"].hidden, true);
  assert.equal(doc.nodes["avatar-initials"].hidden, false);
  assert.equal(doc.nodes["avatar-initials"].textContent, "A");
});

test("renderSidebarProfile shows first name and photo", () => {
  const doc = fakeDocument();
  renderSidebarProfile({ name: "Lovelace", first_name: "Ada", avatar_url: "/img/ada.png" }, doc);
  assert.equal(doc.nodes["profile-firstname"].textContent, "Ada");
  assert.equal(doc.nodes["profile-firstname"].hidden, false);
  assert.equal(doc.nodes["avatar-img"].src, "/img/ada.png");
  assert.equal(doc.nodes["avatar-img"].hidden, false);
  assert.equal(doc.nodes["avatar-initials"].hidden, true);
});

test("renderSidebarProfile ignores unsafe photo URLs", () => {
  const doc = fakeDocument();
  renderSidebarProfile({ name: "Ada", avatar_url: "javascript:alert(1)" }, doc);
  assert.equal(doc.nodes["avatar-img"].src, undefined);
  assert.equal(doc.nodes["avatar-initials"].hidden, false);
});

test("renderSidebarProfile falls back to initials when the image fails", () => {
  const doc = fakeDocument();
  renderSidebarProfile({ name: "Ada", avatar_url: "/img/missing.png" }, doc);
  doc.nodes["avatar-img"].onerror();
  assert.equal(doc.nodes["avatar-img"].hidden, true);
  assert.equal(doc.nodes["avatar-initials"].hidden, false);
});

function menuHarness() {
  const listeners = {};
  const el = (id) => ({
    id, hidden: true, attributes: {}, focused: false, events: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(type, fn) { this.events[type] = fn; },
    contains(target) { return target === this; },
    focus() { this.focused = true; },
  });
  const toggle = el("toggle");
  const menu = el("menu");
  const doc = {
    getElementById: (id) => id === "admin-profile-toggle" ? toggle : menu,
    addEventListener(type, fn) { listeners[type] = fn; },
  };
  mountProfileMenu(doc);
  return { toggle, menu, listeners };
}

test("profile menu opens and closes with the toggle", () => {
  const { toggle, menu } = menuHarness();
  toggle.events.click();
  assert.equal(menu.hidden, false);
  assert.equal(toggle.attributes["aria-expanded"], "true");
  toggle.events.click();
  assert.equal(menu.hidden, true);
  assert.equal(toggle.attributes["aria-expanded"], "false");
});

test("profile menu closes on outside click, Escape and item click", () => {
  const { toggle, menu, listeners } = menuHarness();
  toggle.events.click();
  listeners.click({ target: {} });
  assert.equal(menu.hidden, true);

  toggle.events.click();
  listeners.keydown({ key: "Escape" });
  assert.equal(menu.hidden, true);
  assert.equal(toggle.focused, true);

  toggle.events.click();
  menu.events.click();
  assert.equal(menu.hidden, true);
});

test("clicks inside the menu are ignored by the document handler", () => {
  const { toggle, menu, listeners } = menuHarness();
  toggle.events.click();
  listeners.click({ target: menu });
  assert.equal(menu.hidden, false);
});
