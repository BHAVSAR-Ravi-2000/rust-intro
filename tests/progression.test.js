import assert from 'node:assert/strict';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import * as progression from '../src/progression.js';
import { creerDossierTemporaire, supprimerDossier } from './aide.js';

describe('progression', () => {
  let dossier;
  let fichier;

  beforeEach(async () => {
    dossier = await creerDossierTemporaire();
    fichier = path.join(dossier, 'progression.json');
  });

  afterEach(() => supprimerDossier(dossier));

  it('renvoie une progression vide si le fichier n’existe pas', async () => {
    assert.deepEqual(await progression.chargerProgression(fichier), { exercices: {}, quiz: {} });
  });

  it('compte les essais et garde la réussite', async () => {
    await progression.enregistrerEssai(fichier, '01/a', false);
    await progression.enregistrerEssai(fichier, '01/a', true);
    const dernier = await progression.enregistrerEssai(fichier, '01/a', false);
    assert.equal(dernier.essais, 3);
    assert.equal(dernier.reussi, true);
    assert.ok(dernier.dateReussite);
  });

  it('supporte des enregistrements simultanés', async () => {
    await Promise.all(['a', 'b', 'c', 'd'].map((id) => progression.enregistrerEssai(fichier, `01/${id}`, true)));
    const etat = await progression.chargerProgression(fichier);
    assert.deepEqual(Object.keys(etat.exercices).sort(), ['01/a', '01/b', '01/c', '01/d']);
  });

  it('garde le meilleur score de quiz', async () => {
    await progression.enregistrerQuiz(fichier, '01', 7, 10);
    await progression.enregistrerQuiz(fichier, '01', 5, 10);
    assert.deepEqual((await progression.chargerProgression(fichier)).quiz['01'], { score: 7, total: 10 });
    await progression.enregistrerQuiz(fichier, '01', 9, 10);
    assert.deepEqual((await progression.chargerProgression(fichier)).quiz['01'], { score: 9, total: 10 });
  });
});
