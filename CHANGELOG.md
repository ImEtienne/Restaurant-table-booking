# Changelog

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et versionnage [SemVer](https://semver.org/lang/fr/).

## Publier une version

1. Pousser les commits sur `main`, directement ou en fusionnant une PR depuis `dev`.
2. Le workflow `release.yml` vérifie les tests et le build, puis lance semantic-release, sans PR de version.
3. semantic-release calcule la prochaine version depuis le dernier tag, met à jour la version des fichiers npm dans le runner, recompile l'application, puis crée le tag `vX.Y.Z` et la release GitHub avec les notes et l'archive de production.

`feat:` augmente la version minor ; `fix:`, `patch:`, `chore:`, `docs:`, `perf:`, `refactor:`, `style:`, `test:`, `build:`, `ci:`, `revert:` et `update:` augmentent la version patch. Un `!` après le type ou un pied de commit `BREAKING CHANGE:` augmente la version major. Le changement le plus important depuis la dernière release détermine la prochaine version. Les préfixes inconnus ne sont pas inclus.

Un push sur `dev` exécute les vérifications ; la publication commence après fusion dans `main`. En cas de squash, conserver un titre de commit conforme, par exemple `feat: ajouter les notifications`.

Le jeton `GITHUB_TOKEN` fourni par GitHub Actions utilise uniquement `contents: write`. L'autorisation de créer des PR n'est pas nécessaire. Aucune publication npm n'est effectuée.

Les tags Git et les releases GitHub font foi pour les versions publiées. Les modifications de version de `package.json` et `package-lock.json` restent dans le runner : aucun commit automatique n'est poussé. Ce changelog historique reste dans le dépôt ; les nouvelles notes sont générées dans les releases GitHub. `npm run release` est destiné au workflow CI ; ne plus créer de version avec `npm version`.

## [1.1.0](https://github.com/ImEtienne/Restaurant-table-booking/compare/v1.0.0...v1.1.0) (2026-11-14)


### Fonctionnalités

* add btn copy to home page ([0e944ea](https://github.com/ImEtienne/Restaurant-table-booking/commit/0e944eaf812e3582402167cb483907128507abf6))
* add dropdown notification ([f1e6708](https://github.com/ImEtienne/Restaurant-table-booking/commit/f1e6708e5504304d42ab052415f2197c32d10f66))


### Correctifs

* correction MÀJ release ([c896fe6](https://github.com/ImEtienne/Restaurant-table-booking/commit/c896fe61ed5c2df6cf0c9c604767b716f9208e71))


### Mises à jour

* test ([e76942e](https://github.com/ImEtienne/Restaurant-table-booking/commit/e76942ed91fecbf34abb9e1df7f5aa44f9ce4e23))


### Maintenance

* add anaimation scroll revealto home page ([3e6b599](https://github.com/ImEtienne/Restaurant-table-booking/commit/3e6b599edebe262ba27b0a01a354eaa2fc536ce3))
* add btn && design dashboard ([990ba35](https://github.com/ImEtienne/Restaurant-table-booking/commit/990ba3586e97c64cfcf29148f4f4f82e78c6684c))
* add link css in header ([503bb5d](https://github.com/ImEtienne/Restaurant-table-booking/commit/503bb5d2c0ec0416487e595b969a9ed1168afb04))
* add pagination ([7b20982](https://github.com/ImEtienne/Restaurant-table-booking/commit/7b20982e4fd0bcc19a0d36ec4048337dc1953d1f))
* changement du style dans le sidebar côté dashbaord ([13c9dd0](https://github.com/ImEtienne/Restaurant-table-booking/commit/13c9dd05cf591f44540552a0d26a57d79a540b8b))
* clean code ([963c74d](https://github.com/ImEtienne/Restaurant-table-booking/commit/963c74d5f1defa3f47bde6659329b1ac9bc82805))
* mv rattacher une reservation à un client ([657b0bf](https://github.com/ImEtienne/Restaurant-table-booking/commit/657b0bfef25c77331c3f0f70731c7434bd1aed7f))
* Refactor code for improved readability and maintainability ([b496658](https://github.com/ImEtienne/Restaurant-table-booking/commit/b49665864cd7a0ce5d0613a734cba82b4c69e94c))
* update animation to dashboard ([b92a6f1](https://github.com/ImEtienne/Restaurant-table-booking/commit/b92a6f136808d6beeba141d7f4c0a0fe8b15d395))
* update design card current activity to dashboard ([d0994d5](https://github.com/ImEtienne/Restaurant-table-booking/commit/d0994d50f22d140e0f15dea93e6ddda4836545b0))

## [Non publié]

## [1.0.0] - 2026-11-02

### Ajouté
- Accueil du dashboard statistique : KPI avec tendances et sparklines, courbe lissée, histogramme horaire, anneau de statuts, activité récente et calendrier.
- Animations et infobulles interactives sur les graphiques (`motion`).
- Bouton « remonter en haut » avec anneau de progression du défilement sur la page d'accueil.
- Affichage de la version dans le pied de page.

### Modifié
- Sidebar du dashboard plus compacte, sans retour à la ligne.
- Filtre de période et fil d'ariane retirés de l'accueil du dashboard.
