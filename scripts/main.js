// =============================================================================
//  Meu Módulo RPG — main.js
//  FoundryVTT v13 | D&D 5e
// =============================================================================

import { MODULE_ID, ReminderManager } from './reminders.js';
import { ReminderListConfig } from './reminders-config.js';
import {
  RECAP_SETTING,
  registerRecapituladorHooks,
  recapituladorApi
} from './recapitulador.js';
import {
  ELEV_SETTING_ENABLED,
  ELEV_SETTING_VIEWERS,
  registerElevationTooltipHooks,
  refreshElevationTooltips
} from './elevation-tooltip.js';
import { ElevationViewersConfig } from './elevation-viewers-config.js';
import {
  CLIMA_SETTING,
  registerClimaPorAndarHooks,
  atualizarClimaPorAndar
} from './clima-por-andar.js';
import { TELHADO_SETTING, registerTelhadoTochaHooks } from './telhado-tocha.js';
import { registerHkNotas } from './hk-notas.js';
import {
  FIXAR_SETTING_GESTO,
  registerFixarJanelasHooks,
  registerFixarJanelasKeybinding
} from './fixar-janelas.js';
import { MODULOS_SETTING, registerModulosSoMestreHooks } from './modulos-so-mestre.js';

// UUID do item do mundo que será monitorado
const WATCHED_ITEM_UUID = 'Item.0otYDkF02RnuX8Gy';

