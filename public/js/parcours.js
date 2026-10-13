export function numeroChapitre(chapitreId) {
  return chapitreId.split('-')[0];
}

export function listeExercices(chapitres) {
  return chapitres.flatMap((chapitre) =>
    chapitre.exercices.map((exercice) => ({ ...exercice, chapitreId: chapitre.id })),
  );
}

export function lienExercice(exercice) {
  return `#/exercice/${exercice.chapitreId}/${exercice.id}`;
}

export function voisins(chapitres, chapitreId, exerciceId) {
  const liste = listeExercices(chapitres);
  const index = liste.findIndex((exercice) => exercice.chapitreId === chapitreId && exercice.id === exerciceId);
  if (index === -1) return { precedent: null, suivant: null };
  return {
    precedent: liste[index - 1] ?? null,
    suivant: liste[index + 1] ?? null,
  };
}

export function prochainExercice(chapitres) {
  return listeExercices(chapitres).find((exercice) => !exercice.reussi) ?? null;
}

export function compterProgression(chapitres) {
  const exercices = listeExercices(chapitres);
  return {
    reussis: exercices.filter((exercice) => exercice.reussi).length,
    total: exercices.length,
  };
}
