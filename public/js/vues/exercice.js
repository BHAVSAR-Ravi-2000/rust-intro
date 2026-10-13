import { api } from '../api.js';
import { creerEditeur } from '../editeur.js';
import { colorerCode, echapper, rendreMarkdown, rendreMarkdownEnLigne } from '../outils.js';
import { lienExercice, numeroChapitre, voisins } from '../parcours.js';

const DELAI_ENREGISTREMENT = 700;

const STATUTS = {
  reussi: { classe: 'succes', titre: 'Bravo, exercice réussi !' },
  echec: { classe: 'erreur', titre: 'Pas encore : la vérification échoue' },
  erreur_compilation: {
    classe: 'attention',
    titre: 'Le code ne compile pas',
    conseil: 'Lis le message jusqu’à la ligne « help: » : elle donne souvent la correction.',
  },
  delai_depasse: {
    classe: 'attention',
    titre: 'Trop long !',
    conseil: 'Ton programme tourne peut-être en boucle infinie, ou ton algorithme est trop lent.',
  },
  execute: { classe: 'info', titre: 'Programme exécuté' },
  erreur_execution: {
    classe: 'erreur',
    titre: 'Le programme a planté',
    conseil: 'Une panique arrête le programme : cherche la ligne « panicked at ».',
  },
  rust_introuvable: { classe: 'erreur', titre: 'Rust est introuvable' },
  erreur_plateforme: { classe: 'erreur', titre: 'Erreur de la plateforme' },
};

function etoiles(difficulte) {
  return `<span class="difficulte" title="Difficulté ${difficulte} sur 3">${'●'.repeat(difficulte)}${'○'.repeat(3 - difficulte)}</span>`;
}

function lienVoisin(exercice, sens) {
  if (!exercice) return '<span></span>';
  const texte = sens === 'precedent' ? `← ${echapper(exercice.titre)}` : `${echapper(exercice.titre)} →`;
  return `<a class="bouton discret" href="${lienExercice(exercice)}">${texte}</a>`;
}

function gabarit(exercice, chapitre, precedent, suivant) {
  const sortieAttendue = exercice.type === 'sortie'
    ? `<h3>Sortie attendue</h3><pre class="sortie-attendue">${echapper(exercice.sortieAttendue ?? '')}</pre>`
    : '';
  return `
    <div class="exercice">
      <section class="exercice-enonce">
        <p class="fil">Chapitre ${numeroChapitre(exercice.chapitreId)} · ${echapper(chapitre?.titre ?? '')}</p>
        <h1>${echapper(exercice.titre)}</h1>
        <div class="meta">
          ${etoiles(exercice.difficulte)}
          <span>${exercice.type === 'sortie' ? 'Vérifie ce qui est affiché' : 'Vérifié par des tests'}</span>
          <span class="badge-reussi" data-badge ${exercice.reussi ? '' : 'hidden'}>Réussi</span>
        </div>
        <div class="markdown">${rendreMarkdown(exercice.enonce)}${sortieAttendue}</div>
        <div class="bloc-aide">
          <div class="indices" data-indices></div>
          <button class="bouton" data-action="indice" ${exercice.indices.length ? '' : 'hidden'}></button>
          <button class="bouton discret" data-action="solution">Voir la solution</button>
          <div class="solution markdown" data-solution hidden></div>
        </div>
      </section>
      <section class="exercice-code">
        <div class="barre-outils">
          <button class="bouton" data-action="executer">Exécuter</button>
          <button class="bouton principal" data-action="verifier">Vérifier <kbd>Ctrl+Entrée</kbd></button>
          <span class="etat-enregistrement" data-etat></span>
          <button class="bouton discret" data-action="reinitialiser" title="Remettre le code de départ">Réinitialiser</button>
        </div>
        <div class="zone-editeur" data-editeur></div>
        <div class="resultat" data-resultat hidden></div>
        <nav class="navigation-exercices">${lienVoisin(precedent, 'precedent')}${lienVoisin(suivant, 'suivant')}</nav>
      </section>
    </div>`;
}

function rendreResultat(resultat, suivant) {
  const statut = STATUTS[resultat.statut] ?? STATUTS.erreur_plateforme;
  const resume = resultat.resume;
  const detail = resume ? `${resume.reussis} / ${resume.reussis + resume.echoues} tests réussis` : '';
  const comparer = resultat.statut === 'echec' && typeof resultat.attendu === 'string';

  const corps = comparer
    ? `<div class="comparaison">
        <div><h4>Ton programme affiche</h4><pre>${echapper(resultat.sortie?.trim() || '(rien)')}</pre></div>
        <div><h4>Attendu</h4><pre>${echapper(resultat.attendu.trim())}</pre></div>
      </div>`
    : `<pre>${echapper(resultat.sortie?.trim() || '(aucune sortie)')}</pre>`;

  const avertissements = resultat.avertissements?.trim()
    ? `<details class="avertissements"><summary>Avertissements du compilateur</summary><pre>${echapper(resultat.avertissements.trim())}</pre></details>`
    : '';

  const lienSuivant = resultat.statut === 'reussi' && suivant
    ? `<a class="bouton succes" href="${lienExercice(suivant)}">Exercice suivant →</a>`
    : '';

  return {
    classe: statut.classe,
    html: `
      <div class="resultat-entete">${statut.titre}<span class="detail">${detail}</span>${lienSuivant}</div>
      ${statut.conseil ? `<p class="resultat-conseil">${statut.conseil}</p>` : ''}
      ${corps}
      ${avertissements}`,
  };
}

