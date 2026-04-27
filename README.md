# Site AFAR — Association des Footballeurs Antiracistes

Site statique HTML/CSS/JS — destiné à GitHub Pages. **Prêt à publier.**

## Pages

- `index.html` — Accueil
- `qui-sommes-nous.html` — L'association
- `nos-valeurs.html` — Nos valeurs
- `notre-equipe.html` — Notre équipe (anonymisée par profils)
- `charte-clubs.html` — Charte clubs (recentrée sur le racisme)
- `charte-medias.html` — Charte médias (toutes discriminations)
- `signataires.html` — Liste des signataires
- `observatoire.html` — Observatoire des incidents (compteur, comité, soutiens, événements, formulaire de signalement)
- `actualites.html` — Publications, veille médiatique, mentions
- `faq.html` — Questions fréquentes
- `contact.html` — Contact et adhésion
- `merci.html` — Page de confirmation envoi formulaire
- `mentions-legales.html` — Mentions légales

## Structure

```
afar-site/
├── *.html          # 13 pages
├── css/
│   ├── style.css       # styles globaux + variables
│   └── responsive.css  # media queries
├── js/
│   └── main.js         # nav mobile, FAQ, fade-in, compteur, RSS Google Alerts
├── img/                # images (vide au lancement)
└── docs/               # PDF téléchargeables (à ajouter : charte-clubs.pdf, charte-medias.pdf)
```

## Ce qui est déjà fonctionnel

- **Formspree** : les 3 formulaires (contact, adhésion, signalement) pointent vers l'identifiant `xbdqzbvy`. Honeypot anti-spam (`_gotcha`) actif sur les trois. Redirection vers `merci.html` après envoi.
- **Typographie** : Barlow Condensed (display) et Source Serif 4 (corps) chargées depuis Google Fonts.
- **Navigation mobile** : hamburger fonctionnel.
- **Accordéon FAQ** : fonctionnel.
- **Animations scroll** : fade-in via IntersectionObserver.
- **Liens internes** : tous valides.

## Ce qui reste à compléter par l'AFAR

### `js/main.js` — en haut du fichier

- **`AFAR_COMPTEUR_INCIDENTS`** : nombre d'incidents recensés (laisser `null` tant que l'observatoire n'a pas démarré ; affiche `• • •`).
- **`AFAR_RSS_FEEDS.incidents`** : URL du flux RSS Google Alerts pour la veille des incidents.
- **`AFAR_RSS_FEEDS.mentions`** : URL du flux RSS Google Alerts pour les mentions de l'AFAR.

### Contenu

- **Adresse du siège social** : remplacer `[adresse à compléter]` dans `mentions-legales.html`.
- **Chiffres clés** : remplacer les `XX` dans `index.html` par les valeurs réelles (clubs/médias signataires) au moment opportun.
- **PDF des chartes** : déposer `charte-clubs.pdf` et `charte-medias.pdf` dans `docs/`.
- **Logos signataires** : ajouter les logos dans `img/` puis remplacer les `[ Logo à venir ]` dans `signataires.html` et `observatoire.html`.
- **Composition du comité scientifique** : remplacer les placeholders dans `observatoire.html`.
- **Citations de soutien** : remplacer les `Soutien à paraître.` dans `observatoire.html`.
- **Photos** : remplacer les placeholders `[Photo à venir]` (hero accueil) et placeholders d'événements.

### Réseaux sociaux et chaîne YouTube

Aucun lien réseaux sociaux n'est affiché tant que les comptes ne sont pas créés. Pour les ajouter plus tard, dans le footer de chaque page (juste avant le bouton « Adhérer ») :

```html
<div class="social-links">
  <a href="https://twitter.com/afar_football" aria-label="X / Twitter">X</a>
  <a href="https://instagram.com/afar_football" aria-label="Instagram">Instagram</a>
  <a href="https://linkedin.com/company/afar-football" aria-label="LinkedIn">LinkedIn</a>
</div>
```

## Typographie

- **Display** : Barlow Condensed (Google Fonts) — graisses 600 à 900
- **Corps** : Source Serif 4 (Google Fonts) — graisses 300 à 600

## Couleurs

- Vert d'accent : `#1a6b3c`
- Noir : `#0d0d0d`
- Fond : `#fafaf7`

## Déploiement GitHub Pages

1. Pousser le contenu du dossier sur la branche `main` d'un repo GitHub.
2. Activer GitHub Pages dans Settings → Pages → Source : `main` / `(root)`.
3. Le site est accessible à `https://[user].github.io/[repo]/`.

Le domaine `afar-football.fr` peut être configuré via un fichier `CNAME` à la racine.

## Sécurité formulaires

Honeypot anti-spam Formspree (`_gotcha`) intégré sur les 3 formulaires. Le champ est masqué visuellement et exclu de la navigation clavier (`tabindex="-1"`). Les soumissions de bots qui le remplissent sont silencieusement rejetées par Formspree.

## Sécurité données

Aucun cookie de mesure d'audience ni de traçage publicitaire. Les formulaires reposent sur Formspree (politique de confidentialité accessible sur leur site).
