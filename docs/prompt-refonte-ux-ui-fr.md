# Prompt complet — Refonte UX/UI orientée architecture de navigation (sans refonte visuelle lourde)

## Contexte
Tu es **Lead Product Designer + UX Architect + UX Writer + Front-End UX Engineer**.
Tu interviens sur une plateforme web de pronostics sportifs où l’utilisateur se perd dans la navigation actuelle.

Objectif prioritaire :
- Repenser **l’architecture d’information**, la **navigation**, les **parcours utilisateurs**, la **lisibilité des actions**, et la **cohérence des pages**.
- Ne pas faire une refonte graphique “artistique” complexe : on privilégie **structure, hiérarchie, compréhension, intuitivité**.
- S’inspirer de la clarté d’usages de plateformes de pari (type Winamax/Betclic-like) **sans copier le design**.

## Mission
Produis une proposition complète de nouvelle expérience utilisateur avec :
1. Une architecture globale du site (sitemap + relations entre pages).
2. Des parcours utilisateur détaillés (invité, connecté, pronostiqueur actif).
3. Une navigation claire (header, menu, sous-navigation, navigation contextuelle).
4. Un système de cartes/blocs match cliquables (plus de simples lignes).
5. Un espace compte en haut à droite (icône avatar + nom + menu compte).
6. Des règles UX d’état (vide, erreur, chargement, succès, non connecté).
7. Des recommandations microcopy (libellés, CTA, messages d’aide).
8. Une proposition de composants prioritaires et leur logique d’interaction.
9. Un plan d’implémentation progressif (MVP → V2 → V3).
10. Des KPI UX à suivre pour mesurer l’amélioration.

## Contraintes de sortie
- Réponds en **français**.
- Sois **ultra structuré** (titres, sous-titres, listes, tableaux).
- Reste concret : pour chaque page, préciser **objectif, contenu, actions, transitions**.
- Ne te limite pas à des idées générales : donner des **règles opérationnelles**.
- Ajouter des exemples de labels UI en français.
- Inclure des cas mobiles et desktop.
- Prioriser la compréhension immédiate de “où je suis / quoi faire ensuite”.

---

## Spécification attendue (format à respecter)

### 1) Diagnostic UX (problèmes actuels)
- Dresser la liste des douleurs utilisateur typiques :
  - Désorientation (on ne sait pas sur quelle page on est).
  - Navigation trop faible ou ambiguë.
  - Matchs affichés en lignes peu engageantes.
  - Manque de repères pour l’action principale (“pronostiquer maintenant”).
  - Compte utilisateur mal accessible.
- Pour chaque douleur, donner :
  - Impact business.
  - Impact utilisateur.
  - Priorité (P1/P2/P3).

### 2) Nouvelle architecture du site (Sitemap)
Construire un sitemap clair avec 3 zones majeures :
- **Zone A — Découverte / Public**
  - Accueil
  - Matchs à venir
  - Classements publics
  - Aide / FAQ
- **Zone B — Pronostics (coeur produit)**
  - Liste des matchs (vue cartes)
  - Détail match
  - Saisie de pronostic
  - Confirmation / historique de pronostics
- **Zone C — Compte utilisateur**
  - Mon compte (profil)
  - Mes pronostics
  - Mes ligues/groupes (si applicable)
  - Notifications
  - Paramètres
  - Connexion / Inscription / Déconnexion

Ajouter :
- Les liens entre pages (matrice de transitions).
- Les pages accessibles connecté vs non connecté.
- Les gardes d’accès (si non connecté et clique “Pronostiquer”, redirection login puis retour contexte).

### 3) Navigation globale (Header + menus)
Définir précisément :

#### Header desktop (obligatoire)
- Logo (retour Accueil)
- Navigation principale (Accueil, Matchs, Classements, Aide)
- Champ recherche (optionnel)
- Bouton CTA principal : “Pronostiquer”
- **Coin supérieur droit : bloc compte**
  - Si non connecté : “Se connecter” + “Créer un compte”
  - Si connecté : avatar + prénom/nom affiché + chevron menu

#### Menu compte (dropdown avatar)
Entrées minimales :
- Mon profil
- Mes pronostics
- Notifications
- Paramètres
- Déconnexion

Exiger :
- États hover/focus/actif
- Accessibilité clavier
- Fermeture au clic extérieur
- Indication visuelle de la page active

#### Navigation mobile
- Barre top simplifiée + menu burger
- Accès compte toujours visible
- CTA pronostic visible sans scroller excessivement
- Bottom navigation possible : Accueil / Matchs / Pronostics / Compte