// ---------------------------------------------------------------------------
//  Registro de settings + menu de gerenciamento de lembretes
// ---------------------------------------------------------------------------
Hooks.once('init', () => {
  const notifyManager = (key) => () => {
    ReminderManager.instance?.handleSettingChange(key);
  };

  game.settings.register(MODULE_ID, 'reminder-enabled', {
    name: 'Ativar lembretes do GM',
    hint: 'Quando ligado, exibe lembretes em pop-up estilo post-it apenas para o GM.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    restricted: true,
    onChange: notifyManager('reminder-enabled')
  });

  game.settings.register(MODULE_ID, 'reminder-interval-seconds', {
    name: 'Intervalo entre lembretes (segundos)',
    hint: 'Tempo de espera entre o desaparecimento de um post-it e o aparecimento do próximo.',
    scope: 'world',
    config: true,
    type: Number,
    default: 600,
    restricted: true,
    onChange: notifyManager('reminder-interval-seconds')
  });

  game.settings.register(MODULE_ID, 'reminder-duration-seconds', {
    name: 'Duração do post-it (segundos)',
    hint: 'Por quanto tempo cada post-it permanece visível antes de sumir.',
    scope: 'world',
    config: true,
    type: Number,
    default: 10,
    restricted: true,
    onChange: notifyManager('reminder-duration-seconds')
  });

  game.settings.register(MODULE_ID, 'reminder-messages', {
    name: 'Lista de lembretes',
    scope: 'world',
    config: false,
    type: Array,
    default: [],
    restricted: true,
    onChange: notifyManager('reminder-messages')
  });

  game.settings.register(MODULE_ID, 'reminder-position', {
    name: 'Posição do post-it',
    scope: 'client',
    config: false,
    type: Object,
    default: { x: 20, y: 80 },
    onChange: notifyManager('reminder-position')
  });

  game.settings.registerMenu(MODULE_ID, 'reminder-list-menu', {
    name: 'Lista de Lembretes',
    label: 'Gerenciar Lembretes',
    hint: 'Adicione, edite ou remova as mensagens que serão exibidas no carrossel.',
    icon: 'fas fa-sticky-note',
    type: ReminderListConfig,
    restricted: true
  });

  // Setting que liga/desliga a feature Recapitulador (checkbox de +2 nas rolagens).
  game.settings.register(MODULE_ID, RECAP_SETTING, {
    name: 'Ativar Recapitulador',
    hint: 'Quando ligado, atores com o efeito "Recapitulador" ganham uma checkbox de +2 de uso único no modal de rolagem do dnd5e.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    restricted: true
  });

  // Hooks do Recapitulador precisam ser registrados em TODOS os clientes
  // (não só no do GM) para a checkbox aparecer na rolagem de cada jogador.
  registerRecapituladorHooks();

  // Ocultar elevação dos tokens: liga/desliga + mapa de quem pode ver.
  // Settings de mundo → onChange roda em todos os clientes conectados.
  game.settings.register(MODULE_ID, ELEV_SETTING_ENABLED, {
    name: 'Ocultar elevação dos tokens',
    hint: 'Esconde o número de elevação ("-10 ft") acima dos tokens para quem não estiver marcado em "Quem vê a elevação". Por padrão, só o GM vê.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    restricted: true,
    onChange: refreshElevationTooltips
  });

  game.settings.register(MODULE_ID, ELEV_SETTING_VIEWERS, {
    name: 'Usuários que veem a elevação',
    scope: 'world',
    config: false,
    type: Object,
    default: {},
    restricted: true,
    onChange: refreshElevationTooltips
  });

  game.settings.registerMenu(MODULE_ID, 'elevation-viewers-menu', {
    name: 'Quem vê a elevação',
    label: 'Escolher usuários',
    hint: 'Marque quais usuários continuam vendo o número de elevação acima dos tokens.',
    icon: 'fas fa-layer-group',
    type: ElevationViewersConfig,
    restricted: true
  });

  // Em todos os clientes: cada um decide localmente se oculta o tooltip.
  registerElevationTooltipHooks();

  // Clima por andar: esconde as partículas do FXMaster abaixo do chão.
  game.settings.register(MODULE_ID, CLIMA_SETTING, {
    name: 'Esconder clima abaixo do chão',
    hint: 'Esconde as partículas do FXMaster (neve, chuva...) para quem está vendo um andar com elevação negativa: token selecionado, andar escolhido no Levels (GM) ou o token do próprio jogador.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    restricted: true,
    onChange: atualizarClimaPorAndar
  });
  registerClimaPorAndarHooks();

  // Telhado à luz da tocha: telhado visto de fora recortado pelo alcance da luz/visão.
  game.settings.register(MODULE_ID, TELHADO_SETTING, {
    name: 'Telhado à luz da tocha',
    hint: 'Nos tiles marcados com "Telhado à luz da tocha" (aba Sobreposição), o telhado visto de fora aparece só até onde a luz ou a visão do token alcança — inteiro de dia.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    restricted: true,
    onChange: () => canvas.ready && canvas.perception.update({ refreshVision: true, refreshLighting: true })
  });
  registerTelhadoTochaHooks();

  // Notas do Hurricane Knight que só aparecem se a ficha tiver a feature citada.
  registerHkNotas();

  // Fixar janelas (ESC e ✕ não fecham a janela fixada).
  game.settings.register(MODULE_ID, FIXAR_SETTING_GESTO, {
    name: 'Gesto para fixar janela',
    hint: 'Gesto na barra de título que fixa a janela (ela deixa de fechar com ESC ou com o ✕). Para soltar, clique no alfinete.',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      'duplo-direito': 'Duplo clique direito',
      'shift-direito': 'Shift + clique direito',
      'duplo-meio': 'Duplo clique do botão do meio',
      'nenhum': 'Desligado'
    },
    default: 'duplo-direito'
  });
  registerFixarJanelasKeybinding();
  registerFixarJanelasHooks();

  // Gerenciar Módulos só para o Mestre.
  game.settings.register(MODULE_ID, MODULOS_SETTING, {
    name: 'Módulos visíveis só para o Mestre',
    hint: 'Jogadores não veem "Gerenciar Módulos", "Detalhes de Suporte" nem a contagem de módulos na aba Configurações.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    restricted: true,
    onChange: () => ui.sidebar?.tabs?.settings?.render()
  });
  registerModulosSoMestreHooks();

  // Expõe a API para uso via macro: game.modules.get('meu-modulo-rpg').api
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = recapituladorApi;

  loadTemplates([
    'modules/meu-modulo-rpg/templates/reminders-config.hbs',
    'modules/meu-modulo-rpg/templates/elevation-viewers-config.hbs'
  ]);
});

