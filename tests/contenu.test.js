import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import * as contenu from '../src/contenu.js';
import { CODE_DEPART, creerContenuExemple, creerDossierTemporaire, supprimerDossier } from './aide.js';

describe('contenu', () => {
  let racine;
  let dossierContenu;

  before(async () => {
    racine = await creerDossierTemporaire();
    dossierContenu = await creerContenuExemple(racine);
  });

  after(() => supprimerDossier(racine));

  it('accepte seulement les identifiants en minuscules, chiffres et tirets', () => {
    assert.equal(contenu.idValide('02-premiers-pas'), true);
    assert.equal(contenu.idValide('../secret'), false);
    assert.equal(contenu.idValide('Dossier_Invalide'), false);
    assert.equal(contenu.idValide(''), false);
    assert.equal(contenu.idValide(undefined), false);
  });

  it('liste les chapitres dans l’ordre en ignorant les dossiers invalides', async () => {
    const chapitres = await contenu.listerChapitres(dossierContenu);
    assert.deepEqual(chapitres.map((chapitre) => chapitre.id), ['01-bases', '02-vide']);
  });

  it('résume un chapitre avec ses exercices et son quiz', async () => {
    const chapitre = await contenu.lireChapitre(dossierContenu, '01-bases');
    assert.equal(chapitre.titre, 'Les bases');
    assert.equal(chapitre.source, 'cours');
    assert.equal(chapitre.aUnCours, true);
    assert.equal(chapitre.nbQuestions, 1);
    assert.deepEqual(chapitre.exercices, [
      { id: '01-double', titre: 'Le double', difficulte: 1 },
      { id: '02-bonjour', titre: 'Bonjour', difficulte: 1 },
    ]);
  });

  it('gère un chapitre sans cours, sans quiz et sans exercice', async () => {
    const chapitre = await contenu.lireChapitre(dossierContenu, '02-vide');
    assert.equal(chapitre.aUnCours, false);
    assert.equal(chapitre.nbQuestions, 0);
    assert.deepEqual(chapitre.exercices, []);
  });

  it('lit un exercice complet', async () => {
    const exercice = await contenu.lireExercice(dossierContenu, '01-bases', '01-double');
    assert.equal(exercice.type, 'tests');
    assert.equal(exercice.depart, CODE_DEPART);
    assert.deepEqual(exercice.indices, ['Multiplie par 2']);
    assert.match(exercice.tests, /mod tests/);
    assert.equal(exercice.sortieAttendue, null);
  });

  it('lit la sortie attendue d’un exercice de type sortie', async () => {
    const exercice = await contenu.lireExercice(dossierContenu, '01-bases', '02-bonjour');
    assert.equal(exercice.type, 'sortie');
    assert.equal(exercice.sortieAttendue, 'Bonjour\n');
  });

  it('refuse les chemins dangereux et les contenus absents', async () => {
    await assert.rejects(contenu.lireExercice(dossierContenu, '..', '01-double'), contenu.ContenuIntrouvable);
    await assert.rejects(contenu.lireExercice(dossierContenu, '01-bases', '99-absent'), contenu.ContenuIntrouvable);
    await assert.rejects(contenu.lireCours(dossierContenu, '02-vide'), contenu.ContenuIntrouvable);
  });
});