export async function afficherExercice(ctx, chapitreId, exerciceId) {
  const exercice = await api.exercice(chapitreId, exerciceId);
  if (ctx.obsolete()) return null;

  const chapitre = ctx.chapitres.find((candidat) => candidat.id === chapitreId);
  const { precedent, suivant } = voisins(ctx.chapitres, chapitreId, exerciceId);
  ctx.conteneur.innerHTML = gabarit(exercice, chapitre, precedent, suivant);

  const racine = ctx.conteneur;
  const trouver = (selecteur) => racine.querySelector(selecteur);
  const zoneResultat = trouver('[data-resultat]');
  const etatEnregistrement = trouver('[data-etat]');
  const boutonIndice = trouver('[data-action="indice"]');
  const zoneIndices = trouver('[data-indices]');
  const zoneSolution = trouver('[data-solution]');
  const boutonsCode = racine.querySelectorAll('[data-action="executer"], [data-action="verifier"], [data-action="reinitialiser"]');
  colorerCode(trouver('.exercice-enonce'));

  let minuteur = null;
  let dernierEnregistre = exercice.code;
  let enCours = false;
  let indicesAffiches = 0;

  function afficherEtat(texte) {
    etatEnregistrement.textContent = texte;
  }

  async function enregistrer() {
    clearTimeout(minuteur);
    minuteur = null;
    const code = editeur.lire();
    if (code === dernierEnregistre) return;
    try {
      await api.enregistrerCode(chapitreId, exerciceId, code);
      dernierEnregistre = code;
      afficherEtat('Enregistré');
    } catch {
      afficherEtat('Échec de l’enregistrement');
    }
  }

  const editeur = creerEditeur(trouver('[data-editeur]'), exercice.code, {
    auChangement: (code) => {
      if (code === dernierEnregistre) return;
      afficherEtat('Modifié…');
      clearTimeout(minuteur);
      minuteur = setTimeout(enregistrer, DELAI_ENREGISTREMENT);
    },
    auRaccourci: (action) => (action === 'verifier' ? lancer('verifier') : enregistrer()),
  });

  function afficherResultat(resultat) {
    const { classe, html } = rendreResultat(resultat, suivant);
    zoneResultat.className = `resultat ${classe}`;
    zoneResultat.innerHTML = html;
    zoneResultat.hidden = false;
  }

  async function lancer(action) {
    if (enCours) return;
    enCours = true;
    clearTimeout(minuteur);
    const bouton = trouver(`[data-action="${action}"]`);
    boutonsCode.forEach((element) => (element.disabled = true));
    bouton.classList.add('chargement');
    zoneResultat.className = 'resultat info';
    zoneResultat.innerHTML = '<div class="resultat-entete">Compilation en cours…</div>';
    zoneResultat.hidden = false;

    try {
      const code = editeur.lire();
      const resultat = action === 'verifier'
        ? await api.verifier(chapitreId, exerciceId, code)
        : await api.executer(chapitreId, exerciceId, code);
      dernierEnregistre = code;
      afficherEtat('Enregistré');
      afficherResultat(resultat);
      if (action === 'verifier' && resultat.statut === 'reussi') {
        exercice.reussi = true;
        trouver('[data-badge]').hidden = false;
        await ctx.rafraichir();
      }
    } catch (erreur) {
      afficherResultat({ statut: 'erreur_plateforme', sortie: erreur.message });
    } finally {
      enCours = false;
      boutonsCode.forEach((element) => (element.disabled = false));
      bouton.classList.remove('chargement');
    }
  }

  function majBoutonIndice() {
    boutonIndice.textContent = `Afficher un indice (${indicesAffiches} / ${exercice.indices.length})`;
    boutonIndice.hidden = indicesAffiches >= exercice.indices.length;
  }

  function afficherIndice() {
    const indice = exercice.indices[indicesAffiches];
    if (indice === undefined) return;
    indicesAffiches++;
    zoneIndices.insertAdjacentHTML('beforeend', `<div class="indice"><p>${rendreMarkdownEnLigne(indice)}</p></div>`);
    majBoutonIndice();
  }

  async function afficherSolution() {
    if (!exercice.reussi && !confirm('Essaie encore un peu avant de regarder !\nAfficher quand même la solution ?')) return;
    const { code } = await api.solution(chapitreId, exerciceId);
    zoneSolution.innerHTML = `
      <h3>Solution</h3>
      <pre><code class="language-rust">${echapper(code)}</code></pre>
      <button class="bouton" data-action="copier-solution">Copier dans l’éditeur</button>`;
    zoneSolution.hidden = false;
    colorerCode(zoneSolution);
    zoneSolution.querySelector('[data-action="copier-solution"]').addEventListener('click', () => {
      if (confirm('Remplacer ton code par la solution ?')) editeur.ecrire(code);
    });
  }

  async function reinitialiser() {
    if (!confirm('Remettre le code de départ ?\nTon code actuel sera perdu.')) return;
    const { code } = await api.reinitialiser(chapitreId, exerciceId);
    dernierEnregistre = code;
    editeur.ecrire(code);
    zoneResultat.hidden = true;
    afficherEtat('Code de départ remis');
  }

  const actions = {
    executer: () => lancer('executer'),
    verifier: () => lancer('verifier'),
    reinitialiser,
    indice: afficherIndice,
    solution: afficherSolution,
  };

  racine.querySelector('.exercice').addEventListener('click', (evenement) => {
    const action = evenement.target.closest('[data-action]')?.dataset.action;
    actions[action]?.();
  });

  majBoutonIndice();
  return enregistrer;
}
