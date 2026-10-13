# Ajouter du contenu

Tout le contenu est dans le dossier `contenu/`. La plateforme relit les fichiers à chaque requête : pas besoin de redémarrer le serveur, il suffit de rafraîchir la page.

## Arborescence

```
contenu/
└── 02-premiers-pas/                 un chapitre (le numéro donne l'ordre)
    ├── chapitre.json                titre, description, source
    ├── cours.md                     résumé du cours
    ├── quiz.json                    questions à choix multiples
    └── exercices/
        └── 04-tarif/                un exercice (le numéro donne l'ordre)
            ├── exercice.json        titre, difficulté, type, indices
            ├── enonce.md            consigne
            ├── depart.rs            code donné à l'élève
            ├── solution.rs          correction
            ├── tests.rs             tests (type « tests »)
            └── sortie.txt           sortie attendue (type « sortie »)
```

Les noms de dossiers : minuscules, chiffres et tirets uniquement (`04-tarif`, pas `04_Tarif`).

## `chapitre.json`

```json
{
  "titre": "Premiers pas",
  "description": "Cargo, fonctions, types numériques, match, mutabilité.",
  "source": "cours"
}
```

`source` vaut `"cours"` (vu en cours à l'ESGI) ou `"fondamentaux"` (pas encore vu en cours).

## `cours.md`

Du Markdown classique. Les encarts façon Obsidian sont reconnus :

```markdown
> [!tip] Astuce
> Texte de l'astuce.

> [!warning] Piège
> Texte du piège.

> [!info] À savoir
> Texte.
```

## `quiz.json`

```json
[
  {
    "question": "Que renvoie `x + 1;` (avec le point-virgule) ?",
    "choix": ["x + 1", "()", "Une erreur", "Rien du tout"],
    "reponse": 1,
    "explication": "Le `;` transforme l'expression en instruction, qui vaut `()`."
  }
]
```

`reponse` est la position de la bonne réponse dans `choix` (on compte à partir de 0). Le Markdown en ligne (`code`, **gras**) marche dans les questions et les choix.

## `exercice.json`

```json
{
  "titre": "Le tarif du cinéma",
  "difficulte": 1,
  "type": "tests",
  "indices": ["Premier indice", "Deuxième indice, plus précis"]
}
```

- `difficulte` : 1 (facile), 2 (moyen), 3 (difficile).
- `type` :
  - `"tests"` : la plateforme colle `tests.rs` à la fin du code de l'élève et lance les tests.
  - `"sortie"` : la plateforme lance `main` et compare ce qui est affiché avec `sortie.txt`.
- `indices` : affichés un par un, du plus vague au plus précis.

## Les fichiers de code

- `depart.rs` et `solution.rs` contiennent **toujours** une fonction `main` (le bouton « Exécuter » la lance).
- Dans `depart.rs`, les fonctions à écrire contiennent `todo!()`, ou le code contient l'erreur à corriger.
- `solution.rs` doit compiler **sans aucun avertissement**.
- Uniquement la bibliothèque standard (pas de crate externe).
- Compilation : `rustc --edition 2024 -A dead_code`, en mode debug (un débordement d'entier provoque une panique).
- Le programme est arrêté au bout de 10 secondes.

## `tests.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enfant() {
        assert_eq!(tarif(8), 5, "un enfant de 8 ans paie 5 €");
    }
}
```

Mettre un message en français dans chaque `assert` : c'est ce que l'élève verra quand le test échoue.

## `sortie.txt`

Le texte exact attendu. Les espaces en fin de ligne et les lignes vides au début ou à la fin sont ignorés.

## Vérifier son contenu

```bash
npm run verifier-contenu                  # tout le contenu
npm run verifier-contenu -- 02            # seulement les chapitres qui commencent par 02
```

Pour chaque exercice, le script vérifie que les fichiers sont bien formés, que la solution réussit (sans avertissement) et que le code de départ **ne** réussit **pas**.
