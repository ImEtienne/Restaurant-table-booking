export function placeholderFor(name, type = "text") {
  const labels = {
    name: "Ex. Camille Martin", nom: "Ex. Camille Martin",
    email: "Ex. camille@exemple.fr",
    phone: "Ex. 06 12 34 56 78", telephone: "Ex. 06 12 34 56 78",
    current_password: "Saisissez votre mot de passe actuel",
    password_confirmation: "Saisissez à nouveau le mot de passe",
    registration_token: "Collez votre clé confidentielle de 64 caractères",
    guests: "Ex. 2", personnes: "Ex. 2",
    user_id: "Ex. 12 — identifiant du client",
    reservation_id: "Ex. 42 — identifiant de la réservation",
    date: "JJ/MM/AAAA", start_date: "JJ/MM/AAAA", end_date: "JJ/MM/AAAA",
    time: "HH:MM", heure: "HH:MM",
  };
  if (labels[name]) return labels[name];
  if (name === "password") return "Saisissez votre mot de passe";
  return type === "search" ? "Que recherchez-vous ?" : "";
}

export function applyPlaceholders(root = document) {
  root.querySelectorAll("input").forEach((input) => {
    if (["checkbox", "radio", "hidden", "submit", "button"].includes(input.type) || input.placeholder) return;
    input.placeholder = input.autocomplete === "new-password" && input.name === "password"
      ? "Choisissez un mot de passe (12 caractères minimum)" : placeholderFor(input.name, input.type);
  });
}
