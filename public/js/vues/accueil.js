import { barreProgression, etiquetteSource } from '../menu.js';
import { echapper } from '../outils.js';
import { compterProgression, lienExercice, numeroChapitre, prochainExercice } from '../parcours.js';

function carteChapitre(chapitre) {
  const { reussis, total } = compterProgression([chapitre]);
  const premier = chapitre.exercices[0];
  const liens = [
    chapitre.aUnCours ? `<a href="#/cours/${chapitre.id}">Cours</a>` : '',
    chapitre.nbQuestions > 0 ? `<a href="#/quiz/${chapitre.id}">Quiz</a>` : '',
    premier ? `<a href="#/exercice/${chapitre.id}/${premier.id}">Exercices</a>` : '',
  ].join('');
  const quiz = chapitre.meilleurQuiz ? ` · quiz ${chapitre.meilleurQuiz.score}/${chapitre.meilleurQuiz.total}` : '';

  return `
    <article class="carte-chapitre">
      <div><span class="numero">${numeroChapitre(chapitre.id)}</span> ${etiquetteSource(chapitre.source)}</div>
      <h3>${echapper(chapitre.titre)}</h3>
      <p>${echapper(chapitre.description)}</p>
      ${barreProgression(reussis, total)}
      <div class="carte-pied">
        <span>${reussis} / ${total} exercices${quiz}</span>
        <div class="carte-liens">${liens}</div>
      </div>
    </article>`;
}

export async function afficherAccueil(ctx) {
  const chapitres = ctx.chapitres;
  const { reussis, total } = compterProgression(chapitres);
  const avecQuiz = chapitres.filter((chapitre) => chapitre.nbQuestions > 0);
  const quizFaits = avecQuiz.filter((chapitre) => chapitre.meilleurQuiz).length;
  const suivant = prochainExercice(chapitres);
  const boutonSuivant = suivant
    ? `<a class="bouton principal" href="${lienExercice(suivant)}">${reussis === 0 ? 'Commencer' : 'Continuer'} : ${echapper(suivant.titre)} →</a>`
    : total > 0
      ? '<p class="badge-reussi">Tous les exercices sont réussis, bravo !</p>'
      : '';

  ctx.conteneur.innerHTML = `
    <section class="accueil">
      <h1>Entraîne-toi à Rust</h1>
      <p class="accueil-intro">Tous les chapitres du cours ESGI, plus les fondamentaux à connaître ensuite. Pour chaque chapitre : un cours résumé, un quiz et des exercices vérifiés par ton propre compilateur Rust.</p>
      <div id="alerte-rust"></div>
      <div class="statistiques">
        <div class="statistique"><div class="valeur">${reussis} / ${total}</div><div class="libelle">exercices réussis</div></div>
        <div class="statistique"><div class="valeur">${quizFaits} / ${avecQuiz.length}</div><div class="libelle">quiz terminés</div></div>
        <div class="statistique"><div class="valeur">${chapitres.length}</div><div class="libelle">chapitres</div></div>
      </div>
      ${boutonSuivant}
      <h2>Chapitres</h2>
      <div class="grille-chapitres">${chapitres.map(carteChapitre).join('')}</div>
      <h2>Comment ça marche</h2>
      <div class="etapes">
        <div class="etape"><strong>1. Lis le cours</strong>Un résumé clair de chaque chapitre, avec les pièges à éviter.</div>
        <div class="etape"><strong>2. Fais le quiz</strong>Pour vérifier que tu as compris la théorie. Ton meilleur score est gardé.</div>
        <div class="etape"><strong>3. Code</strong>« Exécuter » lance ton programme, « Vérifier » (Ctrl + Entrée) lance les tests.</div>
        <div class="etape"><strong>4. Bloqué ?</strong>Les indices arrivent un par un. La solution est disponible en dernier recours.</div>
      </div>
    </section>`;

  const version = await ctx.versionRust();
  if (ctx.obsolete()) return;
  const alerte = ctx.conteneur.querySelector('#alerte-rust');
  if (alerte && !version) {
    alerte.innerHTML = '<div class="alerte"><strong>Rust est introuvable.</strong> Installe-le avec rustup (https://rustup.rs), puis relance la plateforme.</div>';
  }
}
