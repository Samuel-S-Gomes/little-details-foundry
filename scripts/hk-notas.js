// =============================================================================
//  Meu Módulo RPG — hk-notas.js
//  Notas condicionais nas descrições do Hurricane Knight:
//    @HKSe[<id da feature>]{Título: texto}
//  vira um parágrafo "**Título:** texto" só se a ficha dona do item tiver a
//  feature <id> (compêndio hurricane-knight). Fora de uma ficha (compêndio,
//  diretório de itens) a nota aparece sempre, como referência.
//  FoundryVTT v13 | dnd5e 5.1
// =============================================================================

import { MODULE_ID } from './reminders.js';

const PACK_ID = `${MODULE_ID}.hurricane-knight`;

// O dnd5e passa o item (ou o system dele) como relativeTo em tooltip, ficha e card do chat.
function atorDoContexto(rel) {
  const doc = rel?.documentName ? rel : rel?.parent;
  return doc?.actor ?? (doc?.documentName === 'Actor' ? doc : null);
}

function temFeature(actor, id) {
  const nome = game.packs.get(PACK_ID)?.index.get(id)?.name;
  return actor.items.some(i => {
    if (i.getFlag(MODULE_ID, 'hurricaneKnight') === id) return true;
    const fonte = i._stats?.compendiumSource ?? i.flags?.core?.sourceId ?? '';
    return fonte === `Compendium.${PACK_ID}.Item.${id}` || (!!nome && i.name === nome);
  });
}

function enriquecer(match, options) {
  const [, id, texto] = match;
  const actor = atorDoContexto(options?.relativeTo);
  if (actor && !temFeature(actor, id)) {
    const vazio = document.createElement('span');
    vazio.className = 'mmr-hk-nota-oculta';
    return vazio;
  }
  const p = document.createElement('p');
  p.className = 'mmr-hk-nota';
  const i = texto.indexOf(':');
  if (i > 0) {
    const strong = document.createElement('strong');
    strong.textContent = texto.slice(0, i + 1);
    p.append(strong, texto.slice(i + 1));
  } else p.textContent = texto;
  return p;
}

export function registerHkNotas() {
  CONFIG.TextEditor.enrichers.push({
    id: 'mmrHkNota',
    pattern: /@HKSe\[([A-Za-z0-9]{16})\]\{([^}]+)\}/g,
    enricher: enriquecer,
    replaceParent: true
  });
}
