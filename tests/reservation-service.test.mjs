import assert from "node:assert/strict";
import test from "node:test";
import { createReservation, ReservationServiceError } from "../src/services/reservationService.mjs";

const reservation = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+33123456789",
  date: "2026-10-06",
  time: "19:30",
  guests: 2,
};

test("sends a JSON reservation to the Laravel API endpoint", async () => {
  let request;
  const result = await createReservation(reservation, {
    baseUrl: "http://localhost:8000/api/",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 201,
        json: async () => ({ id: 42, message: "Reservation received" }),
      };
    },
  });

  assert.equal(request.url, "http://localhost:8000/api/reservations");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Accept, "application/json");
  assert.equal(request.options.headers["Content-Type"], "application/json");
  assert.equal(request.options.cache, "no-store");
  assert.deepEqual(JSON.parse(request.options.body), reservation);
  assert.deepEqual(result, { id: 42, message: "Reservation received" });
});

test("fails clearly without an API URL and does not make a request", async () => {
  let requestMade = false;

  await assert.rejects(
    createReservation(reservation, {
      baseUrl: " ",
      fetchImpl: async () => {
        requestMade = true;
      },
    }),
    (error) => error instanceof ReservationServiceError && error.code === "API_NOT_CONFIGURED",
  );

  assert.equal(requestMade, false);
});

test("exposes Laravel validation errors for a 422 response", async () => {
  await assert.rejects(
    createReservation(reservation, {
      baseUrl: "http://localhost:8000/api",
      fetchImpl: async () => ({
        ok: false,
        status: 422,
        json: async () => ({ errors: { email: ["The email field is invalid."] } }),
      }),
    }),
    (error) => {
      assert.ok(error instanceof ReservationServiceError);
      assert.equal(error.code, "VALIDATION_FAILED");
      assert.equal(error.status, 422);
      assert.deepEqual(error.validationErrors, { email: ["The email field is invalid."] });
      return true;
    },
  );
});

test("rejects other unsuccessful API responses", async () => {
  await assert.rejects(
    createReservation(reservation, {
      baseUrl: "http://localhost:8000/api",
      fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }),
    }),
    (error) => error instanceof ReservationServiceError && error.code === "HTTP_ERROR" && error.status === 503,
  );
});
