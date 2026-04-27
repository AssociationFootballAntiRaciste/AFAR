# Site AFAR — Association des Footballeurs Antiracistes

Site statique HTML/CSS/JS — destiné à GitHub Pages. **Production-ready.**

## Pages

- `index.html` — Accueil
- `qui-sommes-nous.html` — L'association
- `nos-valeurs.html` — Nos valeurs
- `notre-equipe.html` — Notre équipe
- `charte-clubs.html` — Charte clubs
- `charte-medias.html` — Charte médias
- `signataires.html` — Liste des signataires
- `observatoire.html` — Observatoire des incidents
- `actualites.html` — Publications, veille médiatique, mentions
- `faq.html` — Questions fréquentes
- `contact.html` — Contact et adhésion
- `merci.html` — Page de confirmation envoi formulaire
- `mentions-legales.html` — Mentions légales

## Ce qui est déjà fonctionnel à la mise en ligne

- **Formulaires** (3) connectés à Formspree avec honeypot anti-spam.
- **Flux RSS Google Alerts** branché : alimente automatiquement la page d'accueil et la page actualités, et calcule le compteur d'incidents de l'observatoire.
- **Compteur observatoire** automatisé : compte les articles racisme depuis le 1ᵉʳ janvier 2026, avec dédoublonnage par similarité de titre.
- **Lien YouTube** : `https://youtube.com/@AFAR-Football` dans le footer et sur la page actualités.
- **Navigation mobile**, **accordéon FAQ**, **animations scroll** : opérationnels.

## Configuration possible (optionnel)

### `js/main.js` — en haut du fichier

**Compteur observatoire**

- `AFAR_COMPTEUR_MODE` : `"auto"` (par défaut, calcul depuis le flux RSS) | `"manuel"` (forcer une valeur) | `"off"` (placeholder).
- `AFAR_COMPTEUR_INCIDENTS` : valeur utilisée uniquement en mode `"manuel"`.
- `AFAR_COMPTEUR_DEPUIS` : date ISO de départ (`"2026-01-01"`).
- `AFAR_MOTS_RACISME` : liste des mots-clés pour filtrer les incidents racistes dans le flux global.

**Flux RSS**

- `AFAR_RSS_FEEDS.incidents` : URL Google Alerts pour la veille (déjà branchée).
- `AFAR_RSS_FEEDS.mentions` : URL Google Alerts pour les mentions de l'AFAR (à ajouter quand l'association sera médiatisée).

**Stabilité du flux**

- `RSS2JSON_KEY` : si vous créez un compte gratuit sur **rss2json.com**, collez votre clé ici pour des résultats encore plus stables (10 000 requêtes/jour). Sans clé, le système utilise des proxies CORS publics en fallback (allorigins, corsproxy, codetabs).

## À compléter par l'AFAR — contenu

### Tout de suite

- **Adresse du siège social** : remplacer `[adresse à compléter]` dans `mentions-legales.html`.
- **PDF des chartes** : déposer `charte-clubs.pdf` et `charte-medias.pdf` dans `docs/`.

### Quand le contenu existe

- **Photo du hero accueil** : remplacer le placeholder `[Photo à venir]` dans `index.html`.
- **Citations de soutien** : 3 emplacements dans `observatoire.html` (1 ancien joueur international français déjà labellisé + 2 « à venir »).
- **Composition du comité scientifique** : 4 placeholders dans `observatoire.html`.
- **Logos signataires** : ajouter dans `img/` puis remplacer les `[ Logo à venir ]` dans `signataires.html` et `observatoire.html`.
- **Chiffres clés accueil** : remplacer les `XX` dans `index.html` (clubs/médias signataires) au moment opportun.

### Réseaux sociaux

À ajouter dans le footer de chaque page (juste avant le bouton « Adhérer ») quand les comptes existeront :

```html
<div class="social-links">
  <a href="https://twitter.com/afar_football" aria-label="X / Twitter">X</a>
  <a href="https://instagram.com/afar_football" aria-label="Instagram">Instagram</a>
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

1. Pousser le contenu du dossier sur la branche `main` d'un repo GitHub public.
2. Activer GitHub Pages dans Settings → Pages → Source : `main` / `(root)`.
3. Le site est accessible à `https://[user].github.io/[repo]/`.

Le domaine `afar-football.fr` peut être configuré via un fichier `CNAME` à la racine.

## Sécurité

- **Formulaires** : honeypot anti-spam Formspree (`_gotcha`) actif sur les 3 formulaires (contact, adhésion, signalement).
- **Données** : aucun cookie de mesure d'audience ni de traçage publicitaire. Les formulaires reposent sur Formspree.

## Note sur le compteur d'incidents

Le compteur affiché sur la page d'accueil et l'observatoire est une **estimation** issue de la veille médiatique automatisée (Google Alerts). Il ne s'agit pas d'un dénombrement officiel : il dépend de la couverture médiatique des incidents et du dédoublonnage automatique. La précision du compteur reste comparable d'une période à l'autre, ce qui en fait un indicateur de tendance utile, mais sa valeur absolue doit être présentée avec la mention « estimation ».

Le filtrage racisme repose sur une liste de mots-clés (`AFAR_MOTS_RACISME` dans `js/main.js`) que l'AFAR peut affiner au fil de l'expérience.
