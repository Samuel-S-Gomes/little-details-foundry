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

// Marca colocada na PROCESS config compartilhada entre buildRollConfig e
// postRollConfiguration (é o mesmo objeto durante uma rolagem), sinalizando
// que o efeito deve ser consumido quando a rolagem for confirmada.
const CONSUME_KEY = '_mmrRecapituladorConsume';

// Chave da setting que liga/desliga a feature inteira.
export const RECAP_SETTING = 'recapitulador-enabled';

// A feature só roda se a setting estiver ligada. Lê em runtime para refletir
// mudanças sem reload.
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

// O subject da process config pode ser um Actor OU uma Activity. Resolve p/ Actor.
const getActor = (cfg) => {
  const s = cfg?.subject;
  if (!s) return null;
  if (s.documentName === 'Actor') return s;
  return s.actor ?? null; // Activity -> activity.actor
};

const findEffect = (actor) =>
  actor?.effects?.find((e) => e.getFlag(FLAG_SCOPE, FLAG_KEY)) ?? null;

// Lê o estado da checkbox a partir do FormData (FormDataExtended converte
// checkbox para boolean; checkbox desmarcada nem aparece no form).
function isChecked(formData) {
  if (!formData) return false;
  let v;
  if (typeof formData.get === 'function') v = formData.get('recapitulador');
  if (v === undefined && formData.object) v = formData.object.recapitulador;
  return v === true || v === 'on' || v === 'true' || v === 1 || v === '1';
}

// ---------------------------------------------------------------------------
//  1) Render do diálogo → injeta a checkbox DENTRO do <form>
//     (precisa estar no form para entrar no FormData e disparar rebuild)
// ---------------------------------------------------------------------------
function onRenderRollDialog(app, element) {
  try {
    if (!isEnabled()) return;

    const actor = getActor(app?.config);
    if (!findEffect(actor)) return; // só injeta se o ator tem o efeito

    // app.form é o <form> real do diálogo; fallback robusto se indisponível.
    const root = element instanceof HTMLElement ? element : element?.[0];
    const form =
      app?.form instanceof HTMLFormElement
        ? app.form
        : root?.tagName === 'FORM'
          ? root
          : root?.querySelector('form') ?? root;
    if (!form) return;

    // Evita duplicar em re-render.
    if (form.querySelector('[name="recapitulador"]')) return;

    // Monta o grupo da checkbox (sem innerHTML).
    const group = document.createElement('div');
    group.classList.add('form-group', 'mmr-recapitulador-group');

    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'recapitulador';
    label.append(input, document.createTextNode(' Usar Recapitulador (+2)'));
    group.append(label);

    // Insere antes dos botões (mantendo o grupo dentro do form); senão, anexa.
    const buttons = form.querySelector(
      '.dialog-buttons, footer, .form-footer, [data-application-part="buttons"]'
    );
    if (buttons?.parentElement) buttons.parentElement.insertBefore(group, buttons);
    else form.appendChild(group);

    app.setPosition?.({ height: 'auto' });
  } catch (err) {
    console.error(`${MODULE_ID} | recapitulador (render):`, err);
  }
}

// ---------------------------------------------------------------------------
//  2) dnd5e.buildRollConfig → aplica o +2 e marca a process config p/ consumo
//     Assinatura: (app, config, formData, index). Roda a cada rebuild do modal.
//     `app.config` é a PROCESS config (mesmo objeto recebido em
//     postRollConfiguration), então marcamos a intenção de consumo nela.
// ---------------------------------------------------------------------------
function onBuildRollConfig(app, config, formData /*, index */) {
  try {
    if (!isEnabled()) return;

    const process = app?.config;
    const actor = getActor(process);
    if (!findEffect(actor)) return;

    const checked = isChecked(formData);

    if (checked) {
      // A config de cada rolagem é reconstruída do zero a cada rebuild, então
      // somar o +2 aqui é seguro (não duplica entre rebuilds).
      config.parts ??= [];
      config.parts.push(String(BONUS));
    }

    // Marca/desmarca a intenção de consumo no objeto compartilhado. O último
    // rebuild antes do submit define o estado final.
    if (process) process[CONSUME_KEY] = checked;
  } catch (err) {
    console.error(`${MODULE_ID} | recapitulador (buildRollConfig):`, err);
  }
}

// ---------------------------------------------------------------------------
//  3) dnd5e.postRollConfiguration → consome o efeito (uma vez)
//     Assinatura: (rolls, config, dialog, message). `config` é a MESMA process
//     config marcada em buildRollConfig. Dispara quando a rolagem é confirmada,
//     antes de avaliar.
// ---------------------------------------------------------------------------
async function onPostRollConfiguration(rolls, config /*, dialog, message */) {
  try {
    if (!isEnabled()) return;
    if (!config?.[CONSUME_KEY]) return;

    // Evita consumir de novo se o hook reentrar por algum motivo.
    config[CONSUME_KEY] = false;

    const actor = getActor(config);
    const eff = findEffect(actor);
    // O cliente de quem rolou é dono do ator → pode deletar sem socket/GM.
    if (eff) await eff.delete();
  } catch (err) {
    console.error(`${MODULE_ID} | recapitulador (postRollConfiguration):`, err);
  }
}

// ---------------------------------------------------------------------------
//  Registro dos hooks — chamado no 'init' do main.js (em todos os clientes)
// ---------------------------------------------------------------------------
export function registerRecapituladorHooks() {
  // Render: o nome do hook em AppV2 é render${ClassName}. A classe d20 do dnd5e
  // é D20RollConfigurationDialog; registramos em todos os nomes plausíveis.
  const renderHooks = [
    'renderD20RollConfigurationDialog',
    'renderRollConfigurationDialog',
    'renderDamageRollConfigurationDialog',
    'renderBasicRollConfigurationDialog'
  ];
  for (const name of renderHooks) Hooks.on(name, onRenderRollDialog);

  // buildRollConfig (variante "") sempre dispara, independentemente do tipo.
  Hooks.on('dnd5e.buildRollConfig', onBuildRollConfig);
  Hooks.on('dnd5e.postRollConfiguration', onPostRollConfiguration);
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
    // `statuses` torna o efeito "temporário" → o ícone aparece no token.
    statuses: [FLAG_KEY],
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
