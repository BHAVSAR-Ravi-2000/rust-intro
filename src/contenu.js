import fs from 'node:fs/promises';
import path from 'node:path';

const FORMAT_ID = /^[a-z0-9][a-z0-9-]*$/;
const FICHIERS_EXERCICE = ['enonce.md', 'depart.rs', 'solution.rs', 'tests.rs', 'sortie.txt'];

export class ContenuIntrouvable extends Error {
  constructor(message = 'Contenu introuvable') {
    super(message);
  }
}

export function idValide(id) {
  return typeof id === 'string' && FORMAT_ID.test(id);
}

function exigerIds(...ids) {
  if (!ids.every(idValide)) throw new ContenuIntrouvable();
}

async function lireTexte(fichier) {
  try {
    return await fs.readFile(fichier, 'utf8');
  } catch (erreur) {
    if (erreur.code === 'ENOENT') return null;
    throw erreur;
  }
}

async function lireJson(fichier) {
  const texte = await lireTexte(fichier);
  if (texte === null) return null;
  try {
    return JSON.parse(texte);
  } catch (erreur) {
    throw new Error(`JSON invalide dans ${fichier} : ${erreur.message}`);
  }
}

async function sousDossiers(dossier) {
  try {
    const entrees = await fs.readdir(dossier, { withFileTypes: true });
    return entrees
      .filter((entree) => entree.isDirectory() && idValide(entree.name))
      .map((entree) => entree.name)
      .sort();
  } catch (erreur) {
    if (erreur.code === 'ENOENT') return [];
    throw erreur;
  }
}

function dossierChapitre(dossierContenu, chapitreId) {
  return path.join(dossierContenu, chapitreId);
}

function dossierExercice(dossierContenu, chapitreId, exerciceId) {
  return path.join(dossierContenu, chapitreId, 'exercices', exerciceId);
}

export async function listerIdsChapitres(dossierContenu) {
  return sousDossiers(dossierContenu);
}

export async function listerIdsExercices(dossierContenu, chapitreId) {
  exigerIds(chapitreId);
  return sousDossiers(path.join(dossierChapitre(dossierContenu, chapitreId), 'exercices'));
}

export async function listerChapitres(dossierContenu) {
  const ids = await listerIdsChapitres(dossierContenu);
  const chapitres = await Promise.all(
    ids.map((id) =>
      lireChapitre(dossierContenu, id).catch((erreur) => {
        if (erreur instanceof ContenuIntrouvable) return null;
        throw erreur;
      }),
    ),
  );
  return chapitres.filter(Boolean);
}

export async function lireChapitre(dossierContenu, chapitreId) {
  exigerIds(chapitreId);
  const dossier = dossierChapitre(dossierContenu, chapitreId);
  const meta = await lireJson(path.join(dossier, 'chapitre.json'));
  if (!meta) throw new ContenuIntrouvable(`Chapitre introuvable : ${chapitreId}`);

  const idsExercices = await listerIdsExercices(dossierContenu, chapitreId);
  const exercices = await Promise.all(
    idsExercices.map(async (id) => {
      const metaExercice = await lireJson(path.join(dossierExercice(dossierContenu, chapitreId, id), 'exercice.json'));
      return metaExercice && { id, titre: metaExercice.titre, difficulte: metaExercice.difficulte ?? 1 };
    }),
  );
  const quiz = await lireQuiz(dossierContenu, chapitreId);
  const cours = await lireTexte(path.join(dossier, 'cours.md'));

  return {
    id: chapitreId,
    titre: meta.titre,
    description: meta.description ?? '',
    source: meta.source ?? 'fondamentaux',
    aUnCours: cours !== null,
    nbQuestions: quiz.length,
    exercices: exercices.filter(Boolean),
  };
}

export async function lireCours(dossierContenu, chapitreId) {
  exigerIds(chapitreId);
  const cours = await lireTexte(path.join(dossierChapitre(dossierContenu, chapitreId), 'cours.md'));
  if (cours === null) throw new ContenuIntrouvable(`Pas de cours pour ${chapitreId}`);
  return cours;
}

export async function lireQuiz(dossierContenu, chapitreId) {
  exigerIds(chapitreId);
  return (await lireJson(path.join(dossierChapitre(dossierContenu, chapitreId), 'quiz.json'))) ?? [];
}

export async function lireMetaChapitre(dossierContenu, chapitreId) {
  exigerIds(chapitreId);
  return lireJson(path.join(dossierChapitre(dossierContenu, chapitreId), 'chapitre.json'));
}

export async function lireExercice(dossierContenu, chapitreId, exerciceId) {
  exigerIds(chapitreId, exerciceId);
  const dossier = dossierExercice(dossierContenu, chapitreId, exerciceId);
  const meta = await lireJson(path.join(dossier, 'exercice.json'));
  if (!meta) throw new ContenuIntrouvable(`Exercice introuvable : ${chapitreId}/${exerciceId}`);

  const [enonce, depart, solution, tests, sortie] = await Promise.all(
    FICHIERS_EXERCICE.map((nom) => lireTexte(path.join(dossier, nom))),
  );

  return {
    chapitreId,
    id: exerciceId,
    titre: meta.titre,
    difficulte: meta.difficulte ?? 1,
    type: meta.type ?? 'tests',
    indices: meta.indices ?? [],
    enonce: enonce ?? '',
    depart,
    solution,
    tests,
    sortieAttendue: sortie,
  };
}
