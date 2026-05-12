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

## Profils publics joueurs

La route `/joueurs/:playerId` utilise `app_get_public_player_profile` quand Supabase est configure.

- les pronostics des matchs encore ouverts restent caches;
- les pronostics deviennent visibles quand le match est verrouille, en live, termine, ou a moins d'une heure du coup d'envoi;
- les matchs termines affichent le score final, les points et le type de resultat;
- les matchs live/verrouilles affichent le prono avec les points en attente.

Si le profil affiche un joueur avec des points mais aucun prono visible, verifier d'abord que `supabase/schema.sql` a bien ete reexecute dans Supabase SQL Editor. Une erreur `PGRST202` sur `app_get_public_player_profile` signifie que la fonction RPC n'est pas disponible dans le cache PostgREST: relancer le schema complet, puis recharger le site.

## Debug profils joueurs

Ces requetes aident a comparer les points du classement, les pronostics bruts et les pronostics publics renvoyes par la RPC.

```sql
-- A. Verifier le joueur
select *
from public.app_rpc_players
where id = '2ac7ee88-fbe2-4217-914b-e00aa9bae8be';

-- B. Verifier ses pronostics bruts
select *
from public.app_rpc_predictions
where player_id = '2ac7ee88-fbe2-4217-914b-e00aa9bae8be'
order by created_at desc;

-- C. Verifier ses pronostics avec matchs
select
  p.*,
  m.*
from public.app_rpc_predictions p
left join public.app_rpc_matches m on m.id = p.match_id
where p.player_id = '2ac7ee88-fbe2-4217-914b-e00aa9bae8be'
order by m.kickoff desc nulls last, p.created_at desc;

-- D. Tester la RPC profil
select *
from public.app_get_public_player_profile('2ac7ee88-fbe2-4217-914b-e00aa9bae8be');

-- E. Tester le classement
select *
from public.app_get_leaderboard();
```

## Historique hebdomadaire du classement

Le classement live peut bouger pendant la semaine. Pour suivre l'evolution dans le temps, Supabase peut figer un snapshot hebdomadaire du classement.

Principe:

- le classement actuel reste live;
- une copie hebdomadaire est stockee dans `app_rpc_leaderboard_snapshots`;
- le graphique de la page Classement affiche les semaines figees plus la colonne `En cours`;
- le tri utilise les memes departages que le classement live: points, scores exacts, resultats a 2 points, premier prono, puis pseudo.

Recommandation d'exploitation:

- creer le snapshot chaque lundi a 02:00 heure Europe/Paris;
- au debut, le faire manuellement depuis Supabase SQL Editor;
- plus tard, planifier la meme requete avec Supabase Scheduler ou `pg_cron`.

Creation manuelle d'un snapshot:

```sql
select public.app_create_weekly_leaderboard_snapshot();
```

Pour tester:

1. Executer tout `supabase/schema.sql` dans Supabase SQL Editor.
2. Executer `select public.app_create_weekly_leaderboard_snapshot();`.
3. Recharger la page `/classement`.
4. Verifier la section `Historique du classement`.

Sans Supabase ou si la RPC est indisponible, l'application affiche un historique de demonstration en fallback local.

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

## Actualisation des scores

Le workflow `.github/workflows/update-football-data.yml` peut interroger `football-data.org` toutes les 5 minutes.

L'heure visible dans le header, `Derniere actualisation`, ne change que lorsqu'une donnee utile au jeu change vraiment dans `public/live-data/matches.json`:

- score;
- statut `upcoming` / `live` / `finished`;
- minute live;
- coup d'envoi ou information match visible;
- multiplicateur de points visible.

Un simple check API sans changement utile ne modifie pas l'heure affichee et ne cree pas de commit supplementaire.

Pour forcer une mise a jour manuelle: GitHub -> Actions -> `Update football data` -> `Run workflow`.

Selon le plan API et la competition, `football-data.org` peut renvoyer des scores avec un leger retard.

## Coupe du Monde 2026

L'application prepare une categorie **Coupe du Monde 2026** pour la competition finale FIFA World Cup uniquement. Le code football-data.org prevu est `WC` avec la saison `2026` (voir la table officielle des codes de ligues: https://www.football-data.org/documentation/api).

La logique d'affichage est volontairement filtree:

