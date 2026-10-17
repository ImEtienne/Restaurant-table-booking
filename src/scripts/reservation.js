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
      } else {
        reservationStatus.textContent =
          "Impossible de transmettre la demande. Aucune confirmation reçue ; vos champs sont conservés.";
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
