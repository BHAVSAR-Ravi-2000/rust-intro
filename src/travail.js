import fs from 'node:fs/promises';
import path from 'node:path';
import { ContenuIntrouvable, idValide } from './contenu.js';

function fichierTravail(dossierTravail, chapitreId, exerciceId) {
  if (!idValide(chapitreId) || !idValide(exerciceId)) throw new ContenuIntrouvable();
  return path.join(dossierTravail, chapitreId, `${exerciceId}.rs`);
}

export async function lireTravail(dossierTravail, chapitreId, exerciceId) {
  try {
    return await fs.readFile(fichierTravail(dossierTravail, chapitreId, exerciceId), 'utf8');
  } catch (erreur) {
    if (erreur.code === 'ENOENT') return null;
    throw erreur;
  }
}

export async function enregistrerTravail(dossierTravail, chapitreId, exerciceId, code) {
  const fichier = fichierTravail(dossierTravail, chapitreId, exerciceId);
  await fs.mkdir(path.dirname(fichier), { recursive: true });
  await fs.writeFile(fichier, code, 'utf8');
}