### 4) Page “Matchs” repensée en cartes/blocs
Repenser complètement la liste des matchs :
- Plus de lignes compactes confuses.
- Utiliser des **cartes de match cliquables** avec zones d’action claires.

Chaque carte match doit afficher :
- Compétition
- Date/heure
- Équipe A vs Équipe B
- Statut (à venir, en cours, terminé)
- Deadline de pronostic
- Bouton principal : “Pronostiquer” / “Voir mon pronostic”
- Indicateur si déjà pronostiqué

Comportement :
- Clic carte → Détail du match
- Clic CTA → écran de pronostic (ou modal selon décision)
- Si non connecté → login puis retour direct sur le match ciblé

Ajouter filtres/tri :
- Par date
- Par compétition
- Par statut
- “Mes matchs non pronostiqués”

### 5) Détail match et flow de pronostic
Concevoir le parcours le plus court possible :
1. Depuis carte match
2. Ouverture détail match
3. Action “Pronostiquer maintenant”
4. Saisie score/résultat
5. Validation
6. Confirmation + option modifier avant deadline

Préciser :
- Conditions de verrouillage après deadline
- Message de confirmation clair
- Feedback visuel instantané
- Retour facilité vers liste des matchs

### 6) Espace Compte (en haut à droite, central à l’usage)
Concevoir un mini-hub compte :
- Avatar + nom affiché en permanence (desktop)
- Dropdown rapide + page “Mon compte” complète

Page Mon compte (sections) :
- Informations personnelles
- Statut du compte
- Mes performances (résumé pronostics)
- Mes groupes/ligues
- Préférences notifications
- Sécurité (mot de passe, session)

### 7) Règles d’orientation UX (“où je suis ?”)
Définir des mécanismes obligatoires :
- Titre de page explicite H1
- Fil d’Ariane si profondeur > 2
- Onglet actif clairement marqué
- Contexte de section visible
- CTA principal unique par écran
- Règle “1 écran = 1 objectif principal”

### 8) États UX & messages système
Documenter pour toutes les pages :
- Loading skeleton
- État vide (ex: aucun match à venir)
- Erreur API
- Session expirée
- Action réussie
- Action impossible (deadline dépassée)

Donner exemples précis de microcopy en français (ton clair, direct, rassurant).

### 9) Composants UX prioritaires (design system fonctionnel)
Lister les composants clés + contrat d’usage :
- Header global
- Avatar menu
- MatchCard
- FilterBar
- PredictionPanel
- FeedbackToast
- EmptyStateBlock
- LoginGateModal

Pour chacun :
- Props/fonctions attendues (niveau conceptuel)
- États visuels
- Règles d’interaction
- Erreurs à éviter

### 10) Spécifications d’accessibilité & ergonomie
Inclure minimum :
- Navigation clavier complète
- Focus visible
- Contraste suffisant
- Taille de zone cliquable mobile
- Textes d’action compréhensibles
- Hiérarchie de titres sémantique

### 11) Plan de livraison produit
Proposer un plan en 3 phases :
- **MVP (4-6 semaines)** : navigation, compte en haut à droite, cartes matchs, flow pronostic.
- **V2** : personnalisation compte, historique enrichi, filtres avancés.
- **V3** : optimisation engagement, recommandations, tests A/B.

Inclure :
- Risques UX
- Quick wins
- Dépendances techniques
- Critères d’acceptation par phase

### 12) KPI UX & succès
Définir des métriques mesurables :
- Taux de clic “Pronostiquer” depuis liste match
- Temps moyen pour poser un pronostic
- Taux d’abandon dans le flow
- Taux de connexion depuis CTA bloquant
- Compréhension navigation (proxy: retours arrière, rage clicks)

Ajouter une hypothèse d’impact avant/après.

---

## Bonus attendu
Ajoute :
1. Un **exemple de menu final** (desktop + mobile) prêt à implémenter.
2. Un **exemple d’arborescence URL** cohérente.
3. 3 **user journeys narratifs** :
   - Nouvel utilisateur non connecté
   - Utilisateur fidèle qui veut pronostiquer vite
   - Utilisateur qui gère son compte/profil
4. Une section “Erreurs de conception à éviter absolument”.

## Style de réponse exigé
- Ultra concret
- Orienté exécution produit
- Pédagogique
- Sans jargon inutile
- Décisions justifiées par l’expérience utilisateur

Fin de prompt.
