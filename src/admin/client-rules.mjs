export function canChangeReservation(reservation, now = new Date(), timezone = "Europe/Paris") {
  if (reservation.status !== "pending") return false;
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now).replace(" ", "T");
  return `${reservation.date}T${reservation.time.length === 5 ? `${reservation.time}:00` : reservation.time}` > parts;
}

export function clientReservationPayload(values) {
  return { name: values.name.trim(), phone: values.phone.trim(), date: values.date, time: values.time, guests: Number(values.guests) };
}
