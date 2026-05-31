# Refonte UX — Plateforme de pronostics sportifs

## 1) Diagnostic UX (problèmes actuels)

| Douleur utilisateur | Symptôme observé | Impact business | Impact utilisateur | Priorité |
|---|---|---|---|---|
| Désorientation globale | L’utilisateur ne sait pas dans quelle section il se trouve ni ce qu’il doit faire ensuite | Baisse de conversion pronostic, churn précoce | Stress cognitif, sentiment de “site compliqué” | P1 |
| Navigation ambiguë | Menus peu explicites, faible hiérarchie entre pages “consultation” et “action” | Diminution du trafic vers le cœur produit (poser un pronostic) | Aller-retour inutiles, perte de temps | P1 |
| Liste des matchs en lignes | Difficile de comparer, repérer statut/délais/actions | Moins de clics sur pronostic, baisse d’activité | Faible lisibilité, fatigue visuelle | P1 |
| Action principale peu saillante | “Pronostiquer maintenant” n’est pas dominant | Chute du taux de conversion | Hésitation, abandon du parcours | P1 |
| Compte utilisateur mal accessible | Accès profil/notifications/pronostics diffus | Faible rétention, gestion compte insuffisante | Frustration (“où trouver mes infos ?”) | P2 |
| États système peu pédagogiques | Erreurs/chargements/sessions expirées peu compréhensibles | Support client plus élevé | Incompréhension et perte de confiance | P1 |

### Règle directrice
**Chaque écran doit répondre immédiatement à 3 questions :**
1. Où suis-je ?
2. Quelle est l’action principale ?
3. Que se passe-t-il ensuite ?

---

## 2) Nouvelle architecture du site (Sitemap)

## Vue d’ensemble (3 zones)

### Zone A — Découverte / Public
- `/` Accueil
- `/matchs` Matchs à venir
- `/classements` Classements publics
- `/aide` Aide / FAQ

### Zone B — Pronostics (cœur produit)
- `/matchs` Liste des matchs (vue cartes)
- `/matchs/:matchId` Détail match
- `/matchs/:matchId/pronostic` Saisie de pronostic
- `/mes-pronostics` Confirmation / historique de pronostics

### Zone C — Compte utilisateur
- `/compte` Mon compte (profil)
- `/compte/pronostics` Mes pronostics
- `/compte/ligues` Mes ligues / groupes
- `/compte/notifications` Notifications
- `/compte/parametres` Paramètres
- `/connexion` Connexion
- `/inscription` Inscription
- `/deconnexion` Déconnexion (action)

## Matrice de transitions (principales)

| Page source | Action | Page cible | Condition |
|---|---|---|---|
| Accueil | “Voir les matchs” | Matchs | Libre |
| Matchs | Clic carte | Détail match | Libre |
| Matchs | CTA “Pronostiquer” | Pronostic match | Connecté |
| Matchs | CTA “Pronostiquer” | Connexion puis retour Pronostic match | Non connecté |
| Détail match | CTA “Pronostiquer maintenant” | Pronostic match | Avant deadline |
| Pronostic match | “Valider” | Confirmation inline + Mes pronostics | Connecté |
| Mes pronostics | “Modifier” | Pronostic match | Avant deadline |
| Toute page | Avatar menu > Mon profil | Compte | Connecté |

## Accès connecté vs non connecté

| Page | Invité | Connecté |
|---|---:|---:|
| Accueil / Matchs / Classements / Aide | ✅ | ✅ |
| Détail match | ✅ | ✅ |
| Poser/modifier un pronostic | ❌ (login gate) | ✅ |
| Mon compte / Mes pronostics / Notifications / Paramètres | ❌ | ✅ |

## Garde d’accès (Login Gate)
- Si invité clique “Pronostiquer” :
  1. Ouvrir modal “Connectez-vous pour enregistrer votre pronostic”.
  2. Boutons : “Se connecter” / “Créer un compte”.
  3. Stocker `returnTo=/matchs/:id/pronostic`.
  4. Après authentification, redirection automatique vers la page ciblée.

---

## 3) Navigation globale (Header + menus)

