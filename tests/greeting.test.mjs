import assert from "node:assert/strict";
import test from "node:test";
import { displayName, greetingFor } from "../src/admin/greeting.mjs";

const memory = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};

test("displayName préfère le prénom puis le nom", () => {
  assert.equal(displayName({ first_name: " Awa ", name: "Diop" }), "Awa");
  assert.equal(displayName({ name: "Diop" }), "Diop");
  assert.equal(displayName(null), "");
});

test("la première visite du jour dit Bonjour, les suivantes Ravi de vous revoir", () => {
  const storage = memory();
  const user = { id: 7, first_name: "Awa" };
  const morning = new Date(2026, 10, 5, 8);
  assert.equal(greetingFor(user, storage, morning), "Bonjour, Awa 👋");
  assert.equal(greetingFor(user, storage, new Date(2026, 10, 5, 15)), "Ravi de vous revoir, Awa 😊");
  assert.equal(greetingFor(user, storage, new Date(2026, 10, 6, 9)), "Bonjour, Awa 👋");
});

test("chaque utilisateur a son propre suivi et un nom manquant donne null", () => {
  const storage = memory();
  const now = new Date(2026, 10, 5, 8);
  greetingFor({ id: 1, name: "A" }, storage, now);
  assert.equal(greetingFor({ id: 2, name: "B" }, storage, now), "Bonjour, B 👋");
  assert.equal(greetingFor({ id: 3 }, storage, now), null);
});

test("un stockage défaillant n'empêche pas l'affichage", () => {
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert.equal(greetingFor({ id: 1, name: "A" }, broken), "Bonjour, A 👋");
});
