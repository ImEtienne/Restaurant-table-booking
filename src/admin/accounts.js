import { accountPayload } from "./account-validation.mjs";
import { showToast } from "../scripts/toast.js";

export function mountAccounts({ api, currentUser, onIdentity, onSessionError }) {
  const root = document.getElementById("admin-accounts");
  let revision = 0;
  let page = 1;
  let saving = false;
  function el(tag, text, parent = root) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    parent.append(node);
    return node;
  }
  function button(text, parent, action) {
    const node = el("button", text, parent);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }
  function fail(error, target) {
    const message = error.status === 409 ? "Cette opération est interdite : vous ne pouvez pas supprimer votre compte, supprimer ou rétrograder le dernier administrateur." : error.message;
    if (target) target.textContent = message;
    showToast(message);
    if ([401, 419].includes(error.status)) onSessionError(error);
  }
  async function editor(user, profile = false) {
    const token = ++revision;
    root.replaceChildren();
    const creating = !user;
    el("h2", profile ? "Mon profil" : creating ? "Créer un utilisateur" : "Fiche utilisateur");
    el("p", creating ? "Le compte sera créé par le restaurant. Le mot de passe doit contenir au moins 12 caractères." : "Laissez le nouveau mot de passe vide pour conserver le mot de passe actuel. Un changement d’email annule sa vérification.");
    const form = el("form");
    form.className = "admin-account-form";
    form.noValidate = true;
    const fields = {};
    const errors = {};
    const definitions = [["name", "Nom complet", "text"], ["email", "Adresse email", "email"], ["password", creating ? "Mot de passe" : "Nouveau mot de passe", "password"], ["password_confirmation", "Confirmer le mot de passe", "password"]];
    if (profile) definitions.push(["current_password", "Mot de passe actuel (si changement d’email ou de mot de passe)", "password"]);
    if (!profile) definitions.push(["is_admin", "Droits administrateur", "checkbox"]);
    for (const [name, label, type] of definitions) {
      const group = el("div", null, form);
      const id = `account-${name}`;
      const caption = el("label", label, group); caption.htmlFor = id;
      const input = el("input", null, group);
      input.id = id; input.name = name; input.type = type;
      if (name === "name") input.maxLength = 255;
      if (name === "email") input.maxLength = 254;
      if (type === "password") input.maxLength = 1024;
      input.autocomplete = name === "current_password" ? "current-password" : type === "password" ? "new-password" : name === "name" ? "name" : "email";
      if (type === "checkbox") input.checked = Boolean(user?.is_admin);
      else input.value = type === "password" ? "" : user?.[name] || "";
      const error = el("small", "", group);
      error.id = `${id}-error`; error.className = "admin-field-error";
      input.setAttribute("aria-describedby", error.id);
      fields[name] = input; errors[name] = error;
    }
    const notice = el("p", "", form); notice.setAttribute("role", "status");
    const submit = el("button", creating ? "Créer le compte" : "Enregistrer", form); submit.type = "submit";
    if (!profile) button("Retour à la liste", form, () => { if (!saving) list(); });
    function display(messages) {
      for (const name of Object.keys(fields)) {
        errors[name].textContent = Array.isArray(messages[name]) ? messages[name].join(" ") : messages[name] || "";
        fields[name].setAttribute("aria-invalid", String(Boolean(messages[name])));
      }
    }
    form.addEventListener("input", (event) => {
      const name = event.target.name;
      if (errors[name]) { errors[name].textContent = ""; fields[name].setAttribute("aria-invalid", "false"); }
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (saving) return;
      const values = Object.fromEntries(Object.entries(fields).map(([name, input]) => [name, input.type === "checkbox" ? input.checked : input.value]));
      const result = accountPayload(values, { creating, profile, originalEmail: user?.email });
      display(result.errors);
      if (Object.keys(result.errors).length) { fields[Object.keys(result.errors)[0]].focus(); return; }
      saving = true;
      submit.disabled = true; form.setAttribute("aria-busy", "true"); submit.textContent = "Enregistrement…";
      try {
        const response = profile ? await api.updateProfile(result.data) : creating ? await api.createUser(result.data) : await api.updateUser(user.id, result.data);
        if (profile || user?.id === currentUser.id) {
          Object.assign(currentUser, response.data);
          onIdentity(currentUser);
        }
        showToast("Informations enregistrées.", "success");
        if (revision !== token) return;
        if (profile) editor(response.data, true);
        else if (!currentUser.is_admin) location.hash = "profile";
        else list();
      } catch (error) {
        if (revision === token) { display(error.errors || {}); fail(error, notice); }
      } finally {
        saving = false; submit.disabled = false; submit.textContent = creating ? "Créer le compte" : "Enregistrer"; form.setAttribute("aria-busy", "false");
      }
    });
  }
  async function list() {
    if (!currentUser.is_admin) return;
    const token = ++revision;
    root.replaceChildren();
    el("h2", "Utilisateurs");
    const notice = el("p", "Chargement des utilisateurs…"); notice.setAttribute("role", "status");
    try {
      const result = await api.users(page);
      if (revision !== token) return;
      notice.textContent = `${result.meta.total} utilisateur(s)`;
      button("Créer un utilisateur", root, () => editor(null));
      const wrap = el("div"); wrap.className = "admin-table-wrap";
      const table = el("table", null, wrap);
      const head = el("tr", null, el("thead", null, table));
      for (const label of ["Nom", "Email", "Rôle", "Actions"]) { const th = el("th", label, head); th.scope = "col"; }
      const body = el("tbody", null, table);
      for (const user of result.data) {
        const row = el("tr", null, body);
        for (const value of [user.name, user.email, user.is_admin ? "Administrateur" : "Utilisateur"]) el("td", value, row);
        const actions = el("td", null, row);
        button("Voir / Modifier", actions, async () => {
          const version = revision;
          try { const response = await api.user(user.id); if (revision === version) editor(response.data); }
          catch (error) { fail(error, notice); }
        });
        const remove = button("Supprimer", actions, async () => {
          if (saving || !window.confirm(`Supprimer définitivement le compte de ${user.name} (${user.email}) ?`)) return;
          saving = true; remove.disabled = true;
          try { await api.deleteUser(user.id); showToast("Utilisateur supprimé.", "success"); if (page > 1 && result.data.length === 1) page--; if (revision === token) await list(); }
          catch (error) { fail(error, notice); }
          finally { saving = false; remove.disabled = user.id === currentUser.id; }
        });
        remove.disabled = user.id === currentUser.id;
        if (remove.disabled) remove.title = "Vous ne pouvez pas supprimer votre propre compte.";
      }
      if (!result.data.length) el("p", "Aucun utilisateur.");
      const nav = el("nav"); nav.className = "admin-pagination"; nav.setAttribute("aria-label", "Pages des utilisateurs");
      button("Précédent", nav, () => { page--; list(); }).disabled = result.meta.current_page <= 1;
      el("span", `Page ${result.meta.current_page} sur ${result.meta.last_page}`, nav);
      button("Suivant", nav, () => { page++; list(); }).disabled = result.meta.current_page >= result.meta.last_page;
    } catch (error) { if (revision === token) fail(error, notice); }
  }
  return {
    async activate(section) {
      if (section === "users") return list();
      if (section === "profile") {
        const token = ++revision;
        root.replaceChildren();
        const notice = el("p", "Chargement du profil…");
        try { const { data } = await api.profile(); if (revision === token) await editor(data, true); }
        catch (error) { if (revision === token) fail(error, notice); }
      } else revision++;
    },
  };
}
