import fs from 'node:fs/promises';
import path from 'node:path';

let fileAttente = Promise.resolve();

function enSerie(action) {
  const suite = fileAttente.then(action, action);
  fileAttente = suite.catch(() => {});
  return suite;
}

function progressionVide() {
  return { exercices: {}, quiz: {} };
}

async function ecrire(fichier, progression) {
  await fs.mkdir(path.dirname(fichier), { recursive: true });
  const temporaire = `${fichier}.tmp`;
  await fs.writeFile(temporaire, JSON.stringify(progression, null, 2), 'utf8');
  await fs.rename(temporaire, fichier);
}

export async function chargerProgression(fichier) {
  try {
    const donnees = JSON.parse(await fs.readFile(fichier, 'utf8'));
    return { exercices: donnees.exercices ?? {}, quiz: donnees.quiz ?? {} };
  } catch (erreur) {
    if (erreur.code === 'ENOENT') return progressionVide();
    throw erreur;
  }
}

export function enregistrerEssai(fichier, exerciceId, reussi) {
  return enSerie(async () => {
    const progression = await chargerProgression(fichier);
    const actuel = progression.exercices[exerciceId] ?? { essais: 0, reussi: false };
    const suivant = { essais: actuel.essais + 1, reussi: actuel.reussi || reussi };
    const dateReussite = actuel.dateReussite ?? (reussi ? new Date().toISOString() : null);
    if (dateReussite) suivant.dateReussite = dateReussite;
    progression.exercices[exerciceId] = suivant;
    await ecrire(fichier, progression);
    return suivant;
  });
}

export function enregistrerQuiz(fichier, chapitreId, score, total) {
  return enSerie(async () => {
    const progression = await chargerProgression(fichier);
    const actuel = progression.quiz[chapitreId];
    const meilleur = actuel && actuel.score / actuel.total >= score / total ? actuel : { score, total };
    progression.quiz[chapitreId] = meilleur;
    await ecrire(fichier, progression);
    return meilleur;
  });
}
