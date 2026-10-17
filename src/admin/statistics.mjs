export function validatePeriod({ start_date, end_date }) {
  if (!start_date || !end_date) return "";
  const days = (Date.parse(end_date) - Date.parse(start_date)) / 86400000 + 1;
  if (days < 1) return "La fin de période doit être postérieure ou égale au début.";
  if (days > 366) return "La période ne peut pas dépasser 366 jours inclus.";
  return "";
}

export function renderMetrics(tbody, rows, key, doc = document) {
  tbody.replaceChildren();
  for (const item of rows) {
    const row = doc.createElement("tr");
    for (const field of [key, "total_reservations", "pending", "confirmed", "rejected", "cancelled", "total_guests", "confirmed_guests"]) {
      const cell = doc.createElement("td");
      cell.textContent = String(item[field] ?? 0);
      row.append(cell);
    }
    tbody.append(row);
  }
}
