// =============================================================================
//  Meu Módulo RPG — recapitulador.js
//  Active Effect "Recapitulador": concede +2 de uso único a qualquer rolagem
//  do dnd5e, via checkbox no modal de rolagem. Carregado em TODOS os clientes
//  (é parte do esmodule do módulo), então a checkbox aparece para o GM e para
//  cada jogador na própria rolagem.
//  FoundryVTT v13 | dnd5e 5.x
// =============================================================================

import { MODULE_ID } from './reminders.js';

// ---------------------------------------------------------------------------
//  Constantes
// ---------------------------------------------------------------------------
const FLAG_SCOPE = 'world'; // escopo de flag sempre válido
const FLAG_KEY = 'recapitulador'; // identifica o efeito
const EFFECT_NAME = 'Recapitulador';
const EFFECT_ICON = 'icons/magic/time/clock-stopwatch-white-blue.webp';
const BONUS = 2;

// Chave da setting que liga/desliga a feature inteira.
export const RECAP_SETTING = 'recapitulador-enabled';

// ---------------------------------------------------------------------------
//  Estado por-cliente (não persiste): atores "armados" na rolagem corrente,
//  ou seja, com a checkbox marcada no último rebuild antes do submit.
// ---------------------------------------------------------------------------
const armed = new Set();

