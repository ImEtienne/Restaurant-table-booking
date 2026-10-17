import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { accountPayload } from "../src/admin/account-validation.mjs";
import { placeholderFor } from "../src/scripts/placeholders.mjs";

const valid = { name: " Ada ", email: " ada@example.com ", password: "longpassword123", password_confirmation: "longpassword123" };
test("creation trims identity, requires strong confirmed password and defaults to ordinary user", () => {
  const result = accountPayload(valid, { creating: true });
  assert.deepEqual(result.errors, {});
  assert.equal(result.data.name, "Ada");
  assert.equal(result.data.email, "ada@example.com");
  assert.equal(result.data.is_admin, false);
  assert.ok(accountPayload({ ...valid, password: "short" }, { creating: true }).errors.password);
  assert.ok(accountPayload({ ...valid, password_confirmation: "wrong" }, { creating: true }).errors.password_confirmation);
});
test("profile never sends role and requires current password only for sensitive changes", () => {
  const options = { profile: true, originalEmail: "ada@example.com" };
  const unchanged = accountPayload({ name: "Ada", email: "ada@example.com", is_admin: true }, options);
  assert.deepEqual(unchanged.errors, {});
  assert.equal("is_admin" in unchanged.data, false);
  assert.equal("password" in unchanged.data, false);
  assert.ok(accountPayload({ ...valid }, options).errors.current_password);
  assert.ok(accountPayload({ name: "Ada", email: "new@example.com" }, options).errors.current_password);
  assert.deepEqual(accountPayload({ ...valid, current_password: "old" }, options).errors, {});
});
test("edits omit empty passwords and preserve explicit role decisions", () => {
  const result = accountPayload({ name: "Ada", email: "ada@example.com", password: "", is_admin: true });
  assert.equal(result.data.is_admin, true);
  assert.equal("password" in result.data, false);
  assert.equal(accountPayload({ ...valid, is_admin: false }).data.is_admin, false);
  assert.ok(accountPayload({ ...valid, name: "x".repeat(256) }).errors.name);
  assert.ok(accountPayload({ ...valid, email: "invalid" }).errors.email);
});

