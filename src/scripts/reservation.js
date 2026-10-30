"use strict";

import { getTodayLocalDate, validateReservation } from "./reservation-validation.mjs";
import { createReservation, getAvailability, ReservationServiceError } from "../services/reservationService.mjs";
import { parseSlotValue, renderSlotOptions } from "./availability-slots.mjs";

const reservationForm = document.querySelector("#reservation-form");
const reservationStatus = document.querySelector("#reservation-status");

if (reservationForm && reservationStatus) {
  const dateInput = reservationForm.elements.namedItem("date");
  const guestsInput = reservationForm.elements.namedItem("personnes");
  const timeSelect = reservationForm.elements.namedItem("heure");
  const timeHelp = document.getElementById("heure-help");
  let availabilityVersion = 0;

  if (dateInput instanceof HTMLInputElement) {
    dateInput.min = getTodayLocalDate();
  }

  function resetSlots(message = "Choisissez d’abord une date") {
    availabilityVersion++;
    if (!(timeSelect instanceof HTMLSelectElement)) return;
    timeSelect.replaceChildren(new Option(message, ""));
    timeSelect.disabled = true;
    if (timeHelp) timeHelp.textContent = "";
  }

  async function loadSlots() {
    if (!(timeSelect instanceof HTMLSelectElement) || !(dateInput instanceof HTMLInputElement)) return;
    const date = dateInput.value;
    if (!date || date < getTodayLocalDate()) return resetSlots();

    const version = ++availabilityVersion;
    const previous = timeSelect.value;
    const guests = Number(guestsInput?.value);
    timeSelect.disabled = true;
    if (timeHelp) timeHelp.textContent = "Recherche des créneaux disponibles…";

    try {
      const slots = await getAvailability({ date, guests: Number.isInteger(guests) && guests >= 1 && guests <= 10 ? guests : undefined });
      if (version !== availabilityVersion) return;
      renderSlotOptions(timeSelect, slots);
      if (slots.some((slot) => `${slot.service_key}|${slot.time}` === previous)) timeSelect.value = previous;
      if (timeHelp) timeHelp.textContent = slots.length ? "" : "Aucun créneau n’est disponible pour cette date. Essayez un autre jour ou un autre nombre de personnes.";
    } catch (error) {
      if (version !== availabilityVersion) return;
      resetSlots("Créneaux indisponibles");
      if (timeHelp) {
        timeHelp.textContent = error instanceof ReservationServiceError && error.code === "VALIDATION_FAILED"
          ? Object.values(error.validationErrors).flat().join(" ") || error.message
          : "Impossible de charger les créneaux. Réessayez dans un instant.";
      }
    }
  }

  dateInput?.addEventListener("change", loadSlots);
  guestsInput?.addEventListener("change", loadSlots);

  reservationForm.addEventListener("input", () => {
    reservationStatus.textContent = "";
  });

  reservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!reservationForm.reportValidity()) return;

    const fields = Object.fromEntries(new FormData(reservationForm));
    const slot = parseSlotValue(fields.heure);
    const result = validateReservation({
      name: fields.nom,
      email: fields.email,
      phone: fields.telephone,
      date: fields.date,
      time: slot.time,
      guests: fields.personnes,
    });

    if (!result.valid) {
      reservationStatus.textContent = Object.values(result.errors).join(" ");
      return;
    }

    const submitButton = reservationForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    reservationStatus.textContent = "Envoi de la demande en cours...";

    try {
      const response = await createReservation({
        name: fields.nom.trim(),
        email: fields.email.trim(),
        phone: fields.telephone.trim(),
        date: fields.date,
        time: slot.time,
        service_key: slot.serviceKey,
        guests: Number(fields.personnes),
      });

      reservationForm.reset();
      resetSlots();
      reservationStatus.textContent =
        typeof response?.message === "string"
          ? response.message
          : "Votre demande a été transmise à l'API.";
      if (typeof response?.registration_token === "string") {
        let access = document.getElementById("reservation-client-access");
        if (!access) {
          access = document.createElement("div");
          access.id = "reservation-client-access";
          access.className = "reservation-status";
          reservationStatus.after(access);
        }
        access.replaceChildren();
        const explanation = document.createElement("p");
        explanation.textContent = "Conservez cette clé confidentielle : elle permet de créer votre compte client ou de rattacher cette réservation à votre compte. Valable 7 jours, un seul usage. Elle ne sera pas réaffichée après fermeture de cette page.";
        const label = document.createElement("label");
        label.htmlFor = "reservation-registration-key"; label.textContent = "Clé confidentielle";
        const key = document.createElement("input");
        key.id = "reservation-registration-key"; key.type = "password"; key.value = response.registration_token; key.readOnly = true; key.autocomplete = "off"; key.className = "form-control";
        const reveal = document.createElement("button");
        reveal.type = "button"; reveal.textContent = "Afficher la clé";
        reveal.addEventListener("click", () => { key.type = key.type === "password" ? "text" : "password"; reveal.textContent = key.type === "password" ? "Afficher la clé" : "Masquer la clé"; });
        const link = document.createElement("a");
        link.href = "/login.html#register"; link.textContent = "Créer mon compte client";
        access.append(explanation, label, key, reveal, document.createTextNode(" · "), link);
      }
    } catch (error) {
      if (error instanceof ReservationServiceError && error.code === "API_NOT_CONFIGURED") {
        reservationStatus.textContent =
          "L'API n'est pas configurée. Aucune donnée n'a été envoyée ; vos champs sont conservés.";
      } else if (error instanceof ReservationServiceError && error.code === "VALIDATION_FAILED") {
        const messages = Object.values(error.validationErrors).flat();
        reservationStatus.textContent = messages.length
          ? messages.join(" ")
          : "L'API a refusé certaines informations. Vérifiez les champs et réessayez.";
        loadSlots();
      } else {
        reservationStatus.textContent =
          "Impossible de transmettre la demande. Aucune confirmation reçue ; vos champs sont conservés.";
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
