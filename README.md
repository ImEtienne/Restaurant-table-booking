# Restaurant XYZ

Site de restaurant en HTML, CSS et JavaScript, construit avec Vite et connecté à une API Laravel.

## Fonctionnalités

- Carte et formulaire de réservation avec créneaux disponibles.
- Inscription et espace client pour suivre et gérer les réservations.
- Administration des réservations, des utilisateurs et des notifications.
- Validation côté navigateur et affichage des erreurs de l’API.

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

Après une réservation publique, la clé confidentielle est affichée uniquement sur la page de confirmation, masquée par défaut, sans stockage navigateur ni inclusion dans une URL. Le bouton « Copier » utilise le presse-papiers du navigateur ; s’il est indisponible, la clé peut être affichée et copiée manuellement. Elle expire après 7 jours et ne peut être utilisée qu’une fois. Le client doit la conserver avant de fermer la page.

L’espace client (`src/admin/client.js`) utilise les 7 opérations authentifiées de réservation et statistiques : liste paginée, détail, création, modification, annulation, rattachement par clé et statistiques personnelles. L’email, le propriétaire et le statut ne sont jamais envoyés par les formulaires client. Seules les réservations pending et futures sont modifiables/annulables ; le serveur reste l’autorité finale, notamment pour le fuseau et les changements d’heure. Les annulations conservent la réservation avec le statut cancelled.

Les administrateurs disposent de `PATCH /api/admin/users/{id}/activation` dans la liste des utilisateurs et de `PATCH /api/admin/reservations/{id}/client` dans le formulaire de rattachement des réservations. Ce rattachement ne change pas le statut et n’associe pas automatiquement les autres réservations ayant le même email.

La cloche administrateur utilise `GET /api/admin/notifications` (20 par page), ainsi que `PATCH /api/admin/notifications/{uuid}/read` et `PATCH /api/admin/notifications/read-all`. Le compteur est global à toutes les pages. La liste est actualisée à la connexion et à l’ouverture du panneau, sans actualisation en temps réel. Les notifications concernent les créations, modifications et annulations de réservation par des clients, ainsi que les inscriptions de clients en attente. Pour ces dernières, « Voir le compte » ouvre la fiche correspondante et permet d’activer l’accès après confirmation. Ouvrir la fiche ne marque pas automatiquement la notification comme lue. Les événements antérieurs à leur mise en place ne sont pas repris.

Depuis la cloche, une notification ouvre son détail dans le centre ; « Voir toutes les notifications » ouvre également le centre avec sa liste paginée. Les actions individuelles sont disponibles dans le détail. Le filtre global des non-lues n’est pas proposé : l’API ne documente pas de filtre de ce type.

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
