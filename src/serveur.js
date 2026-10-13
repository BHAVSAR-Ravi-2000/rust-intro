import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as contenu from './contenu.js';
import * as progression from './progression.js';
import * as rust from './rust.js';
import * as travail from './travail.js';

const TAILLE_MAX_CORPS = 512 * 1024;
const TYPES_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

export class ErreurHttp extends Error {
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}

function envoyerJson(reponse, statut, donnees) {
  reponse.writeHead(statut, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  reponse.end(JSON.stringify(donnees));
}

async function lireCorpsJson(requete) {
  const morceaux = [];
  let taille = 0;
  for await (const morceau of requete) {
    taille += morceau.length;
    if (taille > TAILLE_MAX_CORPS) throw new ErreurHttp(413, 'Requête trop volumineuse');
    morceaux.push(morceau);
  }
  try {
    return JSON.parse(Buffer.concat(morceaux).toString('utf8') || '{}');
  } catch {
    throw new ErreurHttp(400, 'JSON invalide');
  }
}

async function lireCode(requete) {
  const { code } = await lireCorpsJson(requete);
  if (typeof code !== 'string') throw new ErreurHttp(400, 'Le champ « code » est obligatoire');
  return code;
}

async function servirFichier(dossierPublic, chemin, reponse) {
  let relatif;
  try {
    relatif = chemin === '/' ? 'index.html' : decodeURIComponent(chemin).replace(/^\/+/, '');
  } catch {
    throw new ErreurHttp(404, 'Fichier introuvable');
  }
  const racine = path.resolve(dossierPublic);
  const fichier = path.resolve(racine, relatif);
  if (!fichier.startsWith(racine + path.sep)) throw new ErreurHttp(404, 'Fichier introuvable');

  let donnees;
  try {
    donnees = await fs.readFile(fichier);
  } catch {
    throw new ErreurHttp(404, 'Fichier introuvable');
  }
  reponse.writeHead(200, {
    'Content-Type': TYPES_MIME[path.extname(fichier)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  reponse.end(donnees);
}

function creerRoutes({ dossierContenu, dossierTravail, fichierProgression }) {
  const cle = (chapitreId, exerciceId) => `${chapitreId}/${exerciceId}`;

  async function chapitresAvecProgression() {
    const [chapitres, etat] = await Promise.all([
      contenu.listerChapitres(dossierContenu),
      progression.chargerProgression(fichierProgression),
    ]);
    return chapitres.map((chapitre) => ({
      ...chapitre,
      meilleurQuiz: etat.quiz[chapitre.id] ?? null,
      exercices: chapitre.exercices.map((exercice) => ({
        ...exercice,
        reussi: Boolean(etat.exercices[cle(chapitre.id, exercice.id)]?.reussi),
      })),
    }));
  }

  async function exercicePourEleve([chapitreId, exerciceId]) {
    const [exercice, code, etat] = await Promise.all([
      contenu.lireExercice(dossierContenu, chapitreId, exerciceId),
      travail.lireTravail(dossierTravail, chapitreId, exerciceId),
      progression.chargerProgression(fichierProgression),
    ]);
    const suivi = etat.exercices[cle(chapitreId, exerciceId)];
    return {
      chapitreId,
      id: exerciceId,
      titre: exercice.titre,
      difficulte: exercice.difficulte,
      type: exercice.type,
      enonce: exercice.enonce,
      indices: exercice.indices,
      sortieAttendue: exercice.type === 'sortie' ? exercice.sortieAttendue : null,
      code: code ?? exercice.depart ?? '',
      reussi: Boolean(suivi?.reussi),
      essais: suivi?.essais ?? 0,
    };
  }

  async function enregistrerCode([chapitreId, exerciceId], requete) {
    const code = await lireCode(requete);
    await contenu.lireExercice(dossierContenu, chapitreId, exerciceId);
    await travail.enregistrerTravail(dossierTravail, chapitreId, exerciceId, code);
    return code;
  }

  return [
    {
      methode: 'GET',
      motif: /^\/api\/etat$/,
      action: async () => ({ rust: await rust.versionRust() }),
    },
    {
      methode: 'GET',
      motif: /^\/api\/chapitres$/,
      action: chapitresAvecProgression,
    },
    {
      methode: 'GET',
      motif: /^\/api\/chapitres\/([^/]+)\/cours$/,
      action: async ([chapitreId]) => ({ markdown: await contenu.lireCours(dossierContenu, chapitreId) }),
    },
    {
      methode: 'GET',
      motif: /^\/api\/chapitres\/([^/]+)\/quiz$/,
      action: ([chapitreId]) => contenu.lireQuiz(dossierContenu, chapitreId),
    },
    {
      methode: 'POST',
      motif: /^\/api\/chapitres\/([^/]+)\/quiz$/,
      action: async ([chapitreId], requete) => {
        const { score, total } = await lireCorpsJson(requete);
        if (!Number.isInteger(score) || !Number.isInteger(total) || total <= 0 || score < 0 || score > total) {
          throw new ErreurHttp(400, 'Score invalide');
        }
        await contenu.lireChapitre(dossierContenu, chapitreId);
        return progression.enregistrerQuiz(fichierProgression, chapitreId, score, total);
      },
    },
    {
      methode: 'GET',
      motif: /^\/api\/exercices\/([^/]+)\/([^/]+)$/,
      action: exercicePourEleve,
    },
    {
      methode: 'PUT',
      motif: /^\/api\/exercices\/([^/]+)\/([^/]+)\/code$/,
      action: async (parametres, requete) => {
        await enregistrerCode(parametres, requete);
        return { enregistre: true };
      },
    },
    {
      methode: 'POST',
      motif: /^\/api\/exercices\/([^/]+)\/([^/]+)\/executer$/,
      action: async (parametres, requete) => rust.executerProgramme(await enregistrerCode(parametres, requete)),
    },
    {
      methode: 'POST',
      motif: /^\/api\/exercices\/([^/]+)\/([^/]+)\/verifier$/,
      action: async ([chapitreId, exerciceId], requete) => {
        const code = await enregistrerCode([chapitreId, exerciceId], requete);
        const exercice = await contenu.lireExercice(dossierContenu, chapitreId, exerciceId);
        const resultat = await rust.verifierExercice(exercice, code);
        if (resultat.statut !== 'rust_introuvable') {
          await progression.enregistrerEssai(fichierProgression, cle(chapitreId, exerciceId), resultat.statut === 'reussi');
        }
        return resultat;
      },
    },
    {
      methode: 'GET',
      motif: /^\/api\/exercices\/([^/]+)\/([^/]+)\/solution$/,
      action: async ([chapitreId, exerciceId]) => {
        const exercice = await contenu.lireExercice(dossierContenu, chapitreId, exerciceId);
        return { code: exercice.solution ?? '' };
      },
    },
    {
      methode: 'POST',
      motif: /^\/api\/exercices\/([^/]+)\/([^/]+)\/reinitialiser$/,
      action: async ([chapitreId, exerciceId]) => {
        const exercice = await contenu.lireExercice(dossierContenu, chapitreId, exerciceId);
        const code = exercice.depart ?? '';
        await travail.enregistrerTravail(dossierTravail, chapitreId, exerciceId, code);
        return { code };
      },
    },
  ];
}

async function traiterApi(routes, requete, chemin) {
  const route = routes.find((candidate) => candidate.methode === requete.method && candidate.motif.test(chemin));
  if (!route) throw new ErreurHttp(404, 'Route inconnue');
  const parametres = route.motif.exec(chemin).slice(1);
  return route.action(parametres, requete);
}

function statutErreur(erreur) {
  if (erreur instanceof ErreurHttp) return erreur.statut;
  if (erreur instanceof contenu.ContenuIntrouvable) return 404;
  return 500;
}

export function creerServeur(config) {
  const routes = creerRoutes(config);
  return http.createServer(async (requete, reponse) => {
    try {
      const { pathname } = new URL(requete.url, 'http://localhost');
      if (pathname.startsWith('/api/')) {
        envoyerJson(reponse, 200, await traiterApi(routes, requete, pathname));
      } else {
        await servirFichier(config.dossierPublic, pathname, reponse);
      }
    } catch (erreur) {
      const statut = statutErreur(erreur);
      if (statut === 500) console.error(erreur);
      envoyerJson(reponse, statut, { erreur: erreur.message || 'Erreur interne' });
    }
  });
}
