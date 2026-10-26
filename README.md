# Titre du Projet : *Site de Réservation de Table*

## Description

Le projet "Site de Réservation de Table" est une application web interactive développée en utilisant les technologies de base du web telles que HTML, CSS et JavaScript. Cette application permet aux utilisateurs de réserver une table dans un restaurant de manière pratique et conviviale.

## Fonctionnalités

- Structuration du contenu de la page web en utilisant HTML pour décrire les éléments de la page.
- Stylisation et mise en forme de l'apparence de la page à l'aide de CSS.
- Ajout de fonctionnalités interactives et dynamiques à la page grâce à JavaScript.
- Validation des champs de réservation côté navigateur ; aucune donnée n'est transmise avant la connexion à l'API.
- Manipulation du DOM pour mettre à jour dynamiquement le contenu de la page en réponse aux actions de l'utilisateur.
- Organisation du code en suivant les bonnes pratiques de développement web, y compris la séparation du contenu, de la présentation et de la logique.
- Utilisation de balises sémantiques HTML pour améliorer la lisibilité et le référencement de la page.
- Structuration du CSS en utilisant des classes et des sélecteurs pour une meilleure réutilisabilité et maintenabilité.
- Organisation du JavaScript en utilisant des modules pour une meilleure encapsulation et modularité.

## Technologies

- HTML : Utilisé pour structurer et décrire le contenu de la page web.
- CSS : Utilisé pour styliser et mettre en forme l'apparence de la page.
- JavaScript : Utilisé pour ajouter des fonctionnalités interactives et dynamiques à la page, telles que la validation des formulaires et la manipulation du DOM.

## Structure du projet

- `index.html` : point d'entrée de la page d'accueil.
- `about.html` : page de présentation du restaurant.
- `src/main.js` : point d'entrée JavaScript et CSS de Vite.
- `src/scripts/` : logique JavaScript.
- `src/styles/` : feuilles de style.
- `src/services/` : communication HTTP avec l'API.
- `public/img/` : images et icônes statiques servies par Vite.
- `tests/` : tests automatisés des règles de réservation.

## Administration

En développement (`npm run dev`), les appels admin et CSRF passent par le proxy Vite vers l’origine de `VITE_API_BASE_URL`, pour conserver une origine unique côté navigateur. Redémarrer Vite après modification de sa configuration. En production, le service utilise directement `VITE_API_BASE_URL` et nécessite la configuration Sanctum/CORS décrite ci-dessous.

L’entrée `/dashboard.html` adapte la sidebar, les cartes, le tableau et le thème du dossier de référence `dashboard-design - Copie`, conservé intact. Les styles admin sont chargés séparément du site public.

- `src/admin/main.js` : session, navigation, filtres, pagination et décisions.
- `src/admin/reservationTable.mjs` : rendu du tableau avec données traitées comme texte.
- `src/services/adminService.mjs` : requêtes Sanctum, cookies et CSRF.
- `src/styles/admin.css` : présentation et adaptation mobile du dashboard.

La connexion appelle `/api/login`, puis oriente les administrateurs vers le dashboard et les clients vers `/dashboard.html#client`. La déconnexion utilise `/api/logout`. L’inscription client utilise `/api/client/register` avec l’email de réservation, un mot de passe confirmé de 12 caractères minimum et une clé confidentielle de 64 caractères. Le nom provient de la réservation. Le compte créé attend l’activation admin et n’est pas connecté automatiquement. Les comptes se créent aussi dans « Utilisateurs » ou via la commande Laravel `php artisan admin:create email@example.com`.

Après une réservation publique, la clé confidentielle est affichée uniquement sur la page de confirmation, masquée par défaut, sans stockage navigateur ni inclusion dans une URL. Elle expire après 7 jours et ne peut être utilisée qu’une fois. Le client doit la conserver avant de fermer la page.

L’espace client (`src/admin/client.js`) utilise les 7 opérations authentifiées de réservation et statistiques : liste paginée, détail, création, modification, annulation, rattachement par clé et statistiques personnelles. L’email, le propriétaire et le statut ne sont jamais envoyés par les formulaires client. Seules les réservations pending et futures sont modifiables/annulables ; le serveur reste l’autorité finale, notamment pour le fuseau et les changements d’heure. Les annulations conservent la réservation avec le statut cancelled.

Les administrateurs disposent de `PATCH /api/admin/users/{id}/activation` dans la liste des utilisateurs et de `PATCH /api/admin/reservations/{id}/client` dans le formulaire de rattachement des réservations. Ce rattachement ne change pas le statut et n’associe pas automatiquement les autres réservations ayant le même email.

« Utilisateurs » propose une liste paginée, une fiche de modification, la création et la suppression avec confirmation. Les modifications utilisent `PATCH /api/admin/users/{id}` ; `PUT` est une alternative documentée. Les droits se modifient via la case Administrateur. Le serveur reste responsable du refus de suppression de soi-même et de suppression/rétrogradation du dernier administrateur (409).

« Mon profil » utilise `GET/PATCH /api/profile`. Le mot de passe actuel est exigé pour modifier l’email ou le mot de passe ; aucun rôle n’est envoyé. Les nouveaux mots de passe sont de 12 à 1 024 caractères, avec confirmation. Les formulaires affichent les erreurs par champ et des notifications toast.

Les tests utilisent des API et DOM simulés et couvrent les contrats HTTP, CSRF, validations, rendu, créations, erreurs, permissions visibles et doubles soumissions. Ils ne remplacent pas une recette avec comptes réels dans un navigateur.

En développement, ouvrir le frontend avec le même hôte que l’API (`127.0.0.1` des deux côtés ou `localhost` des deux côtés). Configurer côté Laravel les origines réelles dans `FRONTEND_URLS` et les hôtes avec ports dans `SANCTUM_STATEFUL_DOMAINS`, avec CORS autorisant les cookies et les en-têtes CSRF. `VITE_API_BASE_URL` se termine par `/api` ; l’initialisation CSRF utilise la racine du backend.

Les statistiques globales utilisent `/api/admin/stats`, `/api/admin/stats/daily` et `/api/admin/stats/hourly`, avec une période indépendante des filtres du tableau (366 jours maximum, bornes incluses). Sans dates : les 30 derniers jours selon le fuseau du restaurant. Elles portent sur la date prévue de réservation et les statuts actuels. Les personnes demandées incluent les refus ; les personnes confirmées ne mesurent pas la présence effective. Le total du tableau vient de `meta.total`. Confirmer/refuser n’envoie aucun email.

## Commandes

- `npm install` : installe les dépendances du projet.
- `npm run dev` : lance le serveur de développement.
- `npm test` : vérifie les règles de validation des réservations.
- `npm run build` : génère la version de production dans `dist/`.
- `npm run preview` : sert localement la version de production.