## Header desktop
- **Gauche** : Logo (retour `/`).
- **Centre** : navigation principale : `Accueil | Matchs | Classements | Aide`.
- **Droite** : recherche (optionnelle), CTA primaire `Pronostiquer`, bloc compte.

## Bloc compte (coin supérieur droit)
- **Invité** : `Se connecter` (secondaire), `Créer un compte` (primaire léger).
- **Connecté** : `Avatar + Prénom Nom + chevron`.

## Menu compte (dropdown avatar)
Entrées minimales :
1. Mon profil
2. Mes pronostics
3. Notifications
4. Paramètres
5. Déconnexion

## Règles interaction/navigation
- Onglet actif souligné + contraste renforcé.
- Hover : fond discret; Focus clavier : contour visible 2px.
- `Esc` ferme le menu compte.
- Clic extérieur ferme le menu.
- Navigation clavier : `Tab` séquentiel, `Entrée/Espace` active l’item.
- `aria-current="page"` pour item actif.

## Navigation mobile
- Top bar : logo + bouton compte + burger.
- CTA “Pronostiquer” sticky en bas de viewport sur écrans match.
- Bottom nav recommandée : `Accueil | Matchs | Pronostics | Compte`.
- Éviter plus de 4 items dans la bottom nav.

---

## 4) Page “Matchs” repensée en cartes/blocs

## Objectif
Passer d’une logique “table technique” à une logique “carte actionnable en 1 regard”.

## Structure d’une MatchCard
- Compétition (ex: Coupe du Monde)
- Date/heure locale
- Équipe A vs Équipe B
- Statut : `À venir / En cours / Terminé`
- Deadline pronostic (ex: “Clôture dans 2h15”)
- CTA principal :
  - `Pronostiquer` (si non pronostiqué + ouvert)
  - `Voir mon pronostic` (si déjà pronostiqué)
  - `Pronostic verrouillé` (si deadline dépassée)
- Badge “Déjà pronostiqué” si applicable

## Comportements
- Clic sur la carte (hors CTA) → `/matchs/:id`.
- Clic CTA → `/matchs/:id/pronostic`.
- Invité : login gate + retour contexte.

## Filtres / tri
- Filtres : date, compétition, statut, “Mes matchs non pronostiqués”.
- Tri par défaut : deadline la plus proche.
- Persistences des filtres dans URL (query params) pour partage/rechargement.

---

## 5) Détail match et flow de pronostic

## Flow optimal (6 étapes)
1. Carte match
2. Détail match
3. CTA `Pronostiquer maintenant`
4. Saisie (score/résultat)
5. Validation
6. Confirmation + option modifier avant deadline

## Règles de verrouillage
- À `deadline <= now` :
  - Formulaire désactivé
  - Message : “Les pronostics sont clôturés pour ce match.”
  - CTA remplacé par “Voir mes pronostics”.

## Feedback utilisateur
- Succès : toast + état carte mis à jour immédiatement.
- Erreur réseau : bannière non bloquante + bouton “Réessayer”.
- Lien de retour contextuel : “Retour aux matchs filtrés”.

---

## 6) Espace Compte (hub usage)

## Mini-hub permanent (desktop)
- Avatar + nom visibles en permanence en haut à droite.
- Dropdown rapide orienté tâches fréquentes.

## Page “Mon compte” (sections)
1. Informations personnelles
2. Statut du compte
3. Mes performances (KPIs pronostics)
4. Mes ligues/groupes
5. Préférences notifications
6. Sécurité (mot de passe, sessions actives)

## Priorités UX
- Séparer **consultation** (infos) et **actions sensibles** (sécurité).
- Sauvegarde explicite avec feedback immédiat.

---

## 7) Règles d’orientation UX (“où je suis ?”)

Règles obligatoires :
- H1 explicite sur chaque page (ex: “Matchs à venir”).
- Fil d’Ariane si profondeur > 2 niveaux.
- Onglet actif visible (couleur + forme, pas seulement couleur).
- Bloc “Contexte” visible (compétition, journée, filtre actif).
- **1 écran = 1 objectif principal** + 1 CTA primaire.
- Éviter plus de 2 CTA primaires concurrents par écran.

