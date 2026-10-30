const configuredApiBaseUrl = import.meta.env?.DEV ? "/api" : import.meta.env?.VITE_API_BASE_URL?.trim();

export class ReservationServiceError extends Error {
  constructor(message, { code = "API_ERROR", status = null, validationErrors = {} } = {}) {
    super(message);
    this.name = "ReservationServiceError";
    this.code = code;
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

function resolveTransport({ baseUrl, fetchImpl }) {
  const normalizedBaseUrl = typeof baseUrl === "string" ? baseUrl.trim().replace(/\/+$/, "") : "";

  if (!normalizedBaseUrl) {
    throw new ReservationServiceError("L'URL de l'API n'est pas configurée.", {
      code: "API_NOT_CONFIGURED",
    });
  }

  if (typeof fetchImpl !== "function") {
    throw new ReservationServiceError("La requête HTTP n'est pas disponible.", {
      code: "FETCH_UNAVAILABLE",
    });
  }

  return normalizedBaseUrl;
}

export async function getAvailability(
  { date, guests } = {},
  { baseUrl = configuredApiBaseUrl, fetchImpl = globalThis.fetch } = {},
) {
  const normalizedBaseUrl = resolveTransport({ baseUrl, fetchImpl });
  const query = new URLSearchParams({ date });
  if (Number.isInteger(guests)) query.set("guests", String(guests));

  const response = await fetchImpl(`${normalizedBaseUrl}/availability?${query}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ReservationServiceError(body?.message || "Impossible de consulter les disponibilités.", {
      code: response.status === 422 ? "VALIDATION_FAILED" : "HTTP_ERROR",
      status: response.status,
      validationErrors: body?.errors ?? {},
    });
  }

  return Array.isArray(body?.data) ? body.data : [];
}

export async function createReservation(
  reservation,
  { baseUrl = configuredApiBaseUrl, fetchImpl = globalThis.fetch } = {},
) {
  const normalizedBaseUrl = resolveTransport({ baseUrl, fetchImpl });

  const response = await fetchImpl(`${normalizedBaseUrl}/reservations`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(reservation),
  });

  let responseBody = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    throw new ReservationServiceError("L'API a refusé la réservation.", {
      code: response.status === 422 ? "VALIDATION_FAILED" : "HTTP_ERROR",
      status: response.status,
      validationErrors: responseBody?.errors ?? {},
    });
  }

  return responseBody;
}