// ---------------------------------------------------------------------------
//  Inicialização
// ---------------------------------------------------------------------------
Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | Módulo carregado com sucesso! ✅`);
  if (game.user.isGM) ReminderManager.init();
});

// ---------------------------------------------------------------------------
//  FUNCIONALIDADE 1 — Alerta ao GM quando personagem com item vigiado é atingido
// ---------------------------------------------------------------------------

/**
 * Captura o HP atual do ator ANTES da atualização, guardando no objeto
 * de opções para comparação posterior no hook updateActor.
 */
// FUNCIONALIDADE DESATIVADA — preservada para possível reativação futura
/*
Hooks.on('preUpdateActor', (actor, changes, options) => {
  // Verifica se haverá mudança de HP nesta atualização
  const newHp = changes?.system?.attributes?.hp?.value;
  if (newHp === undefined) return;

  // Armazena o HP anterior no objeto de opções (mesmo objeto no updateActor)
  options[MODULE_ID] ??= {};
  options[MODULE_ID].previousHp = actor.system?.attributes?.hp?.value ?? null;
});
*/

/**
 * Após a atualização do ator, verifica se:
 *   1. O HP foi reduzido (personagem tomou dano)
 *   2. O ator possui o item vigiado EQUIPADO
 * Se ambas as condições forem atendidas, exibe um pop-up exclusivo ao GM.
 */
// FUNCIONALIDADE DESATIVADA — preservada para possível reativação futura
/*
Hooks.on('updateActor', (actor, changes, options) => {
  // Executa apenas no cliente do GM
  if (!game.user.isGM) return;

  // Só continua se houve alteração no HP
  const newHp = changes?.system?.attributes?.hp?.value;
  if (newHp === undefined) return;

  // Recupera o HP anterior armazenado no preUpdateActor
  const previousHp = options[MODULE_ID]?.previousHp;
  if (previousHp === null || previousHp === undefined) return;

  // Só dispara se o HP DIMINUIU (dano recebido)
  if (newHp >= previousHp) return;

  // Verifica se o ator possui o item vigiado e ele está equipado
  const hasItemEquipped = actor.items.some(item => {
    // O item precisa estar equipado no sistema D&D 5e
    if (!item.system?.equipped) return false;

    // Quando um item do mundo é arrastado para um ator, o Foundry registra
    // a UUID original em flags.core.sourceId — é isso que comparamos.
    const sourceId = item.flags?.core?.sourceId
      ?? foundry.utils.getProperty(item, '_stats.compendiumSource')
      ?? null;

    return sourceId === WATCHED_ITEM_UUID;
  });

  // Recupera o item vigiado equipado para exibir o nome no popup
  const watchedItem = actor.items.find(item => {
    if (!item.system?.equipped) return false;
    const sourceId = item.flags?.core?.sourceId
      ?? foundry.utils.getProperty(item, '_stats.compendiumSource')
      ?? null;
    return sourceId === WATCHED_ITEM_UUID;
  });

  const damageTaken = previousHp - newHp;

  // ── Exibe o pop-up ao GM ──────────────────────────────────────────────────
  new Dialog({
    title: '⚔️ Alerta de Combate',
    content: `
      <div style="
        text-align: center;
        padding: 14px 10px;
        font-family: var(--font-primary);
      ">
        <p style="font-size: 1.2em; margin: 0 0 6px 0;">
          <strong>${actor.name}</strong> foi atingido!
        </p>
        <p style="font-size: 0.9em; color: #c0392b; margin: 0 0 4px 0;">
          ❤️ HP: ${previousHp} → ${newHp}
          &nbsp;|&nbsp;
          <strong>-${damageTaken}</strong>
        </p>
        <p style="font-size: 0.8em; color: #888; margin: 8px 0 0 0;">
          🛡️ Item: <em>${watchedItem?.name ?? 'Item especial'}</em>
        </p>
      </div>
    `,
    buttons: {
      ok: {
        icon: '<i class="fas fa-check"></i>',
        label: 'OK'
      }
    },
    default: 'ok'
  }).render(true);
});
*/
