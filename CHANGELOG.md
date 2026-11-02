# Changelog

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et versionnage [SemVer](https://semver.org/lang/fr/).

## Publier une version

1. Déplacer le contenu de « Non publié » sous un nouveau titre `## [X.Y.Z] - AAAA-MM-JJ`.
2. Lancer `npm run release:patch` (ou `release:minor`, `release:major`) : tests, build, mise à jour de `package.json`, commit et tag `vX.Y.Z`.
3. Envoyer le commit et le tag : `git push --follow-tags`. Le workflow `release.yml` crée la release GitHub.

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
