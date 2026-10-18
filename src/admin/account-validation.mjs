export function accountPayload(values, { creating = false, profile = false, originalEmail = "" } = {}) {
  const data = { name: (values.name || "").trim(), email: (values.email || "").trim() };
  const errors = {};
  if (!data.name || data.name.length > 255) errors.name = "Indiquez un nom de 1 à 255 caractères.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 254) errors.email = "Indiquez une adresse email valide (254 caractères maximum).";
  if (creating || values.password) {
    data.password = values.password || "";
    data.password_confirmation = values.password_confirmation || "";
    if (data.password.length < 12 || data.password.length > 1024) errors.password = "Choisissez un mot de passe de 12 à 1 024 caractères.";
    if (data.password_confirmation !== data.password || !data.password_confirmation) errors.password_confirmation = "Les deux mots de passe doivent être identiques.";
  } else if (values.password_confirmation) errors.password_confirmation = "Indiquez d’abord le nouveau mot de passe.";
  if (profile) {
    if (data.email !== originalEmail || data.password) {
      data.current_password = values.current_password || "";
      if (!data.current_password) errors.current_password = "Votre mot de passe actuel est nécessaire pour modifier l’email ou le mot de passe.";
    }
  } else data.is_admin = values.is_admin === true;
  return { data, errors };
}