- en phase de groupe, seuls les matchs impliquant une equipe selectionnee sont affiches;
- a partir des seiziemes / huitiemes / quarts / demies / finale, tous les matchs Coupe du Monde 2026 sont affiches;
- les matchs amicaux, qualifications et matchs de preparation ne sont pas consideres comme Coupe du Monde 2026;
- tous les matchs de la France dans cette competition ont un boost automatique x2;
- les drapeaux viennent uniquement de `public/flags` et ne sont utilises que pour les matchs Coupe du Monde 2026;
- les matchs de clubs conservent leurs logos de clubs. Un club comme Marseille avec le code `MAR` ne peut donc pas recevoir le drapeau du Maroc.

Equipes selectionnees en phase de groupe:

France, Espagne, Argentine, Angleterre, Portugal, Bresil, Pays-Bas, Maroc, Belgique, Allemagne, Croatie, Colombie, Senegal.

Italie n'est pas dans la liste Coupe du Monde actuelle.

Les fichiers de configuration principaux sont:

- `src/config/worldCup2026.ts` pour changer la liste des equipes selectionnees, le label et le code competition interne;
- `src/config/countryFlags.ts` pour mapper les codes pays vers les fichiers vraiment presents dans `public/flags`;
- `src/utils/worldCupFilters.ts` pour la detection Coupe du Monde, la phase de groupe, l'elimination directe et le boost France.

Le workflow d'update football peut recevoir ces variables GitHub optionnelles:

```txt
WORLD_CUP_2026_COMPETITION_ID=WC
WORLD_CUP_2026_SEASON=2026
WORLD_CUP_2026_DATE_FROM=2026-06-11
WORLD_CUP_2026_DATE_TO=2026-07-19
```

Si football-data.org change l'identifiant officiel, modifier `WORLD_CUP_2026_COMPETITION_ID` dans GitHub Actions ou `WORLD_CUP_2026_API_COMPETITION_ID` dans `src/config/worldCup2026.ts` / `scripts/fetch-football-data.mjs`.

Si `supabase/schema.sql` a ete mis a jour, relancer le SQL dans Supabase pour conserver les champs `stage`, `round`, `group_name`, `season` et `source_competition_id` utilises par les filtres.

## Noms de pays en francais

Les noms de pays affiches dans le contexte selection nationale / Coupe du Monde passent par `src/config/countryFlags.ts` et `src/utils/worldCupFilters.ts`.

- `Iraq` devient `Irak`;
- `Egypt` devient `Egypte`;
- `Germany` devient `Allemagne`;
- `Spain` devient `Espagne`;
- `Morocco` devient `Maroc`;
- `Netherlands` devient `Pays-Bas`.

Cette conversion ne s'applique que si le match est identifie comme une selection nationale / Coupe du Monde. Les clubs restent traites avec leurs logos de clubs: `MAR` peut etre Marseille en club sans devenir Maroc.

## Prediction champion du monde

Dans `/mon-compte`, chaque joueur peut enregistrer son **top 3 champion du monde**: les 3 pays qu'il pense capables de gagner la Coupe du Monde. Ce n'est pas le podium reel de la competition, seulement une liste de favoris pour le champion final.

Texte joueur:

- choisis tes 3 favoris pour devenir champion du monde;
- si le champion est dans ton top 3, tu marques des points selon sa position;
- le joueur peut modifier son choix jusqu'a la date limite configuree.

Regle de points prevue pour la fin de competition:

- champion place en 1er choix: 20 points;
- champion place en 2e choix: 15 points;
- champion place en 3e choix: 10 points;
- champion absent du top 3: 0 point.

La date limite est centralisee dans `WORLD_CUP_TOP_THREE_LOCKS_AT`, dans `src/config/worldCupWinnerPredictions.ts`. La valeur temporaire actuelle est:

```txt
2026-06-17T00:00:00Z
```

Pour changer la date limite, modifier cette constante puis redeployer. Le verrouillage est applique cote frontend et dans la RPC `app_save_world_cup_winner_prediction_by_session`.

La liste des 48 pays qualifies utilisee par ce formulaire est aussi dans `src/config/worldCupWinnerPredictions.ts`. Elle est organisee par groupe:

