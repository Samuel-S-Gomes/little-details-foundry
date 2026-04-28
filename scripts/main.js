// =============================================================================
//  Meu Módulo RPG — main.js
//  FoundryVTT v13 | D&D 5e
// =============================================================================

const MODULE_ID = 'meu-modulo-rpg';

// UUID do item do mundo que será monitorado
const WATCHED_ITEM_UUID = 'Item.0otYDkF02RnuX8Gy';

// ---------------------------------------------------------------------------
//  Inicialização
// ---------------------------------------------------------------------------
Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | Módulo carregado com sucesso! ✅`);
});

// ---------------------------------------------------------------------------
//  FUNCIONALIDADE 1 — Alerta ao GM quando personagem com item vigiado é atingido
// ---------------------------------------------------------------------------

/**
 * Captura o HP atual do ator ANTES da atualização, guardando no objeto
 * de opções para comparação posterior no hook updateActor.
 */
Hooks.on('preUpdateActor', (actor, changes, options) => {
  // Verifica se haverá mudança de HP nesta atualização
  const newHp = changes?.system?.attributes?.hp?.value;
  if (newHp === undefined) return;

  // Armazena o HP anterior no objeto de opções (mesmo objeto no updateActor)
  options[MODULE_ID] ??= {};
  options[MODULE_ID].previousHp = actor.system?.attributes?.hp?.value ?? null;
});

/**
 * Após a atualização do ator, verifica se:
 *   1. O HP foi reduzido (personagem tomou dano)
 *   2. O ator possui o item vigiado EQUIPADO
 * Se ambas as condições forem atendidas, exibe um pop-up exclusivo ao GM.
 */
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

  if (!hasItemEquipped) return;

  // ── Exibe o pop-up ao GM ──────────────────────────────────────────────────
  new Dialog({
    title: '⚔️ Alerta de Combate',
    content: `
      <div style="
        text-align: center;
        padding: 12px 8px;
        font-family: var(--font-primary);
      ">
        <p style="font-size: 1.15em; margin: 0;">
          <strong>${actor.name}</strong> foi atingido!
        </p>
        <p style="font-size: 0.85em; color: #888; margin-top: 6px;">
          HP: ${previousHp} → ${newHp}
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
