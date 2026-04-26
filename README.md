# Le Diplomate — Pronos Coupe du Monde 2026

Application web frontend (React + Vite + TypeScript) pour animer un concours de pronostics dans le bar **Le Diplomate** pendant la Coupe du Monde 2026.

## Objectif de cette version

Cette première étape fournit :
- une interface complète (pages, navigation, responsive),
- des données fictives (matchs, joueurs, pronostics),
- un stockage local avec `localStorage`,
- une architecture prête à évoluer vers Supabase + API foot.

> Lot visible dans l'interface : **1er prix = 50 € de consommation**.

## Stack technique

- React
- Vite
- TypeScript
- CSS custom mobile-first
- React Router (SPA)
- GitHub Actions + GitHub Pages

## Installation locale

```bash
npm install
npm run dev
```

L'application sera disponible (par défaut) sur `http://localhost:5173`.

## Build production

```bash
npm run build
```

## Déploiement GitHub Pages

Le workflow est dans `.github/workflows/deploy.yml`.

### 1) Vérifier `base` dans `vite.config.ts`

Le dépôt GitHub s'appelle **diplomate-foot**, la base Vite correcte est :

```ts
base: '/diplomate-foot/'
```

### 2) Activer Pages dans GitHub

Dans **Settings > Pages** du dépôt :
- Source: **GitHub Actions**.

### 3) Déployer

Push sur la branche `main`.
Le workflow build + deploy publiera automatiquement le site.

## Secours HTML en cas d’échec JavaScript

`index.html` contient un contenu de secours visible dans `#root`. Si ce contenu reste visible, cela signifie que React ou les assets JavaScript ne se chargent pas correctement.

## Si GitHub Pages affiche une page blanche

Causes possibles à vérifier :
- mauvais `base` dans `vite.config.ts`
- mauvais router React (préférer `HashRouter` pour GitHub Pages)
- erreur JavaScript dans la console du navigateur
- build non déployé
- mauvais réglage **Settings > Pages**

## Structure du projet

```text
src/
  components/
  pages/
  data/
  services/
  utils/
  types/
  styles/
```

## Fonctionnalités incluses

- **Accueil** : branding, lot, boutons d'action, aperçu classement et matchs.
- **Navigation SPA** : Accueil, Matchs, Classement, Connexion, Espace joueur, Admin.
- **Matchs** : statut, score final, verrouillage des pronostics (< 1h avant coup d'envoi).
- **Connexion fictive** : pseudo + code secret, puis stockage local du joueur connecté.
- **Espace joueur** : profil, points, liste des pronostics et état (ouvert/verrouillé/terminé).
- **Classement fictif** : top joueurs et mise en avant de la 1ère place.
- **Admin fictif** : boutons préparatoires pour prochaines étapes.

## Règles de points

Fonction utilitaire : `src/utils/points.ts`

- Score exact : 3 points
- Bon écart + bon vainqueur (ou bon nul) : 2 points
- Bon vainqueur uniquement : 1 point
- Mauvais pronostic : 0 point

Une démonstration est fournie dans `src/utils/points.demo.ts`.

## Étape suivante : connecter Supabase

Le dossier `src/services/` est déjà séparé par domaine (`playerService`, `matchService`, `predictionService`).

Plan conseillé :
1. Créer les tables Supabase (players, matches, predictions, standings).
2. Remplacer progressivement les lectures/écritures `localStorage` par des appels Supabase.
3. Protéger la page Admin avec rôle utilisateur.
4. Ajouter une authentification réelle (pseudo + code secret hashé).

## Étape suivante : connecter API-Football (ou équivalent)

⚠️ **Ne jamais exposer une clé API directement dans le frontend GitHub Pages.**

Passer par :
- **Supabase Edge Functions** (recommandé), ou
- **GitHub Action planifiée** qui met à jour des données côté stockage sécurisé.

## Commandes utiles

```bash
npm install
npm run dev
npm run build
```
