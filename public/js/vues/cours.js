import { api } from '../api.js';
import { etiquetteSource } from '../menu.js';
import { colorerCode, rendreMarkdown } from '../outils.js';
import { numeroChapitre } from '../parcours.js';

export async function afficherCours(ctx, chapitreId) {
  const { markdown } = await api.cours(chapitreId);
  if (ctx.obsolete()) return;

  const chapitre = ctx.chapitres.find((candidat) => candidat.id === chapitreId);
  const premier = chapitre?.exercices[0];
  const actions = [
    chapitre?.nbQuestions > 0 ? `<a class="bouton" href="#/quiz/${chapitreId}">Faire le quiz</a>` : '',
    premier ? `<a class="bouton principal" href="#/exercice/${chapitreId}/${premier.id}">Commencer les exercices →</a>` : '',
  ].join('');

  ctx.conteneur.innerHTML = `
    <p class="fil">Chapitre ${numeroChapitre(chapitreId)} · Cours ${chapitre ? etiquetteSource(chapitre.source) : ''}</p>
    <article class="markdown">${rendreMarkdown(markdown)}</article>
    <div class="pied-cours">${actions}</div>`;
  colorerCode(ctx.conteneur);
}
