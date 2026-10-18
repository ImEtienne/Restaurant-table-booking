export function confirmDialog({ title, message, confirmLabel = "Confirmer" }) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const dialog = document.createElement("dialog");
    dialog.className = "site-confirm-dialog";
    const heading = document.createElement("h2"); heading.id = "confirm-dialog-title"; heading.textContent = title;
    dialog.setAttribute("aria-labelledby", heading.id);
    const description = document.createElement("p"); description.id = "confirm-dialog-description"; description.textContent = message;
    dialog.setAttribute("aria-describedby", description.id);
    const form = document.createElement("form"); form.method = "dialog";
    const cancel = document.createElement("button"); cancel.type = "submit"; cancel.value = "cancel"; cancel.textContent = "Annuler"; cancel.autofocus = true;
    const confirm = document.createElement("button"); confirm.type = "submit"; confirm.value = "confirm"; confirm.textContent = confirmLabel; confirm.className = "dialog-confirm";
    form.append(cancel, confirm); dialog.append(heading, description, form);
    dialog.addEventListener("close", () => {
      const accepted = dialog.returnValue === "confirm";
      dialog.remove();
      if (previous?.isConnected) previous.focus();
      resolve(accepted);
    }, { once: true });
    document.body.append(dialog); dialog.showModal();
  });
}
