import "../styles/style.css";
import "../styles/auth.css";

const tabs = [...document.querySelectorAll('[role="tab"]')];
function showPanel() {
  const mode = location.hash === "#register" ? "register" : "login";
  for (const tab of tabs) {
    const selected = tab.dataset.authSwitch === mode;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
  }
  document.title = `${mode === "register" ? "Inscription" : "Connexion"} | Restaurant XYZ`;
  document.getElementById("auth-welcome").textContent = mode === "register" ? "Une place pour vous." : "Heureux de vous retrouver.";
}
document.querySelectorAll("[data-auth-switch]").forEach((control) => {
  control.addEventListener("click", (event) => {
    event.preventDefault();
    location.hash = control.dataset.authSwitch;
    showPanel();
    document.getElementById(`${control.dataset.authSwitch}-tab`).focus();
  });
});
tabs.forEach((tab, index) => tab.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  tabs[event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + 1) % tabs.length].click();
}));
window.addEventListener("hashchange", showPanel);
showPanel();

document.querySelectorAll("[data-auth-form]").forEach((form) => {
const status = form.parentElement.querySelector("[data-auth-status]");
const password = form.elements.namedItem("password");
const confirmation = form.elements.namedItem("password_confirmation");

form.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.textContent = visible ? "Masquer" : "Afficher";
    button.setAttribute("aria-pressed", String(visible));
  });
});

function validateConfirmation() {
  confirmation?.setCustomValidity(
    confirmation.value !== password.value ? "Les mots de passe doivent être identiques." : "",
  );
}

form.addEventListener("input", () => {
  status.textContent = "";
  if (confirmation) validateConfirmation();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (confirmation) validateConfirmation();
  if (!form.reportValidity()) return;
  status.textContent = "Ce service sera disponible prochainement. Aucune donnée n’a été envoyée. Les accès administrateur seront attribués par le restaurant.";
});
});
