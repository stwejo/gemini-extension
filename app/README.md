# Nederlands — apprendre le néerlandais (A0 → B1)

Application web (PWA) **gratuite**, en français, pour apprendre le néerlandais à partir de zéro.
Aucun compte, aucun serveur, aucune API payante : tout tourne dans le navigateur et toutes les
données restent sur l'appareil.

- Interface : français · Contenu : néerlandais (nl-NL par défaut, nl-BE au choix)
- Approche : **oral d'abord**, grammaire ensuite (dialogue → répétition → vocabulaire → observation
  → règle → pratique → production)
- Stockage local (IndexedDB), audio par la synthèse vocale du navigateur

## État du projet

| Phase | Contenu | État |
|---|---|---|
| 1 | Moteur de leçons, synthèse vocale, 3 types d'exercices, niveau A0 complet, stockage local, installation et fonctionnement hors ligne | **terminée** |
| 2 | Reconnaissance vocale, révision espacée (SM-2), niveau A1 | à venir |
| 3 | Fiches de grammaire consultables, test de positionnement, tests de fin d'unité, A2–B1 | à venir |
| 4 | Accessibilité, polissage, tests, déploiement | à venir |

Contenu disponible : **4 unités A0, 12 leçons, 107 mots et expressions, 72 exercices**.

L'application s'installe depuis le navigateur (« Ajouter à l'écran d'accueil ») et fonctionne
entièrement hors ligne après la première visite — sauf la synthèse vocale si l'appareil n'utilise
qu'une voix en ligne.

## Installation et lancement local

Prérequis : Node.js 20 ou plus récent.

```bash
cd app
npm install
npm run dev        # http://localhost:5173
```

Autres commandes :

```bash
npm test               # tous les tests (moteur de correction, SRS, parcours, exercices, contenu)
npm run validate:content   # valide uniquement les fichiers de contenu
npm run build          # valide le contenu, vérifie les types, puis construit dans dist/
npm run preview        # sert le build de production
```

Le build **échoue** si un fichier de contenu est invalide : c'est voulu.

### Tester sur téléphone pendant le développement

```bash
npm run dev -- --host    # affiche une URL en 192.168.x.x à ouvrir sur le téléphone
```

La synthèse vocale demande une interaction de l'utilisateur sur iOS : touche un bouton « Écouter »
avant d'attendre du son.

## Ajouter ou modifier du contenu

Le contenu pédagogique est **séparé du code** : `src/content/{niveau}/{unite}.json`.

1. Crée (ou ouvre) un fichier, par exemple `src/content/A1/u1-famille.json`.
2. Respecte le schéma défini dans `src/content/schema.ts` (validé par zod).
3. Lance `npm run validate:content` : toute erreur est signalée avec le chemin exact.

Structure d'une unité :

```jsonc
{
  "id": "a1-u1",              // minuscules, chiffres, tirets
  "level": "A1",
  "order": 1,
  "theme": "Famille",
  "title_fr": "La famille",
  "description_fr": "…",
  "lessons": [
    {
      "id": "a1-u1-l1",       // doit commencer par l'id de l'unité
      "order": 1,
      "title_fr": "…",
      "goals_fr": ["…"],
      "minutes": 12,
      "steps": [ /* voir ci-dessous */ ]
    }
  ]
}
```

Les 9 types de `steps`, dans l'ordre pédagogique attendu :

| type | rôle |
|---|---|
| `listen` | mini-dialogue réaliste (obligatoirement en premier) |
| `comprehension` | questions simples sur le dialogue |
| `repeat` | phrases clés à répéter à voix haute |
| `vocab` | 1 à 10 mots maximum, avec article obligatoire pour les noms |
| `discover` | découverte inductive : on observe avant de nommer la règle |
| `rule` | règle explicite en français, avec ses exceptions |
| `practice` | exercices |
| `production` | l'apprenant écrit ses propres phrases |
| `wrapup` | mini-bilan + envoi vers la liste de révision (dernier step) |

Types d'exercices **implémentés** (les autres sont refusés à la validation) :

