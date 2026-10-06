import assert from "node:assert/strict";
import test from "node:test";
import { getTodayLocalDate, validateReservation } from "../src/scripts/reservation-validation.mjs";

const today = "2026-10-05";

function validReservation(overrides = {}) {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+33123456789",
    date: today,
    time: "19:30",
    guests: "2",
    ...overrides,
  };
}

test("accepts a complete reservation for today", () => {
  assert.deepEqual(validateReservation(validReservation(), today), {
    valid: true,
    errors: {},
  });
});

test("trims whitespace around the name, email, and phone", () => {
  const result = validateReservation(validReservation({
    name: " Ada Lovelace ",
    email: " ada@example.com ",
    phone: " +33123456789 ",
  }), today);

  assert.equal(result.valid, true);
});

test("rejects missing or oversized names", () => {
  assert.ok(validateReservation(validReservation({ name: "   " }), today).errors.name);
  assert.ok(validateReservation(validReservation({ name: "a".repeat(101) }), today).errors.name);
});

test("rejects malformed or oversized email addresses", () => {
  assert.ok(validateReservation(validReservation({ email: "not-an-email" }), today).errors.email);
  assert.ok(validateReservation(validReservation({ email: `${"a".repeat(245)}@example.com` }), today).errors.email);
});

test("rejects phone numbers outside the supported length", () => {
  assert.ok(validateReservation(validReservation({ phone: "123" }), today).errors.phone);
  assert.ok(validateReservation(validReservation({ phone: "1".repeat(33) }), today).errors.phone);
});

test("rejects past and impossible calendar dates", () => {
  assert.ok(validateReservation(validReservation({ date: "2026-10-04" }), today).errors.date);
  assert.ok(validateReservation(validReservation({ date: "2026-02-30" }), today).errors.date);
});

test("rejects malformed or out-of-range times", () => {
  assert.ok(validateReservation(validReservation({ time: "25:00" }), today).errors.time);
  assert.ok(validateReservation(validReservation({ time: "noon" }), today).errors.time);
});

test("accepts guest-count boundaries and rejects invalid counts", () => {
  assert.equal(validateReservation(validReservation({ guests: "1" }), today).valid, true);
  assert.equal(validateReservation(validReservation({ guests: "10" }), today).valid, true);
  assert.ok(validateReservation(validReservation({ guests: "0" }), today).errors.guests);
  assert.ok(validateReservation(validReservation({ guests: "11" }), today).errors.guests);
  assert.ok(validateReservation(validReservation({ guests: "1.5" }), today).errors.guests);
});

test("formats the current date using the local timezone", () => {
  assert.equal(getTodayLocalDate(new Date(2026, 9, 5, 23, 30)), today);
});