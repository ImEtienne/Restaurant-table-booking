export class AdminApiError extends Error {
  constructor(message, status = 0, errors = {}, retryAfter = null) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }
}

export function createAdminService({
  baseUrl = import.meta.env?.DEV ? "/api" : import.meta.env?.VITE_API_BASE_URL,
  fetchImpl = globalThis.fetch,
  getCookie = () => document.cookie,
} = {}) {
  const base = baseUrl?.trim().replace(/\/+$/, "");
  async function request(path, { method = "GET", body, csrf = false } = {}) {
    if (!base) throw new AdminApiError("L’URL de l’API n’est pas configurée.");
    const headers = { Accept: "application/json" };
    if (body) headers["Content-Type"] = "application/json";
    if (csrf) {
      const token = getCookie().split(";").map((part) => part.trim()).find((part) => part.startsWith("XSRF-TOKEN="));
      if (!token) {
        const error = new AdminApiError("Le navigateur n’a pas rendu le cookie XSRF-TOKEN accessible après l’initialisation de la session. Vérifiez les cookies autorisés pour ce site.", 419);
        error.code = "CSRF_COOKIE_MISSING";
        throw error;
      }
      headers["X-XSRF-TOKEN"] = decodeURIComponent(token.slice("XSRF-TOKEN=".length));
    }
    let response;
    try {
      const url = path === "/sanctum/csrf-cookie"
        ? base.startsWith("/") ? path : `${new URL(base).origin}${path}`
        : `${base}${path}`;
      response = await fetchImpl(url, {
        method, headers, credentials: "include", cache: "no-store",
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new AdminApiError("Impossible de joindre l’API. Vérifiez la connexion et les origines autorisées.");
    }
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new AdminApiError(data?.message || `La requête a échoué (${response.status}).`, response.status, data?.errors || {}, response.headers?.get("Retry-After") ?? null);
    return data;
  }
  function stats(path, { start_date = "", end_date = "" } = {}) {
    const query = new URLSearchParams();
    if (start_date) query.set("start_date", start_date);
    if (end_date) query.set("end_date", end_date);
    return request(`${path}${query.size ? `?${query}` : ""}`);
  }
  return {
    async userLogin(email, password) {
      await request("/sanctum/csrf-cookie");
      return request("/login", { method: "POST", body: { email, password }, csrf: true });
    },
    userLogout: () => request("/logout", { method: "POST", csrf: true }),
    profile: () => request("/profile"),
    updateProfile: (body) => request("/profile", { method: "PATCH", body, csrf: true }),
    users: (page = 1) => request(`/admin/users?${new URLSearchParams({ page: String(page) })}`),
    user: (id) => request(`/admin/users/${userId(id)}`),
    createUser: (body) => request("/admin/users", { method: "POST", body, csrf: true }),
    updateUser: (id, body) => request(`/admin/users/${userId(id)}`, { method: "PATCH", body, csrf: true }),
    deleteUser: (id) => request(`/admin/users/${userId(id)}`, { method: "DELETE", csrf: true }),
    async login(email, password) {
      await request("/sanctum/csrf-cookie");
      return request("/admin/login", { method: "POST", body: { email, password }, csrf: true });
    },
    me: () => request("/admin/me"),
    logout: () => request("/admin/logout", { method: "POST", csrf: true }),
    stats: (period) => stats("/admin/stats", period),
    dailyStats: (period) => stats("/admin/stats/daily", period),
    hourlyStats: (period) => stats("/admin/stats/hourly", period),
    search(text, limit = 5) {
      const q = text.trim();
      if (q.length < 2 || q.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 20) {
        throw new AdminApiError("La recherche doit contenir entre 2 et 100 caractères (limite : 1 à 20 résultats par type).", 422);
      }
      return request(`/admin/search?${new URLSearchParams({ q, limit: String(limit) })}`);
    },
    reservations({ date = "", status = "", page = 1 } = {}) {
      const query = new URLSearchParams({ page: String(page) });
      if (date) query.set("date", date);
      if (status) query.set("status", status);
      return request(`/admin/reservations?${query}`);
    },
    updateReservation(id, status) {
      if (!Number.isSafeInteger(id) || id < 1 || !["confirmed", "rejected"].includes(status)) {
        throw new AdminApiError("Réservation ou statut invalide.");
      }
      return request(`/admin/reservations/${id}`, { method: "PATCH", body: { status }, csrf: true });
    },
  };
}

function userId(id) {
  if (!Number.isSafeInteger(id) || id < 1) throw new AdminApiError("Identifiant utilisateur invalide.", 422);
  return id;
}
