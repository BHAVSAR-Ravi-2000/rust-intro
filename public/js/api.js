async function requete(methode, chemin, corps) {
  const reponse = await fetch(`/api${chemin}`, {
    method: methode,
    headers: corps ? { 'Content-Type': 'application/json' } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new Error(donnees.erreur ?? `Erreur ${reponse.status}`);
  return donnees;
}

const exercice = (chapitreId, exerciceId) => `/exercices/${chapitreId}/${exerciceId}`;

export const api = {
  etat: () => requete('GET', '/etat'),
  chapitres: () => requete('GET', '/chapitres'),
  cours: (chapitreId) => requete('GET', `/chapitres/${chapitreId}/cours`),
  quiz: (chapitreId) => requete('GET', `/chapitres/${chapitreId}/quiz`),
  enregistrerQuiz: (chapitreId, score, total) => requete('POST', `/chapitres/${chapitreId}/quiz`, { score, total }),
  exercice: (chapitreId, exerciceId) => requete('GET', exercice(chapitreId, exerciceId)),
  enregistrerCode: (chapitreId, exerciceId, code) => requete('PUT', `${exercice(chapitreId, exerciceId)}/code`, { code }),
  executer: (chapitreId, exerciceId, code) => requete('POST', `${exercice(chapitreId, exerciceId)}/executer`, { code }),
  verifier: (chapitreId, exerciceId, code) => requete('POST', `${exercice(chapitreId, exerciceId)}/verifier`, { code }),
  solution: (chapitreId, exerciceId) => requete('GET', `${exercice(chapitreId, exerciceId)}/solution`),
  reinitialiser: (chapitreId, exerciceId) => requete('POST', `${exercice(chapitreId, exerciceId)}/reinitialiser`),
};