---

## 8) États UX & messages système

| État | Règle UX | Exemple microcopy FR |
|---|---|---|
| Loading | Skeleton cards (pas spinner seul) | “Chargement des matchs…” |
| Vide | Expliquer + proposer action | “Aucun match à venir pour ces filtres. Réinitialisez les filtres.” |
| Erreur API | Message clair + retry | “Impossible de charger les matchs. Vérifiez votre connexion puis réessayez.” |
| Session expirée | Interrompre action critique | “Votre session a expiré. Reconnectez-vous pour continuer.” |
| Succès action | Confirmation immédiate | “Pronostic enregistré ✅ Vous pouvez le modifier jusqu’à 19:45.” |
| Action impossible | Expliquer la cause + alternative | “Deadline dépassée. Ce pronostic est verrouillé.” |
| Non connecté | Login gate contextualisé | “Connectez-vous pour enregistrer ce pronostic.” |

Ton microcopy : **direct, court, rassurant, orienté action**.

---

## 9) Composants UX prioritaires (design system fonctionnel)

| Composant | Props/fonctions (conceptuel) | États visuels | Règles interaction | Erreurs à éviter |
|---|---|---|---|---|
| HeaderGlobal | `activeTab`, `isAuthenticated`, `user` | default/scroll/focus | logo home, tab active, CTA visible | cacher le CTA principal |
| AvatarMenu | `userName`, `avatarUrl`, `items[]` | closed/open/focus/disabled | ouvre au clic/Entrée, ferme Esc/outside | menu sans focus trap |
| MatchCard | `match`, `predictionState`, `deadlineState` | hover/selected/locked | carte cliquable + CTA distinct | CTA et clic carte en conflit |
| FilterBar | `filters`, `onChange`, `onReset` | collapsed/mobile open | debounce recherche, chips actifs | filtres non persistants |
| PredictionPanel | `initialValue`, `onSubmit`, `isLocked` | idle/loading/success/error | validation inline, bouton unique | erreurs affichées trop tard |
| FeedbackToast | `type`, `message`, `action` | info/success/error | auto-dismiss + action | messages vagues |
| EmptyStateBlock | `title`, `desc`, `cta` | neutral | toujours proposer suite | état vide sans CTA |
| LoginGateModal | `context`, `onLogin`, `onSignup` | open/loading | conserve returnTo | perte de contexte post-login |

---

## 10) Accessibilité & ergonomie

Checklist minimale :
- Navigation clavier 100% fonctionnelle.
- Focus visible systématique (non supprimé en CSS).
- Contraste texte/fond conforme WCAG AA.
- Zone tactile mobile >= 44x44 px.
- Libellés d’action explicites (pas “OK”).
- Structure sémantique : H1 unique, H2/H3 cohérents.
- Messages erreur associés aux champs (`aria-describedby`).
- États non transmis uniquement par la couleur (ajouter icône/texte).

---

## 11) Plan de livraison produit (MVP → V2 → V3)

## Phase 1 — MVP (4 à 6 semaines)
**Scope :** navigation globale, bloc compte haut droite, MatchCard, flow pronostic court.

- Livrables :
  - Nouveau header + avatar menu
  - Page Matchs en cartes + filtres essentiels
  - Login gate avec retour contexte
  - Flow pronostic + confirmation
- Quick wins : CTA unique “Pronostiquer”, H1 clairs, états succès/erreur.
- Risques UX : surcharge d’infos sur MatchCard.
- Dépendances techniques : auth redirect, API deadlines, routage query params.
- Critères d’acceptation :
  - 90% des tests de navigation sans ambiguïté
  - Temps médian pour poser un pronostic < 60 secondes

## Phase 2 — V2
**Scope :** compte enrichi, historique avancé, filtres avancés.

- Livrables :
  - Mon compte sectionné
  - Historique pronostics détaillé
  - Filtres par statut personnel (“à faire”, “soumis”, “verrouillés”)
- Risques UX : complexité des filtres.
- Critères : hausse de rétention hebdo des utilisateurs connectés.