const source = (await readFile(new URL("../src/admin/accounts.js", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "").replace("export function mountAccounts", "function mountAccounts");
function harness(api, currentUser = { id: 1, name: "Admin", email: "admin@example.com", is_admin: true }, confirmAccepted = true) {
  const nodes = [];
  function node(tag) {
    const el = { tag, children: [], attributes: {}, events: {}, textContent: "", disabled: false,
      append(child) { this.children.push(child); }, replaceChildren() { this.children = []; },
      setAttribute(key, value) { this.attributes[key] = value; },
      addEventListener(type, fn) { this.events[type] = fn; }, focus() {},
    };
    nodes.push(el); return el;
  }
  const root = node("section");
  const notifications = [];
  let confirmations = 0;
  const context = { document: { createElement: node, getElementById: () => root }, location: { hash: "" },
    window: { confirm() { confirmations++; return true; } }, accountPayload, placeholderFor,
    confirmDialog: async () => confirmAccepted,
    showToast: (...args) => notifications.push(args), api, currentUser,
    onIdentity() {}, onSessionError() {},
  };
  vm.createContext(context);
  vm.runInContext(source + "\ncontroller = mountAccounts({ api, currentUser, onIdentity, onSessionError });", context);
  return { ...context, nodes, notifications, confirmations: () => confirmations,
    find: (text) => [...nodes].reverse().find((el) => el.textContent === text),
    input: (name) => [...nodes].reverse().find((el) => el.name === name),
    form: () => [...nodes].reverse().find((el) => el.tag === "form"),
  };
}
const page = (data) => ({ data, meta: { total: data.length, current_page: 1, last_page: 1 } });
test("users screen renders plain text, disables self deletion and loads selected user before editing", async () => {
  const user = { id: 1, name: "<script>test</script>", email: "a@example.com", is_admin: true };
  let fetched;
  const h = harness({ users: async () => page([user]), user: async (id) => { fetched = id; return { data: user }; } });
  await h.controller.activate("users");
  assert.ok(h.find(`#${user.id} · ${user.name}`));
  assert.equal(h.find("Supprimer").disabled, true);
  await h.find("Voir / Modifier").events.click();
  assert.equal(fetched, 1);
  assert.equal(h.input("name").value, user.name);
});
test("invalid creation stays local; valid submission sends role and prevents duplicate requests", async () => {
  let calls = 0, resolve;
  const h = harness({ users: async () => page([]), createUser: (body) => {
    calls++; assert.equal(body.is_admin, false);
    return new Promise((done) => { resolve = done; });
  } });
  await h.controller.activate("users");
  h.find("Créer un utilisateur").events.click();
  await h.form().events.submit({ preventDefault() {} });
  assert.equal(calls, 0);
  for (const [name, value] of Object.entries(valid)) h.input(name).value = value;
  const form = h.form();
  const pending = form.events.submit({ preventDefault() {} });
  await form.events.submit({ preventDefault() {} });
  assert.equal(calls, 1);
  assert.equal(form.attributes["aria-busy"], "true");
  resolve({ data: { id: 2 } }); await pending;
  assert.equal(form.attributes["aria-busy"], "false");
});
test("server validation is displayed under the field and form becomes usable after failure", async () => {
  const h = harness({ users: async () => page([]), createUser: async () => { throw { status: 422, message: "Email déjà utilisé", errors: { email: ["Cette adresse est déjà utilisée."] } }; } });
  await h.controller.activate("users"); h.find("Créer un utilisateur").events.click();
  for (const [name, value] of Object.entries(valid)) h.input(name).value = value;
  await h.form().events.submit({ preventDefault() {} });
  assert.equal(h.input("email").attributes["aria-invalid"], "true");
  assert.ok(h.find("Cette adresse est déjà utilisée."));
  assert.equal(h.find("Créer le compte").disabled, false);
});
test("deletion asks for confirmation and handles last-admin conflicts without removing the row", async () => {
  const h = harness({ users: async () => page([{ id: 2, name: "Ada", email: "a@example.com", is_admin: true }]), deleteUser: async () => { throw { status: 409 }; } });
  await h.controller.activate("users"); await h.find("Supprimer").events.click();
  assert.equal(h.confirmations(), 1);
  assert.match(h.notifications[0][0], /dernier administrateur/);
  assert.equal(h.find("Supprimer").disabled, false);
});
test("ordinary accounts can load their profile without issuing user-list calls", async () => {
  const user = { id: 2, name: "Ada", email: "ada@example.com", is_admin: false };
  let lists = 0;
  const h = harness({ profile: async () => ({ data: user }), users: () => { lists++; } }, user);
  await h.controller.activate("users");
  assert.equal(lists, 0);
  await h.controller.activate("profile");
  assert.equal(h.input("email").value, user.email);
  assert.equal(h.input("is_admin"), undefined);
});

test("inactive clients can be activated and the list is refreshed", async () => {
  let received;
  const user = { id: 2, name: "Ada", email: "ada@example.com", is_admin: false, is_active: false };
  const h = harness({ users: async () => page([user]), activateUser: async (id, active) => { received = { id, active }; user.is_active = active; } });
  await h.controller.activate("users");
  assert.ok(h.find("En attente / Inactif"));
  await h.find("Activer").events.click();
  assert.deepEqual(received, { id: 2, active: true });
  assert.ok(h.find("Désactiver"));
});

test("cancelling the activation modal makes no API call and restores the button", async () => {
  let calls = 0;
  const h = harness({ users: async () => page([{ id: 2, name: "Ada", email: "a@example.com", is_admin: false, is_active: false }]), activateUser: async () => { calls++; } }, undefined, false);
  await h.controller.activate("users");
  await h.find("Activer").events.click();
  assert.equal(calls, 0);
  assert.equal(h.find("Activer").disabled, false);
});
