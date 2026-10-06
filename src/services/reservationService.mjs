const configuredApiBaseUrl = import.meta.env?.VITE_API_BASE_URL?.trim();

export class ReservationServiceError extends Error {
  constructor(message, { code = "API_ERROR", status = null, validationErrors = {} } = {}) {
    super(message);
    this.name = "ReservationServiceError";
    this.code = code;
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

export async function createReservation(
  reservation,
  { baseUrl = configuredApiBaseUrl, fetchImpl = globalThis.fetch } = {},
) {
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
