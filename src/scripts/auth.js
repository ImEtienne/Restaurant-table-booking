import "../styles/style.css";
import "../styles/auth.css";
import { createAdminService } from "../services/adminService.mjs";

import { validateAuth, authErrorMessage } from "./auth-validation.mjs";
import { showToast } from "./toast.js";

const adminApi = createAdminService();

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

const inputs = [...form.querySelectorAll("input")];
form.noValidate = true;
const fieldErrors = new Map();
for (const input of inputs) {
  const error = document.createElement("small");
  error.id = `${input.id}-error`;
  error.className = "auth-field-error";
  input.closest(".auth-field").append(error);
  input.setAttribute("aria-describedby", [input.getAttribute("aria-describedby"), error.id].filter(Boolean).join(" "));
  fieldErrors.set(input.name, error);
}
function values() {
  return Object.fromEntries(inputs.map((input) => [input.name, input.value]));
}
function showErrors(errors) {
  for (const input of inputs) {
    const message = errors[input.name] || "";
    fieldErrors.get(input.name).textContent = message;
    input.setAttribute("aria-invalid", String(Boolean(message)));
  }
}
let submitted = false;
form.addEventListener("focusout", () => {
  showErrors(validateAuth(values(), Boolean(confirmation)));
});
form.addEventListener("input", () => {
  status.textContent = "";
  if (submitted) showErrors(validateAuth(values(), Boolean(confirmation)));
  else {
    for (const input of inputs) {
      if (input.getAttribute("aria-invalid") === "true") {
        const errors = validateAuth(values(), Boolean(confirmation));
        fieldErrors.get(input.name).textContent = errors[input.name] || "";
        input.setAttribute("aria-invalid", String(Boolean(errors[input.name])));
      }
    }
  }
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return;
  submitted = true;
  const errors = validateAuth(values(), Boolean(confirmation));
  showErrors(errors);
  if (Object.keys(errors).length) {
    showToast("Certains champs sont incorrects. Consultez les indications sous les champs.");
    inputs.find((input) => errors[input.name])?.focus();
    return;
  }
  if (form.id !== "login-form") {
    showToast("L’inscription publique n’est pas disponible. Contactez le restaurant pour obtenir un accès administrateur.");
    return;
  }
  const label = submit.textContent;
  submit.disabled = true;
  submit.classList.add("is-loading");
  submit.textContent = "Connexion en cours…";
  form.setAttribute("aria-busy", "true");
  try {
    await adminApi.login(form.elements.namedItem("email").value.trim(), password.value);
    password.value = "";
    try { sessionStorage.setItem("auth-success", "1"); } catch { /* Optional flash. */ }
    location.assign("/dashboard.html");
  } catch (error) {
    const apiErrors = {};
    for (const [field, messages] of Object.entries(error.errors || {})) {
      if (fieldErrors.has(field)) apiErrors[field] = Array.isArray(messages) ? messages.join(" ") : String(messages);
    }
    showErrors(apiErrors);
    inputs.find((input) => apiErrors[input.name])?.focus();
    showToast(authErrorMessage(error));
  } finally {
    submit.disabled = false;
    submit.classList.remove("is-loading");
    submit.textContent = label;
    form.setAttribute("aria-busy", "false");
  }
});
});
