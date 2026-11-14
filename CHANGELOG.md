# Changelog

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et versionnage [SemVer](https://semver.org/lang/fr/).

## Publier une version

1. Pousser les commits sur `main`, directement ou en fusionnant une PR depuis `dev`.
2. Le workflow `release-please.yml` vérifie les tests et le build, puis ouvre ou actualise une PR de version avec `package.json`, `package-lock.json` et ce changelog.
3. Fusionner cette PR : le tag `vX.Y.Z` et la release GitHub sont créés automatiquement, puis `release.yml` compile et joint l'archive de production.

`feat:` augmente la version minor ; `fix:`, `patch:`, `chore:`, `docs:`, `perf:`, `refactor:`, `style:`, `test:`, `build:`, `ci:`, `revert:` et `update:` augmentent la version patch. Un `!` après le type ou un pied de commit `BREAKING CHANGE:` augmente la version major. Le changement le plus important depuis la dernière release détermine la prochaine version. Les préfixes inconnus ne sont pas inclus.

Un push sur `dev` exécute les vérifications ; la préparation de version commence après fusion dans `main`. En cas de squash, conserver un titre de commit conforme, par exemple `feat: ajouter les notifications`.

Dans GitHub → Settings → Actions → General → Workflow permissions, activer **Allow GitHub Actions to create and approve pull requests**. Avec le jeton `GITHUB_TOKEN` par défaut, les PR générées ne déclenchent pas les workflows de PR : si des vérifications sont obligatoires avant fusion, utiliser un jeton d'application GitHub ou personnel adapté dans l'action Release Please. Les tests et le build sont aussi exécutés avant publication.

Les commandes locales `npm run release:patch|minor|major` restent une alternative manuelle, suivies de `git push --follow-tags` ; ne pas les combiner avec une PR de version en cours. Le workflow `release.yml` accepte toujours les tags manuels.

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
