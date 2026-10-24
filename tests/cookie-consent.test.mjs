import test from "node:test";
import assert from "node:assert/strict";
import { CONSENT_KEY, readConsent, saveConsent } from "../src/scripts/cookie-consent.mjs";

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = value; } };
}

test("no stored choice means the banner must be shown", () => {
  assert.equal(readConsent(memoryStorage()), null);
});

test("saved choices round-trip and essential cookies stay enabled", () => {
  const storage = memoryStorage();
  saveConsent(false, storage);
  assert.deepEqual(readConsent(storage), { essential: true, optional: false });
  saveConsent(true, storage);
  assert.deepEqual(readConsent(storage), { essential: true, optional: true });
});

test("corrupted or unavailable storage is ignored", () => {
  assert.equal(readConsent(memoryStorage({ [CONSENT_KEY]: "{oops" })), null);
  assert.equal(readConsent(memoryStorage({ [CONSENT_KEY]: '{"optional":"yes"}' })), null);
  assert.equal(readConsent(null), null);
  assert.doesNotThrow(() => saveConsent(true, { setItem() { throw new Error("blocked"); } }));
});