- Groupe A: Mexique, Afrique du Sud, Coree du Sud, Tchequie
- Groupe B: Canada, Bosnie-Herzegovine, Qatar, Suisse
- Groupe C: Bresil, Maroc, Haiti, Ecosse
- Groupe D: Etats-Unis, Paraguay, Australie, Turquie
- Groupe E: Allemagne, Curacao, Cote d'Ivoire, Equateur
- Groupe F: Pays-Bas, Japon, Suede, Tunisie
- Groupe G: Belgique, Egypte, Iran, Nouvelle-Zelande
- Groupe H: Espagne, Cap-Vert, Arabie saoudite, Uruguay
- Groupe I: France, Senegal, Irak, Norvege
- Groupe J: Argentine, Algerie, Autriche, Jordanie
- Groupe K: Portugal, RD Congo, Ouzbekistan, Colombie
- Groupe L: Angleterre, Croatie, Ghana, Panama

Italie est volontairement absente de cette liste.

Le calcul utilitaire est dans `src/utils/worldCupWinnerPredictions.ts`. Les choix sont synchronises par RPC Supabase quand la base est configuree, sinon ils restent en fallback localStorage. Le top 3 public d'un joueur est renvoye par `app_get_public_player_profile`.

## Boosts Coupe du Monde

Les boosts ne se cumulent pas. Le boost final est toujours le plus fort multiplicateur applicable au match.

- Matchs de la France: x2
- Seiziemes / huitiemes: x2
- Quarts de finale: x3
- Match pour la 3e place: x3
- Demi-finales: x4
- Finale: x5

Exemples:

- France en huitieme: x2, pas x4;
- France en demi-finale: x4, pas x8;
- France en finale: x5, pas x10.

Le meme principe est applique cote frontend et dans `supabase/schema.sql`.

## Avatars cloud

Les photos de profil sont synchronisees via Supabase quand la base est configuree.

- la mise a jour passe par `app_update_player_avatar`;
- l'avatar est renvoye par `app_get_player_state`;
- l'avatar est renvoye par `app_get_leaderboard`;
- l'avatar est renvoye par `app_get_public_player_profile`;
- la RPC refuse les avatars trop lourds pour eviter de stocker une image enorme en base.

Sans Supabase, l'avatar reste disponible seulement dans le cache/fallback local.

## Paris flash

Les paris flash sont des petits defis temporaires crees manuellement par l'organisateur. Ils peuvent etre affiches sur l'accueil, sauvegardes par joueur, puis comptes dans le classement une fois resolus.

Tables/RPC ajoutees par `supabase/schema.sql`:

- `app_rpc_flash_challenges`;
- `app_rpc_flash_options`;
- `app_rpc_flash_predictions`;
- `app_get_active_flash_challenges`;
- `app_save_flash_prediction_by_session`;
- `app_get_player_flash_predictions_by_session`;
- `app_get_public_player_flash_predictions`.

Le schema contient un seed idempotent pour le flash de test:

- titre: `Dembélé buteur ?`
- description: `Dembélé marque-t-il contre Lens ?`
- match lie: `fd-542664` si les donnees live contiennent Lens - PSG
- fermeture: `2026-05-13T19:00:00Z`
- options: `Oui, il marque` pour 5 points, `Non, il ne marque pas` pour 2 points.

Relancer `supabase/schema.sql` ne doit pas creer de doublon de ce flash.

Exemple SQL pour creer un autre flash:

```sql
with challenge as (
  insert into public.app_rpc_flash_challenges (title, description, match_label, closes_at, status)
  values (
    'Nouveau flash ?',
    'Description courte du defi',
    'Lens - PSG',
    '2026-06-12 21:00:00+02',
    'open'
  )
  returning id
)
insert into public.app_rpc_flash_options (flash_id, label, points_if_correct, sort_order)
select id, 'Oui, il marque', 5, 1 from challenge
union all
select id, 'Non, il ne marque pas', 2, 2 from challenge;
```

Exemple SQL pour trouver les options du flash Dembélé:

```sql
select c.id as flash_id, o.id as option_id, o.label, o.points_if_correct
from public.app_rpc_flash_challenges c
join public.app_rpc_flash_options o on o.flash_id = c.id
where c.title = 'Dembélé buteur ?'
order by o.sort_order;
```

Exemple SQL pour resoudre le flash:

```sql
update public.app_rpc_flash_challenges
set status = 'resolved',
    result_option_id = '<ID_OPTION_GAGNANTE>',
    updated_at = now()
where id = '<ID_FLASH>';
```

Pour fermer un flash sans le resoudre:

```sql
update public.app_rpc_flash_challenges
set status = 'closed',
    updated_at = now()
where id = '<ID_FLASH>';
```

Si `supabase/schema.sql` est modifie ou relance, reexecuter le schema complet dans Supabase SQL Editor pour publier les nouvelles tables et RPC.

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
