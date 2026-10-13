import { api } from './api.js';
import { dessinerMenu, dessinerProgressionGlobale } from './menu.js';
import { echapper } from './outils.js';
import { afficherAccueil } from './vues/accueil.js';
import { afficherCours } from './vues/cours.js';
import { afficherExercice } from './vues/exercice.js';
import { afficherQuiz } from './vues/quiz.js';

const menu = document.getElementById('menu');
const contenu = document.getElementById('contenu');
const progressionGlobale = document.getElementById('progression-globale');

const VUES = {
  cours: afficherCours,
  quiz: afficherQuiz,
  exercice: afficherExercice,
};

const etat = {
  chapitres: [],
  ouverts: new Set(),
  nettoyage: null,
  navigation: 0,
  versionRust: null,
};

function lireRoute() {
  const [vue = '', chapitreId, exerciceId] = location.hash.replace(/^#\/?/, '').split('/');
  return { vue, chapitreId, exerciceId };
}

function redessinerMenu() {
  dessinerMenu(menu, etat.chapitres, etat.ouverts, location.hash);
  dessinerProgressionGlobale(progressionGlobale, etat.chapitres);
}

async function rafraichirChapitres() {
  etat.chapitres = await api.chapitres();
  redessinerMenu();
}

function creerContexte(numeroNavigation) {
  return {
    conteneur: contenu,
    get chapitres() {
      return etat.chapitres;
    },
    obsolete: () => numeroNavigation !== etat.navigation,
    rafraichir: rafraichirChapitres,
    versionRust: () => {
      etat.versionRust ??= api.etat().then((reponse) => reponse.rust).catch(() => null);
      return etat.versionRust;
    },
  };
}

async function afficherRoute() {
  const numeroNavigation = ++etat.navigation;
  if (etat.nettoyage) {
    const nettoyage = etat.nettoyage;
    etat.nettoyage = null;
    await nettoyage();
  }

  document.body.classList.remove('menu-visible');
  const route = lireRoute();
  if (route.chapitreId) etat.ouverts.add(route.chapitreId);
  redessinerMenu();
  contenu.scrollTop = 0;

  const vue = VUES[route.vue] ?? afficherAccueil;
  try {
    const nettoyage = await vue(creerContexte(numeroNavigation), route.chapitreId, route.exerciceId);
    if (numeroNavigation === etat.navigation) etat.nettoyage = nettoyage ?? null;
  } catch (erreur) {
    if (numeroNavigation !== etat.navigation) return;
    contenu.innerHTML = `<div class="alerte">${echapper(erreur.message)}</div><p><a href="#/">Retour à l'accueil</a></p>`;
  }
}

menu.addEventListener('click', (evenement) => {
  const bouton = evenement.target.closest('.chapitre-titre');
  if (!bouton) return;
  const id = bouton.dataset.chapitre;
  if (etat.ouverts.has(id)) etat.ouverts.delete(id);
  else etat.ouverts.add(id);
  bouton.parentElement.classList.toggle('ouvert');
});

document.getElementById('bouton-menu').addEventListener('click', () => {
  document.body.classList.toggle('menu-visible');
});

window.addEventListener('hashchange', afficherRoute);
window.addEventListener('beforeunload', () => etat.nettoyage?.());

try {
  await rafraichirChapitres();
} catch (erreur) {
  contenu.innerHTML = `<div class="alerte">Impossible de charger les chapitres : ${echapper(erreur.message)}</div>`;
}
await afficherRoute();
