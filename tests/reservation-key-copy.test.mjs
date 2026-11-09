import test from "node:test";
import assert from "node:assert/strict";
import { mountReservationKeyCopy } from "../src/scripts/reservation-key-copy.mjs";

function setup(clipboard) {
  const key = { value: "secret".repeat(10) + "1234", type: "password" };
  const status = { textContent: "" };
  const button = { disabled: false, addEventListener(type, handler) { this[type] = handler; } };
  mountReservationKeyCopy({ key, button, status, clipboard });
  return { key, button, status };
}

test("copies the exact key without revealing it", async () => {
  const values = [];
  const { key, button, status } = setup({ writeText: async (value) => values.push(value) });
  await button.click();
  assert.deepEqual(values, [key.value]);
  assert.equal(key.type, "password");
  assert.match(status.textContent, /copiée/);
  assert.equal(button.disabled, false);
});

for (const clipboard of [null, { writeText: async () => { throw new Error("Denied"); } }]) {
  test("clipboard failure gives manual copy instructions", async () => {
    const { button, status } = setup(clipboard);
    await button.click();
    assert.match(status.textContent, /copiez-la manuellement/);
    assert.equal(button.disabled, false);
  });
}

test("prevents duplicate clicks while copying", async () => {
  let finish, calls = 0;
  const { button, status } = setup({ writeText: () => { calls++; return new Promise((resolve) => { finish = resolve; }); } });
  const pending = button.click();
  await button.click();
  assert.equal(calls, 1);
  finish();
  await pending;
  assert.match(status.textContent, /copiée/);
});
