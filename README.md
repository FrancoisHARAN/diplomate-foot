# Le Diplomate — Pronos Coupe du Monde 2026

Application web frontend (React + Vite + TypeScript) pour animer un concours de pronostics dans le bar **Le Diplomate** pendant la Coupe du Monde 2026.

## Objectif de cette version

Cette étape fournit :
- une interface complète (pages, navigation, responsive),
- un mode double données (`Supabase` si configuré, sinon `mocks/localStorage`),
- un schéma SQL prêt pour joueurs, matchs, pronostics, classement,
- un déploiement GitHub Pages compatible avec variables Supabase.

> Lot visible dans l'interface : **1er prix = 50 € de consommation**.

## Stack technique

- React
- Vite
- TypeScript
- CSS custom mobile-first
- React Router (SPA)
- GitHub Actions + GitHub Pages
- Supabase (optionnel, fallback local automatique)

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

## Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com/).
2. Copier **Project URL**.
3. Copier la **anon public key** (pas de clé privée côté frontend).
4. Dans GitHub (`Settings > Secrets and variables > Actions > Variables`), ajouter :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Dans Supabase SQL Editor, exécuter le fichier :
   - `supabase/schema.sql`
6. Redéployer GitHub Pages (push sur `main` ou relancer le workflow).

### Comportement sans variables Supabase

Si `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont absentes :
- le site **continue de fonctionner**,
- les services utilisent automatiquement les données fictives + `localStorage`.

### Note sécurité (MVP)

Le login pseudo + code est encore en mode MVP :
- hash SHA-256 temporaire côté frontend,
- logique sensible encore côté client.

Une prochaine étape devra déplacer la vérification vers une **Edge Function** ou une **RPC Supabase** pour renforcer la sécurité.

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
supabase/
  schema.sql
```

## Fonctionnalités incluses

- **Accueil** : branding, lot, boutons d'action, aperçu classement et matchs.
- **Navigation SPA** : Accueil, Matchs, Classement, Connexion, Espace joueur, Admin.
- **Matchs** : statut, score final, verrouillage des pronostics (< 1h avant coup d'envoi).
- **Connexion** : pseudo + code secret, fallback local ou Supabase.
- **Espace joueur** : profil, points, liste des pronostics et état (ouvert/verrouillé/terminé).
- **Classement** : calculé côté frontend à partir des pronostics et matchs lisibles.
- **Admin** : statut Supabase et actions de seed non destructives.

## Règles de points

Fonction utilitaire : `src/utils/points.ts`

- Score exact : 3 points
- Bon écart + bon vainqueur (ou bon nul) : 2 points
- Bon vainqueur uniquement : 1 point
- Mauvais pronostic : 0 point

Une démonstration est fournie dans `src/utils/points.demo.ts`.

## Parcours joueur

1. **Connexion pseudo + code** via la page `Connexion` (Supabase si configuré, fallback local sinon).
2. **Joueur connecté visible en haut** : le header affiche `Connecté : [pseudo]`, plus `Mes pronos` et `Déconnexion`.
3. **Page Mes pronos** (`/mes-pronos`) : consultation de tous les matchs, du prono actuel, des points et du statut.
4. **Modification des pronostics** autorisée jusqu'à **1 heure avant le match**, puis verrouillage automatique.

## Commandes utiles

```bash
npm install
npm run dev
npm run build
npm run fetch:football
```

## Mode live football

L'application lit `public/live-data/matches.json` pour afficher les prochains matchs, les scores et les matchs en cours. Le workflow `.github/workflows/update-football-data.yml` peut mettre ce fichier à jour automatiquement toutes les 10 minutes.

Pour activer les vraies données :

1. Créer un token gratuit sur `football-data.org`.
2. Dans GitHub, aller dans `Settings > Secrets and variables > Actions > Secrets`.
3. Ajouter un secret nommé `FOOTBALL_DATA_TOKEN`.
4. Lancer le workflow `Update football data` manuellement une première fois.

Sans ce secret, le site reste en mode test avec des matchs Champions League / Ligue 1 / Premier League / Liga.

Comptes de test :

- `François` / `1234`
- `Solène` / `1234`
