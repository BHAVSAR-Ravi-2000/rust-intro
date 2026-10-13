import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compterProgression, numeroChapitre, prochainExercice, voisins } from '../public/js/parcours.js';

const chapitres = [
  { id: '01-bases', exercices: [{ id: 'a', reussi: true }, { id: 'b', reussi: false }] },
  { id: '02-suite', exercices: [{ id: 'c', reussi: false }] },
];

describe('parcours', () => {
  it('extrait le numéro du chapitre', () => {
    assert.equal(numeroChapitre('02-premiers-pas'), '02');
  });

  it('trouve les exercices voisins, même entre deux chapitres', () => {
    const { precedent, suivant } = voisins(chapitres, '01-bases', 'b');
    assert.equal(precedent.id, 'a');
    assert.equal(suivant.id, 'c');
    assert.equal(suivant.chapitreId, '02-suite');
    assert.deepEqual(voisins(chapitres, '01-bases', 'inconnu'), { precedent: null, suivant: null });
  });

  it('propose le premier exercice non réussi', () => {
    assert.equal(prochainExercice(chapitres).id, 'b');
  });

  it('compte la progression', () => {
    assert.deepEqual(compterProgression(chapitres), { reussis: 1, total: 3 });
  });
});