- `mcqAudio` : écoute puis choix d'une réponse (`audioNl`, `choices`, `answerIndex`)
- `dictation` : écoute puis écriture (`audioNl`, `fr`)
- `wordOrder` : remettre les mots dans l'ordre (`target`, `fr`, `alsoAccept`, `extraTokens`)

Règles de contenu appliquées automatiquement par les tests :

- identifiants uniques (unités, leçons, vocabulaire) ;
- article `de`/`het` obligatoire sur chaque nom ;
- 10 mots nouveaux maximum par leçon ;
- un exercice ne peut référencer qu'une règle (`ruleId`) définie dans le cours ;
- le bilan ne peut mettre en révision que du vocabulaire présent dans la leçon ;
- `needsReview: true` marque tout élément à faire relire par un locuteur natif ; il s'affiche
  « à vérifier » dans l'application. **Mieux vaut marquer que deviner.**

## Déploiement gratuit

Le build est entièrement statique (`dist/`).

### Netlify / Vercel (le plus simple)

- Répertoire du projet : `app`
- Commande de build : `npm run build`
- Dossier publié : `app/dist`
- Rien d'autre à configurer : la base du site est `/`.

### GitHub Pages (sous-chemin)

GitHub Pages sert le site sous `/<nom-du-dépôt>/`, il faut donc le préciser :

```bash
cd app
VITE_BASE=/<nom-du-depot>/ npm run build
# puis publier app/dist (par exemple avec une action GitHub Pages)
```

Le routage est en mode « history » : sur un hébergeur statique, pense à rediriger les routes
inconnues vers `index.html` (Netlify : `/* /index.html 200`).

## Compatibilité des navigateurs

| Fonction | Chrome / Edge (Android, desktop) | Safari (iOS, macOS) | Firefox |
|---|---|---|---|
| Application, leçons, exercices | oui | oui | oui |
| Synthèse vocale (écoute) | oui | oui (une interaction est requise avant le premier son) | oui |
| Voix néerlandaise | dépend des voix installées sur l'appareil | dépend des voix installées | dépend des voix installées |
| Reconnaissance vocale (phase 2) | oui (`webkitSpeechRecognition`) | à vérifier selon la version | **non** |

Points à connaître :

- **Aucune voix néerlandaise n'est garantie.** L'application détecte les voix disponibles, choisit la
  meilleure (variante demandée, puis voix locale donc hors ligne) et **affiche un avertissement**
  si aucune voix néerlandaise n'est installée : la prononciation serait alors fausse. Les leçons
  restent utilisables, le texte néerlandais est toujours affiché.
- La reconnaissance vocale de Chrome passe par un service en ligne : elle **ne fonctionne pas hors
  ligne**. Firefox ne l'implémente pas. Les exercices concernés (phase 2) seront masqués et
  remplacés par une auto-évaluation après écoute.
- La comparaison entre ce que tu prononces et la phrase cible (phase 2) sera une **estimation
  orthographique**, pas une évaluation phonétique.

## Données et vie privée

- Tout est stocké dans IndexedDB, sur l'appareil : progression, liste de révision, réglages,
  historique des tentatives.
- Rien n'est envoyé nulle part. Aucun traceur, aucune publicité, aucun compte.
- **Vider les données du site efface la progression.** Réglages → « Exporter une sauvegarde »
  produit un fichier JSON réimportable.

## Architecture

```
src/
├─ content/      # contenu pédagogique (JSON) + schéma zod + chargement
├─ engine/       # logique pure et testée : correction, SRS, parcours, machine de leçon
│  ├─ grading/   # normalisation, Levenshtein, correction texte et ordre des mots
│  └─ srs/       # cartes de révision espacée (SM-2)
├─ speech/       # synthèse vocale (Web Speech API)
├─ db/           # Dexie (IndexedDB) + dépôts de données
├─ components/   # UI : audio, exercices, étapes de leçon
├─ pages/        # accueil, parcours, leçon, liste, réglages
└─ styles/
```

La logique métier (`engine/`) ne dépend ni de React ni du navigateur : c'est elle qui est couverte
par les tests unitaires.

## Licence et contenu

Contenu pédagogique écrit pour cette application. Aucun texte, dialogue ou exercice n'est repris
d'une méthode ou d'une application existante.
