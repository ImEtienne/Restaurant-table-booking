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
