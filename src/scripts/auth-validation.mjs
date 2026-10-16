export function validateAuth(values, register = false) {
  const errors = {};
  if (register && !values.name?.trim()) errors.name = "Indiquez votre nom complet.";
  else if (register && values.name.length > 100) errors.name = "Le nom ne doit pas dépasser 100 caractères.";
  if (!values.email?.trim()) errors.email = "Indiquez votre adresse email.";
  else if (values.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Indiquez une adresse email valide, par exemple nom@exemple.fr.";
  if (!values.password) errors.password = "Indiquez votre mot de passe.";
  else if (values.password.length > 1024) errors.password = "Le mot de passe ne doit pas dépasser 1 024 caractères.";
  else if (register && values.password.length < 8) errors.password = "Choisissez un mot de passe d’au moins 8 caractères.";
  if (register && !values.password_confirmation) errors.password_confirmation = "Confirmez votre mot de passe.";
  else if (register && values.password_confirmation !== values.password) errors.password_confirmation = "Les deux mots de passe ne sont pas identiques.";
  return errors;
}

export function authErrorMessage(error) {
  if (error.status === 422) return "Connexion refusée. Vérifiez votre email et votre mot de passe. Un compte administrateur est nécessaire.";
  if (error.status === 429) return `Trop de tentatives. Réessayez ${error.retryAfter ? `dans ${error.retryAfter} secondes` : "dans une minute"}.`;
  if (error.code === "CSRF_COOKIE_MISSING") return "Le cookie de sécurité est inaccessible. Autorisez les cookies du site, puis rechargez la page.";
  if (error.status === 419) return "Votre session de sécurité a expiré. Rechargez la page et réessayez.";
  if (error.status >= 500) return "Le serveur rencontre un problème. Réessayez plus tard.";
  return error.message || "La connexion a échoué. Vérifiez votre accès au réseau.";
}