## Phase 3 — V3
**Scope :** engagement et optimisation continue.

- Livrables :
  - Recommandations de matchs à pronostiquer
  - Tests A/B CTA, ordonnancement cartes
  - Nudges notifications personnalisées
- Risques UX : sur-sollicitation notification.
- Critères : amélioration mesurable des KPI de conversion et complétion.

---

## 12) KPI UX & mesure du succès

| KPI | Définition | Cible après refonte |
|---|---|---|
| CTR “Pronostiquer” (liste matchs) | clics CTA / vues liste | +25% |
| Temps moyen de pose pronostic | ouverture match → validation | -30% |
| Taux d’abandon flow | démarré sans validation | -20% |
| Taux de connexion via login gate | logins après blocage CTA | +15% |
| Signal désorientation | retours arrière + rage clicks | -25% |

## Hypothèse d’impact avant/après
- Avant : navigation exploratoire, effort cognitif élevé, CTA peu lisible.
- Après : parcours orienté tâche, action principale visible, feedback constant.
- Effet attendu : **hausse conversion pronostic + meilleure rétention utilisateur connecté**.

---

## Bonus 1 — Exemple de menu final prêt à implémenter

## Desktop
- Gauche : `Logo`
- Centre : `Accueil | Matchs | Classements | Aide`
- Droite : `[Recherche] [Pronostiquer] [Avatar Prénom ⌄]`

## Mobile
- Top bar : `Logo | Pronostiquer | Avatar`
- Burger : `Accueil, Matchs, Classements, Aide, Paramètres`
- Bottom nav : `Accueil | Matchs | Mes pronostics | Compte`

---

## Bonus 2 — Exemple d’arborescence URL

- `/`
- `/matchs?date=2026-04-27&competition=ligue1&statut=avenir`
- `/matchs/:id`
- `/matchs/:id/pronostic`
- `/classements`
- `/aide`
- `/connexion?returnTo=/matchs/123/pronostic`
- `/inscription?returnTo=/matchs/123/pronostic`
- `/compte`
- `/compte/pronostics`
- `/compte/notifications`
- `/compte/parametres`

---

## Bonus 3 — 3 user journeys narratifs

## A. Nouvel utilisateur non connecté
1. Arrive sur Accueil, comprend la proposition de valeur.
2. Va sur Matchs, voit des cartes claires.
3. Clique “Pronostiquer” sur un match.
4. Login gate contextualisé.
5. Se connecte, revient directement sur la saisie.
6. Valide, reçoit confirmation.

## B. Utilisateur fidèle (pronostiquer vite)
1. Ouvre Matchs (filtres persistés “non pronostiqués”).
2. Clique CTA carte.
3. Saisit score en 10–20 secondes.
4. Reçoit toast succès.
5. Continue sur match suivant sans friction.

## C. Utilisateur qui gère son compte
1. Clique avatar haut droite.
2. Ouvre Mon compte.
3. Met à jour préférences notifications.
4. Vérifie performances et ligues.
5. Quitte avec confirmation de sauvegarde.

---

## Bonus 4 — Erreurs de conception à éviter absolument

1. Multiplier les CTA primaires sur un même écran.
2. Mettre l’action de pronostic derrière plusieurs niveaux de navigation.
3. Masquer l’état “verrouillé” après deadline.
4. Utiliser seulement la couleur pour exprimer un statut.
5. Forcer la reconnexion sans retour contexte.
6. Afficher des labels vagues (“Continuer”, “Valider”) sans objet explicite.
7. Casser la cohérence mobile/desktop des mêmes actions.
8. Oublier les états vides et erreurs (expérience perçue “buguée”).

---

## Labels UI recommandés (exemples prêts à utiliser)
- CTA principal : `Pronostiquer maintenant`
- CTA secondaire : `Voir le détail`
- État fait : `Pronostic envoyé`
- État verrouillé : `Pronostic clôturé`
- Compte : `Mon profil`, `Mes pronostics`, `Paramètres`, `Déconnexion`
- Erreur : `Une erreur est survenue. Réessayez.`
- Aide : `Besoin d’aide ? Consultez la FAQ`

