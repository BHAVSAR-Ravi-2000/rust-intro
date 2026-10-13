# Rust Entraînement

## Description

Plateforme web locale pour apprendre les fondamentaux de Rust : cours résumés, quiz et exercices vérifiés avec le `rustc` installé sur la machine. Faite à partir des cours de Rust de l'ESGI, puis complétée avec les fondamentaux pas encore vus en cours. Partagée en public avec la classe : un `git clone` puis `npm start` doit suffire.

## Stack technique

- Serveur : Node.js 20+ (ES modules), **aucune dépendance npm** (`http`, `fs`, `child_process`, `node:test`).
- Site : HTML / CSS / JavaScript pur (modules ES), sans build.
- Bibliothèques chargées par CDN avec mode de secours : CodeMirror 5.65.16 (éditeur), marked 12.0.2 (Markdown), highlight.js 11.9.0 (coloration).
- Exercices compilés avec `rustc --edition 2024 -A dead_code` (mode debug), limite d'exécution 10 s.

## Structure du projet

```
index.js              démarrage du serveur (port 3000, 127.0.0.1, ouvre le navigateur)
src/
  serveur.js          routes HTTP : API /api/* + fichiers statiques de public/
  contenu.js          lecture des chapitres, cours, quiz et exercices sur disque
  rust.js             compilation, exécution, vérification par tests ou par sortie
  progression.js      progression.json (écritures mises en file d'attente)
  travail.js          code de l'élève dans travail/<chapitre>/<exercice>.rs
  validation.js       contrôle du format du contenu
public/
  index.html, style.css
  js/app.js           routeur par hash (#/cours/..., #/quiz/..., #/exercice/...)
  js/vues/            accueil, cours, quiz, exercice
contenu/              13 chapitres (NN-nom/) avec cours.md, quiz.json, exercices/
scripts/verifier-contenu.js   vérifie tous les exercices avec rustc
tests/                tests unitaires node:test
CONTENU.md            format exact pour ajouter du contenu
```

## Architecture

- Le contenu est relu sur disque à chaque requête : ajouter un exercice ne demande pas de redémarrer.
- Vérification d'un exercice :
  - type `tests` : code de l'élève + `tests.rs` collé à la fin, compilé avec `--test`, puis analyse de la ligne `test result:` ;
  - type `sortie` : programme compilé et lancé, sortie comparée à `sortie.txt` (espaces de fin et lignes vides ignorés).
- Chaque compilation se fait dans un dossier temporaire, effacé ensuite.
- Les identifiants de chapitre et d'exercice doivent respecter `^[a-z0-9][a-z0-9-]*$` (protection contre la sortie de dossier).
- Le serveur écoute uniquement sur `127.0.0.1`, car il exécute du code.

## Conventions

- Tout le code, les noms et les textes sont en **français** (`lireExercice`, `chapitreId`...).
- Pas de commentaires dans le code.
- Une solution d'exercice doit compiler sans aucun avertissement ; le code de départ ne doit pas réussir.
- Les quiz mélangent l'ordre des choix à l'affichage. Dans `quiz.json`, `reponse` est la position d'origine.
- Messages d'assert des tests d'exercice en français.

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm start` | lance la plateforme (`--sans-navigateur` pour ne pas ouvrir le navigateur) |
| `npm test` | tests unitaires (38) |
| `npm run verifier-contenu [-- prefixe]` | vérifie le contenu, tout ou un chapitre (ex. `-- 03`) |

## État actuel

- 13 chapitres, 98 exercices, 151 questions de quiz, tous vérifiés.
- Chapitres `"source": "cours"` (vus à l'ESGI) : 01, 02, 03, 04, 13. Les autres sont `"fondamentaux"`.
- Données personnelles de l'élève ignorées par git : `travail/`, `progression.json`.
- Idées pour la suite : `TODO.md`.

## Dépendances externes

- `rustc` dans le PATH (sinon le statut `rust_introuvable` est renvoyé et un message s'affiche sur l'accueil).
- CDN cdnjs et jsdelivr pour l'éditeur et le Markdown (sans internet : simple zone de texte, Markdown brut).
