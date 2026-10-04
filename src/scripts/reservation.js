"use strict";

import { getTodayLocalDate, validateReservation } from "./reservation-validation.mjs";
import { createReservation, ReservationServiceError } from "../services/reservationService.mjs";

const reservationForm = document.querySelector("#reservation-form");
const reservationStatus = document.querySelector("#reservation-status");

if (reservationForm && reservationStatus) {
  const dateInput = reservationForm.elements.namedItem("date");

  if (dateInput instanceof HTMLInputElement) {
    dateInput.min = getTodayLocalDate();
  }

  reservationForm.addEventListener("input", () => {
    reservationStatus.textContent = "";
  });

  reservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!reservationForm.reportValidity()) return;

    const fields = Object.fromEntries(new FormData(reservationForm));
    const result = validateReservation({
      name: fields.nom,
      email: fields.email,
      phone: fields.telephone,
      date: fields.date,
      time: fields.heure,
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
        time: fields.heure,
        guests: Number(fields.personnes),
      });

      reservationForm.reset();
      reservationStatus.textContent =
        typeof response?.message === "string"
          ? response.message
          : "Votre demande a été transmise à l'API.";
    } catch (error) {
      if (error instanceof ReservationServiceError && error.code === "API_NOT_CONFIGURED") {
        reservationStatus.textContent =
          "L'API n'est pas configurée. Aucune donnée n'a été envoyée ; vos champs sont conservés.";
      } else if (error instanceof ReservationServiceError && error.code === "VALIDATION_FAILED") {
        const messages = Object.values(error.validationErrors).flat();
        reservationStatus.textContent = messages.length
          ? messages.join(" ")
          : "L'API a refusé certaines informations. Vérifiez les champs et réessayez.";
      } else {
        reservationStatus.textContent =
          "Impossible de transmettre la demande. Aucune confirmation reçue ; vos champs sont conservés.";
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}