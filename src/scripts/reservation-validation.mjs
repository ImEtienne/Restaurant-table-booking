const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function getTodayLocalDate(date = new Date()) {
  const localDate = new Date(date.getTime());
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
}

export function validateReservation(fields, today = getTodayLocalDate()) {
  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  const email = typeof fields.email === "string" ? fields.email.trim() : "";
  const phone = typeof fields.phone === "string" ? fields.phone.trim() : "";
  const date = typeof fields.date === "string" ? fields.date : "";
  const time = typeof fields.time === "string" ? fields.time : "";
  const guests = fields.guests === "" || fields.guests == null
    ? Number.NaN
    : Number(fields.guests);
  const errors = {};

  if (!name) errors.name = "Indiquez votre nom.";
  else if (name.length > 100) errors.name = "Le nom ne doit pas dépasser 100 caractères.";

  if (!email) errors.email = "Indiquez votre adresse email.";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = "Indiquez une adresse email valide.";
  }

  if (phone.length < 6 || phone.length > 32) {
    errors.phone = "Le téléphone doit contenir entre 6 et 32 caractères.";
  }

  const parsedDate = DATE_PATTERN.test(date) ? new Date(`${date}T00:00:00.000Z`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    errors.date = "Indiquez une date valide.";
  } else if (date < today) {
    errors.date = "La date doit être aujourd'hui ou ultérieure.";
  }

  if (!TIME_PATTERN.test(time)) errors.time = "Indiquez une heure valide.";

  if (!Number.isInteger(guests) || guests < 1 || guests > 10) {
    errors.guests = "Le nombre de personnes doit être un entier entre 1 et 10.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}