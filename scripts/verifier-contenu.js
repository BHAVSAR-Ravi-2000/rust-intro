import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as contenu from '../src/contenu.js';
import { verifierExercice } from '../src/rust.js';
import { validerExercice, validerMetaChapitre, validerQuiz } from '../src/validation.js';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dossierContenu = path.join(racine, 'contenu');
const filtre = process.argv[2];
const EN_PARALLELE = 4;

function indenter(texte = '') {
  return texte
    .trim()
    .split('\n')
    .map((ligne) => `        ${ligne}`)
    .join('\n');
}

async function enParallele(taches, limite) {
  const resultats = [];
  let prochain = 0;
  async function ouvrier() {
    while (prochain < taches.length) {
      const index = prochain++;
      resultats[index] = await taches[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, taches.length) }, ouvrier));
  return resultats;
}

async function verifierCode(exercice) {
  const problemes = [];
  const solution = await verifierExercice(exercice, exercice.solution);
  if (solution.statut !== 'reussi') {
    problemes.push(`la solution ne passe pas (${solution.statut}) :\n${indenter(solution.sortie)}`);
  } else if (solution.avertissements?.trim()) {
    problemes.push(`la solution produit des avertissements :\n${indenter(solution.avertissements)}`);
  }
  const depart = await verifierExercice(exercice, exercice.depart);
  if (depart.statut === 'reussi') problemes.push('le code de départ passe déjà la vérification');
  return problemes;
}

async function verifierUnExercice(chapitreId, exerciceId) {
  try {
    const exercice = await contenu.lireExercice(dossierContenu, chapitreId, exerciceId);
    const problemes = validerExercice(exercice);
    if (problemes.length > 0) return problemes;
    return await verifierCode(exercice);
  } catch (erreur) {
    return [erreur.message];
  }
}

async function problemesDuChapitre(chapitreId) {
  const problemes = [];
  try {
    problemes.push(...validerMetaChapitre(await contenu.lireMetaChapitre(dossierContenu, chapitreId)));
    problemes.push(...validerQuiz(await contenu.lireQuiz(dossierContenu, chapitreId)));
    await contenu.lireCours(dossierContenu, chapitreId).catch(() => problemes.push('cours.md manquant'));
  } catch (erreur) {
    problemes.push(erreur.message);
  }
  return problemes;
}

async function principal() {
  const idsChapitres = (await contenu.listerIdsChapitres(dossierContenu)).filter((id) => !filtre || id.startsWith(filtre));
  let total = 0;
  let enErreur = 0;

  for (const chapitreId of idsChapitres) {
    console.log(`\n${chapitreId}`);
    const problemesChapitre = await problemesDuChapitre(chapitreId);
    for (const probleme of problemesChapitre) console.log(`  ✗ ${probleme}`);
    if (problemesChapitre.length > 0) enErreur++;

    const idsExercices = await contenu.listerIdsExercices(dossierContenu, chapitreId);
    const resultats = await enParallele(
      idsExercices.map((exerciceId) => () => verifierUnExercice(chapitreId, exerciceId)),
      EN_PARALLELE,
    );

    idsExercices.forEach((exerciceId, index) => {
      total++;
      const problemes = resultats[index];
      if (problemes.length === 0) {
        console.log(`  ✓ ${exerciceId}`);
        return;
      }
      enErreur++;
      console.log(`  ✗ ${exerciceId}`);
      for (const probleme of problemes) console.log(`      - ${probleme}`);
    });
  }

  console.log(`\n${total} exercice(s) vérifié(s), ${enErreur} élément(s) avec problème.`);
  process.exitCode = enErreur > 0 ? 1 : 0;
}

await principal();
