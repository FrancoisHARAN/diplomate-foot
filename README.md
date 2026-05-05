# Le Diplomate - Prono Foot

Application web frontend (React + Vite + TypeScript) pour animer un concours de pronostics au bar **Le Diplomate**.

## Stack

- React
- Vite
- TypeScript
- GitHub Pages
- Supabase RPC pour la synchronisation cloud
- `localStorage` seulement comme cache/fallback

## Installation locale

```bash
npm install
npm run dev
```

## Build production

```bash
npm run build
```

## Variables d'environnement

Copier `.env.example` vers `.env.local` en local, puis renseigner:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Ne jamais mettre de `service_role` key dans le frontend, GitHub Pages ou le depot.

Pour GitHub Pages, ajouter ces variables dans:

`Settings > Secrets and variables > Actions > Variables`

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Sans ces variables, le site continue en mode localStorage, mais les donnees ne sont pas synchronisees entre appareils.

## Synchronisation cloud Supabase

Avant, les points, pronostics et avatars etaient stockes uniquement dans le `localStorage` du navigateur. Donc le telephone et le PC pouvaient afficher deux versions differentes du meme joueur.

Maintenant, quand Supabase est configure:

- Supabase devient la source de verite cloud;
- le joueur se connecte avec pseudo + code a 6 chiffres;
- le code est verifie cote base via RPC;
- le frontend recoit un `session_token`;
- les pronostics sont enregistres via RPC;
- le classement est lu via RPC;
- `localStorage` reste un cache local et un fallback.

Le frontend ne fait plus d'`insert`/`update` direct dans les tables joueurs ou pronostics. Les actions sensibles passent par:

- `app_login_player`
- `app_save_prediction_by_session`
- `app_get_player_state`
- `app_get_leaderboard`
- `app_get_matches`
- `app_sync_local_predictions`
- `app_update_player_avatar`

## Securite MVP

Cette version vise un petit concours prive de bar, pas une application bancaire.

Ce qui est evite:

- pas de codes joueurs en clair dans GitHub;
- pas de hash de vrais codes joueurs dans GitHub;
- pas de `service_role` key cote frontend;
- pas d'ecriture directe anon dans les tables sensibles;
- pas de `DELETE` frontend;
- pas de Supabase Auth email.

Ce qui reste MVP:

- le `session_token` est stocke localement pour garder le joueur connecte;
- les matchs peuvent etre synchronises via RPC depuis le frontend pour que le classement cloud puisse calculer les points;
- pour une version publique plus robuste, il faudra verrouiller la mise a jour des matchs via un job serveur ou une Edge Function.

## Supabase

1. Creer un projet Supabase.
2. Ouvrir le SQL Editor.
3. Executer tout le fichier `supabase/schema.sql`.
4. Ajouter les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
5. Redeployer GitHub Pages.

Le schema cree notamment:

- `app_rpc_players`
- `app_rpc_player_codes`
- `app_rpc_sessions`
- `app_rpc_matches`
- `app_rpc_predictions`

Les tables ont RLS activee. Les ecritures joueurs/pronostics passent par fonctions RPC `security definer`.

## Creer les joueurs

Les vrais codes ne doivent pas etre commites.

Dans Supabase SQL Editor, apres avoir execute `supabase/schema.sql`, creer les joueurs avec:

```sql
select public.app_admin_create_player('Frédérique', '<CODE_6_CHIFFRES>');
select public.app_admin_create_player('Sylvain', '<CODE_6_CHIFFRES>');
```

Remplacer `<CODE_6_CHIFFRES>` par le vrai code donne au bar. Le code est hash cote Supabase avec l'id du joueur, puis seul le hash est stocke dans la base. La fonction ne retourne jamais le code.

Un exemple sans vrais codes est disponible dans `supabase/seed.example.sql`.

## Procedure pour recuperer les 30 points de Francois

1. Deployer cette nouvelle version.
2. Configurer Supabase.
3. Executer `supabase/schema.sql` dans Supabase.
4. Creer le joueur François avec `app_admin_create_player` si necessaire.
5. Ouvrir d'abord le site sur le telephone ou François a 30 points.
6. Se connecter en François.
7. Laisser l'application synchroniser les pronostics locaux vers Supabase.
8. Ensuite seulement, ouvrir le site sur le PC.
9. Se connecter en François.
10. Verifier que les points sont identiques.

Important: pour cette migration, le bon ordre est telephone d'abord, PC ensuite. La synchronisation compare les pronostics par date de modification pour eviter d'ecraser une version cloud plus recente avec une vieille version locale.

## Mode fallback local

Si Supabase n'est pas configure ou indisponible:

- la connexion locale reste possible pour tester;
- les donnees restent dans le navigateur;
- telephone et PC ne seront pas synchronises.

## Mode live football

L'application lit `public/live-data/matches.json` pour afficher les prochains matchs, les scores et les matchs en cours. Le workflow `.github/workflows/update-football-data.yml` peut mettre ce fichier a jour automatiquement.

Pour activer les vraies donnees football:

1. Creer un token gratuit sur `football-data.org`.
2. Dans GitHub, aller dans `Settings > Secrets and variables > Actions > Secrets`.
3. Ajouter un secret nomme `FOOTBALL_DATA_TOKEN`.
4. Lancer le workflow `Update football data` une premiere fois.

Quand Supabase est configure, le frontend synchronise aussi les matchs vers Supabase via RPC afin que le classement cloud puisse calculer les points.

## Deploiement GitHub Pages

Le workflow est dans `.github/workflows/deploy.yml`.

La base Vite doit rester:

```ts
base: '/diplomate-foot/'
```

Dans `Settings > Pages`, utiliser **GitHub Actions** comme source. Un push sur `main` declenche le build et le deploiement.

## Regles de points

- Score exact: 3 points
- Bon ecart + bon vainqueur, ou bon match nul: 2 points
- Bon vainqueur uniquement: 1 point
- Mauvais pronostic: 0 point

Les multiplicateurs de match booste s'appliquent ensuite au total du match.
