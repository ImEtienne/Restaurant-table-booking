import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { validateAuth, authErrorMessage } from "../src/scripts/auth-validation.mjs";

for (const isAdmin of [true, false]) {
test(`auth tabs switch without reload and ${isAdmin ? "admin" : "ordinary account"} login submits once to the correct destination`, async () => {
  const listeners = new Map();
  function node(id, dataset = {}) {
    return { id, dataset, attributes: {}, hidden: false, value: "", textContent: "", disabled: false,
      setAttribute(key, value) { this.attributes[key] = value; },
      getAttribute(key) { return this.attributes[key]; },
      addEventListener(type, fn) { listeners.set(`${id}:${type}`, fn); },
      classList: { add() {}, remove() {} },
      append() {}, closest() { return this; },
      focus() {}, querySelectorAll() { return []; },
    };
  }
  const login = node("login-tab", { authSwitch: "login" });
  const register = node("register-tab", { authSwitch: "register" });
  login.attributes["aria-controls"] = "login-panel";
  register.attributes["aria-controls"] = "register-panel";
  const nodes = Object.fromEntries([login, register, node("login-panel"), node("register-panel"), node("auth-welcome")].map((el) => [el.id, el]));
  const status = node("status");
  const password = node("password"); password.value = "secret";
  const email = node("email"); email.value = " admin@example.com ";
  password.name = "password";
  email.name = "email";
  const submit = node("submit");
  const form = node("login-form");
  form.elements = { namedItem: (key) => ({ password, email }[key] || null) };
  form.parentElement = { querySelector: () => status };
  form.querySelector = () => submit;
  form.querySelectorAll = (selector) => selector === "input" ? [email, password] : [];
  form.reportValidity = () => true;
  let calls = 0;
  let resolveLogin;
  let hash = "";
  const location = { get hash() { return hash; }, set hash(value) { hash = `#${value.replace(/^#/, "")}`; }, assigned: null, assign(value) { this.assigned = value; } };
  const document = {
    createElement: () => node("error"),
    getElementById: (id) => nodes[id],
    querySelectorAll: (selector) => selector === '[role="tab"]' || selector === "[data-auth-switch]" ? [login, register] : [form],
  };
  const source = (await readFile(new URL("../src/scripts/auth.js", import.meta.url), "utf8")).replace(/^import .*;\r?\n/gm, "");
  vm.runInNewContext(source, { applyPlaceholders() {}, validateAuth, authErrorMessage, showToast() {}, document, location, window: { addEventListener() {} }, createAdminService: () => ({
    userLogin: (sentEmail, sentPassword) => {
      calls++;
      assert.equal(sentEmail, "admin@example.com");
      assert.equal(sentPassword, "secret");
      return new Promise((resolve) => { resolveLogin = resolve; });
    },
  }) });
  let prevented = 0;
  listeners.get("register-tab:click")({ preventDefault() { prevented++; } });
  assert.equal(location.hash, "#register");
  assert.equal(nodes["register-panel"].hidden, false);
  assert.equal(nodes["login-panel"].hidden, true);
  listeners.get("login-tab:click")({ preventDefault() { prevented++; } });
  assert.equal(nodes["login-panel"].hidden, false);
  assert.equal(location.assigned, null);
  const event = { preventDefault() { prevented++; } };
  const first = listeners.get("login-form:submit")(event);
  await listeners.get("login-form:submit")(event);
  assert.equal(calls, 1);
  assert.equal(submit.disabled, true);
  resolveLogin({ data: { is_admin: isAdmin } });
  await first;
  assert.equal(location.assigned, isAdmin ? "/dashboard.html" : "/dashboard.html#client");
  assert.equal(password.value, "");
  assert.equal(prevented, 4);
});
}
