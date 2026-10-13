const TITRES_ENCARTS = {
  tip: 'Astuce',
  warning: 'Attention',
  info: 'À savoir',
};

const TYPES_ENCARTS = {
  tip: 'tip',
  astuce: 'tip',
  success: 'tip',
  warning: 'warning',
  attention: 'warning',
  danger: 'warning',
  caution: 'warning',
};

export function echapper(texte = '') {
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function codeEnLigneDeSecours(texte) {
  return echapper(texte).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function appliquerEncarts(html) {
  const modele = document.createElement('template');
  modele.innerHTML = html;
  for (const citation of modele.content.querySelectorAll('blockquote')) {
    const paragraphe = citation.querySelector('p');
    const correspondance = paragraphe && /^\s*\[!(\w+)\][ \t]*([^\n]*)\n?/.exec(paragraphe.innerHTML);
    if (!correspondance) continue;
    const type = TYPES_ENCARTS[correspondance[1].toLowerCase()] ?? 'info';
    const titre = correspondance[2].trim() || TITRES_ENCARTS[type];
    citation.classList.add(`encart-${type}`);
    paragraphe.innerHTML = `<span class="encart-titre">${titre}</span>${paragraphe.innerHTML.slice(correspondance[0].length)}`;
  }
  return modele.innerHTML;
}

export function rendreMarkdown(texte = '') {
  if (!window.marked) return `<pre>${echapper(texte)}</pre>`;
  return appliquerEncarts(window.marked.parse(texte));
}

export function rendreMarkdownEnLigne(texte = '') {
  if (!window.marked) return codeEnLigneDeSecours(texte);
  return window.marked.parseInline(texte);
}

export function colorerCode(element) {
  if (!window.hljs || !element) return;
  for (const bloc of element.querySelectorAll('pre code')) {
    if (!bloc.className) bloc.classList.add('language-rust');
    window.hljs.highlightElement(bloc);
  }
}
