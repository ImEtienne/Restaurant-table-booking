export const statusLabels = { pending: "En attente", confirmed: "Confirmée", rejected: "Refusée" };

export function renderReservations(tbody, reservations, doc = document) {
  tbody.replaceChildren();
  if (!reservations.length) {
    const cell = doc.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "Aucune réservation pour ces filtres.";
    const row = doc.createElement("tr");
    row.append(cell);
    tbody.append(row);
  }
  for (const reservation of reservations) {
    const row = doc.createElement("tr");
    for (const value of [reservation.name, `${reservation.email} · ${reservation.phone}`, `${reservation.date} à ${reservation.time}`, reservation.guests]) {
      const cell = doc.createElement("td");
      cell.textContent = String(value ?? "—");
      row.append(cell);
    }
    const state = doc.createElement("td");
    const badge = doc.createElement("span");
    badge.className = `admin-badge ${Object.hasOwn(statusLabels, reservation.status) ? reservation.status : ""}`;
    badge.textContent = statusLabels[reservation.status] || "Inconnu";
    state.append(badge);
    row.append(state);
    const actions = doc.createElement("td");
    if (reservation.status === "pending") {
      for (const [status, label] of [["confirmed", "Confirmer"], ["rejected", "Refuser"]]) {
        const button = doc.createElement("button");
        button.type = "button";
        button.dataset.id = String(reservation.id);
        button.dataset.status = status;
        button.textContent = label;
        button.setAttribute("aria-label", `${label} la réservation de ${reservation.name}`);
        actions.append(button);
      }
    } else actions.textContent = "Traitée";
    row.append(actions);
    tbody.append(row);
  }
}
