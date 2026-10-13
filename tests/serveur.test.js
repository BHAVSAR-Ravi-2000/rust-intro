import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { versionRust } from '../src/rust.js';
import { creerServeur } from '../src/serveur.js';
import { CODE_DEPART, CODE_SOLUTION, creerContenuExemple, creerDossierTemporaire, supprimerDossier } from './aide.js';

const sansRust = (await versionRust()) === null ? 'rustc n’est pas installé' : false;

describe('serveur', () => {
  let racine;
  let serveur;
  let adresse;

  async function appeler(methode, chemin, corps) {
    const reponse = await fetch(`${adresse}${chemin}`, {
      method: methode,
      headers: corps ? { 'Content-Type': 'application/json' } : undefined,
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const texte = await reponse.text();
    let donnees = texte;
    try {
      donnees = JSON.parse(texte);
    } catch {}
    return { statut: reponse.status, donnees };
  }

  before(async () => {
    racine = await creerDossierTemporaire();
    const dossierPublic = path.join(racine, 'public');
    await fs.mkdir(dossierPublic);
    await fs.writeFile(path.join(dossierPublic, 'index.html'), '<h1>Accueil</h1>');
    serveur = creerServeur({
      dossierContenu: await creerContenuExemple(racine),
      dossierTravail: path.join(racine, 'travail'),
      dossierPublic,
      fichierProgression: path.join(racine, 'progression.json'),
    });
    await new Promise((resoudre) => serveur.listen(0, '127.0.0.1', resoudre));
    adresse = `http://127.0.0.1:${serveur.address().port}`;
  });

  after(async () => {
    await new Promise((resoudre) => serveur.close(resoudre));
    await supprimerDossier(racine);
  });

  it('sert la page d’accueil', async () => {
    const { statut, donnees } = await appeler('GET', '/');
    assert.equal(statut, 200);
    assert.match(donnees, /Accueil/);
  });

  it('refuse de sortir du dossier public', async () => {
    const { statut } = await appeler('GET', '/%2e%2e/progression.json');
    assert.equal(statut, 404);
  });

  it('liste les chapitres avec la progression', async () => {
    const { statut, donnees } = await appeler('GET', '/api/chapitres');
    assert.equal(statut, 200);
    assert.equal(donnees.length, 2);
    assert.equal(donnees[0].exercices[0].reussi, false);
  });

  it('renvoie le code de départ puis le code enregistré', async () => {
    const avant = await appeler('GET', '/api/exercices/01-bases/01-double');
    assert.equal(avant.donnees.code, CODE_DEPART);
    assert.equal('solution' in avant.donnees, false);

    await appeler('PUT', '/api/exercices/01-bases/01-double/code', { code: 'fn main() {}' });
    const apres = await appeler('GET', '/api/exercices/01-bases/01-double');
    assert.equal(apres.donnees.code, 'fn main() {}');

    const remis = await appeler('POST', '/api/exercices/01-bases/01-double/reinitialiser');
    assert.equal(remis.donnees.code, CODE_DEPART);
  });

  it('enregistre le meilleur score de quiz et refuse un score invalide', async () => {
    const bon = await appeler('POST', '/api/chapitres/01-bases/quiz', { score: 1, total: 1 });
    assert.deepEqual(bon.donnees, { score: 1, total: 1 });
    const mauvais = await appeler('POST', '/api/chapitres/01-bases/quiz', { score: 5, total: 1 });
    assert.equal(mauvais.statut, 400);
  });

  it('répond 404 pour un exercice ou une route inconnue', async () => {
    assert.equal((await appeler('GET', '/api/exercices/01-bases/99-absent')).statut, 404);
    assert.equal((await appeler('GET', '/api/exercices/..%2F..%2Fsecret/x')).statut, 404);
    assert.equal((await appeler('GET', '/api/inconnue')).statut, 404);
  });

  it('exige du code pour la vérification', async () => {
    const { statut } = await appeler('POST', '/api/exercices/01-bases/01-double/verifier', {});
    assert.equal(statut, 400);
  });

  it('vérifie un exercice et marque la réussite', { skip: sansRust }, async () => {
    const echec = await appeler('POST', '/api/exercices/01-bases/01-double/verifier', { code: CODE_DEPART });
    assert.equal(echec.donnees.statut, 'echec');

    const reussite = await appeler('POST', '/api/exercices/01-bases/01-double/verifier', { code: CODE_SOLUTION });
    assert.equal(reussite.donnees.statut, 'reussi');

    const { donnees } = await appeler('GET', '/api/exercices/01-bases/01-double');
    assert.equal(donnees.reussi, true);
    assert.equal(donnees.essais, 2);
  });
});
