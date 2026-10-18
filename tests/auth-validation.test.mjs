import test from "node:test";
import assert from "node:assert/strict";
import { validateAuth, authErrorMessage } from "../src/scripts/auth-validation.mjs";

test("login errors distinguish missing email, malformed email and missing password", () => {
  assert.match(validateAuth({}).email, /Indiquez/);
  assert.match(validateAuth({ email: "incorrect" }).email, /valide/);
  assert.match(validateAuth({}).password, /mot de passe/);
  assert.deepEqual(validateAuth({ email: " a@example.com ", password: "short" }), {});
});
test("registration requires reservation key, strong password and matching confirmation", () => {
  const errors = validateAuth({ email: "a@example.com", password: "short", password_confirmation: "other" }, true);
  assert.match(errors.registration_token, /64 caractères/);
  assert.match(errors.password, /12 caractères/);
  assert.match(errors.password_confirmation, /identiques/);
  assert.deepEqual(validateAuth({ registration_token: "a".repeat(64), email: "a@example.com", password: "longpassword", password_confirmation: "longpassword" }, true), {});
  assert.match(authErrorMessage({ code: "ACCOUNT_PENDING_APPROVAL", status: 403 }), /activation/);
});
test("toast messages distinguish refused credentials, security, throttling and server errors", () => {
  assert.match(authErrorMessage({ status: 422 }), /email et votre mot de passe/);
  assert.match(authErrorMessage({ status: 419 }), /expiré/);
  assert.match(authErrorMessage({ status: 429, retryAfter: 45 }), /45 secondes/);
  assert.match(authErrorMessage({ status: 500 }), /serveur/);
});