// A feature só roda se a setting estiver ligada. Lê em runtime para refletir
// mudanças sem reload. Protegido com try porque pode ser chamado antes de
// 'ready' em cenários atípicos.
function isEnabled() {
  try {
    return game.settings.get(MODULE_ID, RECAP_SETTING);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
//  Helpers de resolução de ator/efeito
// ---------------------------------------------------------------------------

// O subject da config pode ser um Actor OU uma Activity. Resolve para o Actor.
const getActor = (cfg) => {
  const s = cfg?.subject;
  if (!s) return null;
  if (s.documentName === 'Actor') return s;
  return s.actor ?? null; // Activity -> activity.actor
};

const findEffect = (actor) =>
  actor?.effects?.find((e) => e.getFlag(FLAG_SCOPE, FLAG_KEY)) ?? null;

// ---------------------------------------------------------------------------
//  1) Render do diálogo → injeta a checkbox
// ---------------------------------------------------------------------------
function onRenderRollDialog(app, html) {
  try {
    if (!isEnabled()) return;

    // Em AppV2 o 2º arg é HTMLElement; fallback jQuery por segurança.
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

    const actor = getActor(app?.config);
    if (!findEffect(actor)) return; // só injeta se o ator tem o efeito

    // Evita duplicar em re-render.
    if (root.querySelector('[name="recapitulador"]')) return;

    const form = root.tagName === 'FORM' ? root : root.querySelector('form') ?? root;

    // Monta o grupo da checkbox (sem innerHTML).
    const group = document.createElement('div');
    group.classList.add('form-group', 'mmr-recapitulador-group');

    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'recapitulador';
    label.append(input, document.createTextNode(' Usar Recapitulador (+2)'));
    group.append(label);

    // Insere antes do rodapé/botões; senão, anexa ao fim.
    const anchor = form.querySelector('footer, .dialog-buttons, .form-footer, .buttons');
    if (anchor) anchor.parentNode.insertBefore(group, anchor);
    else form.appendChild(group);

    app.setPosition?.({ height: 'auto' });
  } catch (err) {
    console.error(`${MODULE_ID} | recapitulador (render):`, err);
  }
}

// ---------------------------------------------------------------------------
//  2) dnd5e.buildRollConfig → aplica o +2 e arma/desarma
//     Roda a cada rebuild do modal (e em fast-forward com app stub).
// ---------------------------------------------------------------------------
function onBuildRollConfig(app, config, formData) {
  try {
    if (!isEnabled()) return;

    const actor = getActor(app?.config);
    if (!findEffect(actor)) return;

    const checked = !!(formData?.object?.recapitulador ?? formData?.get?.('recapitulador'));

    if (checked) {
      // A config é reconstruída do zero a cada rebuild, então somar é seguro.
      config.parts ??= [];
      config.parts.push(String(BONUS));
      armed.add(actor.uuid);
    } else {
      armed.delete(actor.uuid);
    }
  } catch (err) {
    console.error(`${MODULE_ID} | recapitulador (buildRollConfig):`, err);
  }
}

// ---------------------------------------------------------------------------
//  3) dnd5e.postRollConfiguration → consome o efeito (uma vez)
//     Dispara quando a rolagem é confirmada, antes de avaliar.
// ---------------------------------------------------------------------------
async function onPostRollConfiguration(rolls, config /*, dialog, message */) {
  try {
    if (!isEnabled()) return;

    const actor = getActor(config); // aqui config é o process config (tem subject)
    if (actor && armed.has(actor.uuid)) {
      armed.delete(actor.uuid);
      const eff = findEffect(actor);
      // O cliente de quem rolou é dono do ator → pode deletar sem socket/GM.
      if (eff) await eff.delete();
    }
  } catch (err) {
    console.error(`${MODULE_ID} | recapitulador (postRollConfiguration):`, err);
  }
}

// ---------------------------------------------------------------------------
//  4) Close do diálogo → limpa estado se fechou sem rolar
// ---------------------------------------------------------------------------
function onCloseRollDialog(app) {
  try {
    const actor = getActor(app?.config);
    if (actor) armed.delete(actor.uuid);
  } catch (err) {
    console.error(`${MODULE_ID} | recapitulador (close):`, err);
  }
}

// ---------------------------------------------------------------------------
//  Registro dos hooks — chamado no 'init' do main.js (em todos os clientes)
// ---------------------------------------------------------------------------
export function registerRecapituladorHooks() {
  // Render: o nome do hook em AppV2 é render${ClassName}. Registramos em todos
  // os nomes plausíveis; nomes inexistentes são inócuos.
  const renderHooks = [
    'renderD20RollConfigurationDialog',
    'renderRollConfigurationDialog',
    'renderDamageRollConfigurationDialog',
    'renderBasicRollConfigurationDialog'
  ];
  for (const name of renderHooks) Hooks.on(name, onRenderRollDialog);

  Hooks.on('dnd5e.buildRollConfig', onBuildRollConfig);
  Hooks.on('dnd5e.postRollConfiguration', onPostRollConfiguration);

  const closeHooks = [
    'closeD20RollConfigurationDialog',
    'closeRollConfigurationDialog',
    'closeDamageRollConfigurationDialog',
    'closeBasicRollConfigurationDialog'
  ];
  for (const name of closeHooks) Hooks.on(name, onCloseRollDialog);
}

// ---------------------------------------------------------------------------
//  API do módulo (game.modules.get(MODULE_ID).api)
// ---------------------------------------------------------------------------

// Dados do Active Effect.
function buildEffectData() {
  return {
    name: EFFECT_NAME,
    img: EFFECT_ICON, // campo "img" (não "icon", deprecado)
    description: `Concede +${BONUS} a uma única rolagem. Some após o uso.`,
    disabled: false,
    transfer: false,
    changes: [], // bônus aplicado via hook, não via change automático
    flags: { [FLAG_SCOPE]: { [FLAG_KEY]: true } }
  };
}

// Aplica o efeito (no-op com aviso se já existir).
async function apply(actor) {
  if (!actor) {
    ui.notifications?.warn('Recapitulador: nenhum ator informado.');
    return;
  }
  if (findEffect(actor)) {
    ui.notifications?.info(`${actor.name} já possui o Recapitulador.`);
    return;
  }
  await actor.createEmbeddedDocuments('ActiveEffect', [buildEffectData()]);
  ui.notifications?.info(`Recapitulador aplicado a ${actor.name}.`);
}

// Remove o efeito (no-op se não existir).
async function remove(actor) {
  const eff = findEffect(actor);
  if (!eff) return false;
  await eff.delete();
  ui.notifications?.info(`Recapitulador removido de ${actor.name}.`);
  return true;
}

// Liga/desliga: aplica se ausente, remove se presente. Usado pela macro.
async function toggle(actor) {
  if (!actor) {
    ui.notifications?.warn('Recapitulador: nenhum ator informado.');
    return;
  }
  if (findEffect(actor)) return remove(actor);
  return apply(actor);
}

// Pega o ator do token selecionado e valida.
function selectedActor() {
  const actor = canvas.tokens?.controlled?.[0]?.actor;
  if (!actor) {
    ui.notifications?.warn('Selecione um token primeiro.');
    return null;
  }
  return actor;
}

function applyToSelected() {
  const actor = selectedActor();
  if (actor) return apply(actor);
}

// Toggle no token selecionado — é o que a macro chama.
function toggleSelected() {
  const actor = selectedActor();
  if (actor) return toggle(actor);
}

export const recapituladorApi = {
  apply,
  remove,
  toggle,
  applyToSelected,
  toggleSelected
};
