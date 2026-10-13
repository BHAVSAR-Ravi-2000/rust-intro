import { echapper } from './outils.js';
import { compterProgression, numeroChapitre } from './parcours.js';

export function etiquetteSource(source) {
  return source === 'cours'
    ? '<span class="etiquette etiquette-cours">Cours ESGI</span>'
    : '<span class="etiquette etiquette-fondamentaux">Fondamental</span>';
}

export function barreProgression(reussis, total) {
  const pourcentage = total === 0 ? 0 : Math.round((reussis / total) * 100);
  const complete = total > 0 && reussis === total ? ' complete' : '';
  return `<div class="barre"><div class="barre-remplie${complete}" style="width: ${pourcentage}%"></div></div>`;
}

function lien(href, texte, { classes = '', detail = '', actif }) {
  const classeActif = href === actif ? ' actif' : '';
  return `<a class="lien-menu ${classes}${classeActif}" href="${href}">${texte}${detail ? `<span class="detail">${detail}</span>` : ''}</a>`;
}

function dessinerChapitre(chapitre, ouvert, actif) {
  const { reussis, total } = compterProgression([chapitre]);
  const quiz = chapitre.meilleurQuiz ? `${chapitre.meilleurQuiz.score}/${chapitre.meilleurQuiz.total}` : '';
  const liens = [
    chapitre.aUnCours ? lien(`#/cours/${chapitre.id}`, 'Cours', { classes: 'special', actif }) : '',
    chapitre.nbQuestions > 0 ? lien(`#/quiz/${chapitre.id}`, 'Quiz', { classes: 'special', detail: quiz, actif }) : '',
    ...chapitre.exercices.map((exercice) =>
      lien(
        `#/exercice/${chapitre.id}/${exercice.id}`,
        `<span class="pastille"></span>${echapper(exercice.titre)}`,
        { classes: exercice.reussi ? 'reussi' : '', actif },
      ),
    ),
  ].join('');

  return `
    <div class="chapitre-menu${ouvert ? ' ouvert' : ''}">
      <button class="chapitre-titre" data-chapitre="${chapitre.id}" title="${echapper(chapitre.titre)}">
        <span class="numero">${numeroChapitre(chapitre.id)}</span>
        <span class="nom">${echapper(chapitre.titre)}</span>
        <span class="compteur${total > 0 && reussis === total ? ' complet' : ''}">${reussis}/${total}</span>
      </button>
      <div class="chapitre-liens">${liens}</div>
    </div>`;
}

export function dessinerMenu(conteneur, chapitres, ouverts, actif) {
  conteneur.innerHTML = chapitres.map((chapitre) => dessinerChapitre(chapitre, ouverts.has(chapitre.id), actif)).join('');
}

export function dessinerProgressionGlobale(conteneur, chapitres) {
  const { reussis, total } = compterProgression(chapitres);
  conteneur.innerHTML = `${barreProgression(reussis, total)}<span>${reussis} / ${total} exercices</span>`;
}
