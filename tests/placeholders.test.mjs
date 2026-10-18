import test from "node:test";
import assert from "node:assert/strict";
import { placeholderFor, applyPlaceholders } from "../src/scripts/placeholders.mjs";
test("placeholders cover reservation, account, confidential key and date fields", () => {
  for (const name of ["name", "nom", "email", "phone", "telephone", "password", "password_confirmation", "current_password", "registration_token", "guests", "personnes", "date", "time", "start_date", "end_date", "user_id", "reservation_id"]) assert.ok(placeholderFor(name), name);
  const inputs = [{ name: "email", type: "email" }, { name: "q", type: "search", placeholder: "Recherche personnalisée" }, { name: "is_admin", type: "checkbox" }];
  applyPlaceholders({ querySelectorAll: () => inputs });
  assert.equal(inputs[0].placeholder, "Ex. camille@exemple.fr");
  assert.equal(inputs[1].placeholder, "Recherche personnalisée");
  assert.equal(inputs[2].placeholder, undefined);
});
