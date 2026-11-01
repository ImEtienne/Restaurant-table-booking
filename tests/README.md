# Tests du front

Exécuter avec Node.js 22 ou supérieur :

- `npm test` : tous les tests, sans serveur ni API réelle.
- `npm run test:coverage` : tests et rapport de couverture natif Node.
- `npm run check` : tests puis compilation Vite de production ; également exécuté en CI sur les push et pull requests.

Les suites couvrent les contrats HTTP, les erreurs réseau et serveur, CSRF, les permissions, les formulaires, les doubles soumissions, le rendu des données non fiables, les statistiques et les composants interactifs.

Suites complémentaires :

- `chart-motion.test.mjs` : animations, préférence de réduction des animations, survol, clavier, fermeture, changement de graphique, restauration du donut, données d'infobulle invalides et positionnement.
- `statistics-boundaries.test.mjs` : données absentes ou nulles, compteurs négatifs, échappement HTML, identifiants SVG uniques, tendances, changements de date et tris stables.
- `frontend-widgets.test.mjs` : consentement cookies, stockage bloqué, réouverture, notifications et temporisation, carrousel et observation des tableaux mobiles.

Les interactions utilisent des DOM simulés. Certaines entrées JavaScript sont exécutées dans `node:vm` avec dépendances simulées ; le rapport natif ne mesure donc pas intégralement ces modules et ne représente pas un pourcentage global fiable de l'application.

Aucune suite ne peut garantir tous les cas possibles. Ces tests ne vérifient pas le rendu CSS réel, les animations du navigateur ou l'intégration avec le backend déployé. Une recette navigateur reste nécessaire pour la mise en page mobile, le focus réel et les parcours avec session et API réelles. Pour chaque bug corrigé, ajouter un scénario qui échoue avant la correction.
