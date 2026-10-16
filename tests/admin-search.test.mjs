import test from "node:test";
import assert from "node:assert/strict";
import { searchReservations } from "../src/admin/search.mjs";
const rows = [{ id: 42, name: "Émilie Martin", email: "emilie@example.com", phone: "0612345678" }, { id: 43, name: "Ada", email: "ada@example.com", phone: "0798765432" }];
test("reservation search matches case, accents and multiple terms", () => {
  assert.deepEqual(searchReservations(rows, "EMILIE martin"), [rows[0]]);
  for (const query of ["42", "emilie@", "061234"]) assert.deepEqual(searchReservations(rows, query), [rows[0]]);
});
test("clearing search restores rows and missing matches give an empty list", () => {
  assert.deepEqual(searchReservations(rows, "  "), rows);
  assert.deepEqual(searchReservations(rows, "inconnu"), []);
  assert.equal(rows.length, 2);
});
