export function mountReservationKeyCopy({ key, button, status, clipboard = globalThis.navigator?.clipboard }) {
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    status.textContent = "";
    try {
      if (!clipboard?.writeText) throw new Error("Presse-papiers indisponible");
      await clipboard.writeText(key.value);
      status.textContent = "Clé copiée dans le presse-papiers.";
    } catch {
      status.textContent = "Impossible de copier la clé. Affichez-la et copiez-la manuellement.";
    } finally {
      button.disabled = false;
    }
  });
}
