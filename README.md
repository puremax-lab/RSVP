# Christmas Party II — site + RSVP + admin

Trois fichiers :

- `index.html` — la page d'invitation publique (intro cadeau + lettre, RSVP)
- `admin.html` — le tableau de bord protégé par mot de passe pour Kisha & Esthy
- `apps-script.gs` — le code à coller dans Google Apps Script (la "base de données")

Aucun nom de domaine à acheter : on héberge tout gratuitement sur **GitHub Pages**
(URL du type `https://ton-pseudo.github.io/christmas-party-2/`).

---

## Étape 1 — Créer la base de données (Google Sheet)

1. Allez sur [sheets.google.com](https://sheets.google.com) → **Feuille vierge**.
   Renommez-la par exemple *RSVP Christmas Party II*.
2. Menu **Extensions → Apps Script**.
3. Effacez le code par défaut, collez tout le contenu de `apps-script.gs`.
4. Dans le script, changez la ligne :
   ```js
   var ADMIN_KEY = 'CHANGE-MOI-2026';
   ```
   Remplacez `'CHANGE-MOI-2026'` par un mot de passe à vous (gardez-le secret —
   c'est la clé qui protège `admin.html`).
5. Cliquez sur **Déployer** (bouton bleu, en haut à droite) → **Nouveau déploiement**.
   - Cliquez sur la roue dentée à côté de "Sélectionner le type" → **Application Web**.
   - Exécuter en tant que : **Moi**.
   - Qui a accès : **Tout le monde**.
   - **Déployer**, puis autorisez l'accès (c'est votre propre script, Google va
     juste demander une confirmation).
6. Copiez l'URL qui se termine par `/exec`. C'est votre **APPS_SCRIPT_URL**.

> Si vous modifiez le script plus tard, il faut créer une **nouvelle version**
> du déploiement (Gérer les déploiements → crayon → Nouvelle version) pour
> que les changements soient pris en compte.

---

## Étape 2 — Brancher les fichiers sur votre Sheet

Ouvrez `index.html` **et** `admin.html`, tout en haut du `<body>`, et remplacez :

```html
<script>
  window.APPS_SCRIPT_URL = "COLLEZ_ICI_VOTRE_URL_APPS_SCRIPT";
</script>
```

par votre vraie URL (celle qui finit par `/exec`), dans les deux fichiers.

---

## Étape 3 — Mettre le site en ligne (GitHub Pages, gratuit, sans domaine)

1. Sur [github.com](https://github.com), créez un nouveau repository
   (par exemple `christmas-party-2`) — cochez **Public**.
2. Dans le repo, **Add file → Upload files**, glissez les 3 fichiers
   (`index.html`, `admin.html`, `apps-script.gs` peut rester en local, pas
   besoin de l'uploader s'il vous gêne, mais ce n'est pas grave non plus).
3. **Commit changes**.
4. Allez dans **Settings → Pages** (menu de gauche).
5. Sous "Build and deployment" → Source : **Deploy from a branch**,
   Branch : **main** / `(root)`, cliquez **Save**.
6. Après ~1 minute, GitHub affiche votre URL publique en haut de cette page :
   `https://<votre-pseudo>.github.io/christmas-party-2/`

C'est cette URL que vous partagez à vos invités. Le tableau de bord admin est
à `https://<votre-pseudo>.github.io/christmas-party-2/admin.html` (aussi
accessible via le petit lien "Espace organisateur" tout en bas de la page
d'invitation).

**Alternatives tout aussi valables**, si vous préférez éviter GitHub :
[Netlify Drop](https://app.netlify.com/drop) ou [Cloudflare Pages](https://pages.cloudflare.com)
— glisser-déposer le dossier, URL gratuite instantanée, aucune commande à taper.

---

## Comment ça marche

- Un invité remplit le RSVP → le site envoie les infos à votre Google Sheet
  (via l'Apps Script) → une ligne s'ajoute automatiquement.
- Il peut aussi doubler sa réponse par WhatsApp en un clic (bouton optionnel
  après confirmation) — pratique si jamais l'enregistrement échoue (pas de
  connexion, ad-blocker agressif, etc.).
- `admin.html` demande votre `ADMIN_KEY`, puis affiche : nombre total de
  réponses, présents/absents, total d'invités (en comptant les +1), un
  tableau cherchable/triable, et un export CSV.
- Le tableau se rafraîchit automatiquement toutes les 30 secondes.

**Note sécurité honnête** : `ADMIN_KEY` protège l'accès aux données (le
serveur Google la vérifie réellement), mais ce n'est pas un vrai compte
utilisateur — c'est largement suffisant pour un événement privé entre
proches, pas pour des données sensibles.

---

## Si vous préférez ne rien héberger vous-même

La version publiée sur claude.ai reste disponible et fonctionne tout de
suite (RSVP envoyé par WhatsApp), sans aucune de ces étapes — c'est
l'option "zéro configuration".
