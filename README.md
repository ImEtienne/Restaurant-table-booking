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
- `src/main.js` : point d'entrée JavaScript et CSS de Vite.
- `src/scripts/` : logique JavaScript.
- `src/styles/` : feuilles de style.
- `src/services/` : communication HTTP avec l'API.
- `public/img/` : images et icônes statiques servies par Vite.
- `tests/` : tests automatisés des règles de réservation.

## Commandes

- `npm install` : installe les dépendances du projet.
- `npm run dev` : lance le serveur de développement.
- `npm test` : vérifie les règles de validation des réservations.
- `npm run build` : génère la version de production dans `dist/`.
- `npm run preview` : sert localement la version de production.
