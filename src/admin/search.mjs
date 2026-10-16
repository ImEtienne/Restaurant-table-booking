const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");

export function searchReservations(rows, query) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    const text = normalize([row.id, row.name, row.email, row.phone].join(" "));
    return terms.every((term) => text.includes(term));
  });
}
