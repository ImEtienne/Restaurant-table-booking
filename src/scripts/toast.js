import "../styles/toast.css";

export function showToast(message, type = "error") {
  let region = document.getElementById("toast-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "toast-region";
    region.className = "toast-region";
    region.setAttribute("aria-live", "polite");
    document.body.append(region);
  }
  region.replaceChildren();
  const toast = document.createElement("div");
  toast.className = `site-toast site-toast-${type}`;
  const text = document.createElement("span");
  text.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Fermer la notification");
  close.addEventListener("click", () => toast.remove());
  toast.append(text, close);
  region.append(toast);
  // Les erreurs restent visibles jusqu’à fermeture ou nouvelle notification.
  if (type === "success") setTimeout(() => toast.remove(), 7000);
}
