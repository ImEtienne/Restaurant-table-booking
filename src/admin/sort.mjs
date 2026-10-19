const statusOrder = { pending: 0, confirmed: 1, rejected: 2, cancelled: 3 };
const byText = (a, b) => String(a ?? "").localeCompare(String(b ?? ""), "fr", { sensitivity: "base" });
const when = (row) => `${row.date ?? ""} ${row.time ?? ""}`;

const comparators = {
  "date-asc": (a, b) => byText(when(a), when(b)),
  "date-desc": (a, b) => byText(when(b), when(a)),
  name: (a, b) => byText(a.name, b.name),
  status: (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || byText(when(a), when(b)),
};

// Tri sur la page affichée uniquement ; sans clé connue, l'ordre du serveur est conservé.
export function sortReservations(rows, key) {
  const compare = comparators[key];
  return compare ? [...rows].sort(compare) : rows;
}
