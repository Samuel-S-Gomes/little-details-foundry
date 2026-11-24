// =============================================================================
//  Ações de arma (homebrew) — complemento da macro "Ações de arma — aplicar"
//  (Foundry/macros/acoes-arma/acoes-arma.js, que grava as activities nas armas).
//
//  - Bloqueia a ação se a arma não estiver equipada ou sem proficiência.
//  - No card da ação, acrescenta o botão de TR do alvo (CD = 8 + mod. + prof.),
//    que rola para os tokens selecionados (igual ao botão de TR do dnd5e).
//    A condição o mestre aplica pela bandeja de efeitos do próprio card.
// =============================================================================

import { MODULE_ID } from './reminders.js';

// Atributo do TR do alvo por ação (mesma tabela da macro).
const TR = {
  esmagamento: 'con', incapacitante: 'con', desarmante: 'str', floreio: 'dex',
  paraCoracoes: 'con', lacerar: 'con', golpePerfurante: 'con', golpeGuarda: 'con',
  investida: 'str', enfraquecedor: 'str', jarrete: 'con', disparoPerfurante: 'con'
};

function chaveDaAcao(activity) {
  return activity?.item?.getFlag(MODULE_ID, 'acoesArma')?.[activity.id] ?? null;
}

function cdDaAcao(activity) {
  const rd = activity.getRollData();
  return 8 + (rd.mod ?? 0) + (activity.actor?.system.attributes.prof ?? 0);
}

export function registerAcoesArmaHooks() {
  // Coluna "Fórmula" da ficha (item.labels.damages) só com o dano das activities
  // normais da arma; o dano das ações de arma continua no card de cada ação.
  const Item5e = CONFIG.Item.documentClass;
  const original = Item5e.prototype._prepareLabels;
  if (original && !original._mmrAcoesArma) {
    const embrulho = function (...args) {
      const r = original.apply(this, args);
      const mapa = this.getFlag?.(MODULE_ID, 'acoesArma');
      if (mapa && this.labels?.damages?.length) {
        this.labels.damages = this.system.activities
          .filter(a => !(a.id in mapa) && ('activation' in a))
          .flatMap(a => a.labels?.damage ?? []);
      }
      return r;
    };
    embrulho._mmrAcoesArma = true;
    Item5e.prototype._prepareLabels = embrulho;
  }

  Hooks.on('dnd5e.preUseActivity', (activity) => {
    if (!chaveDaAcao(activity)) return;
    const item = activity.item;
    if (!item.system.equipped) {
      ui.notifications.warn(`${activity.name}: equipe ${item.name} na mão principal para usar a ação de arma.`);
      return false;
    }
    if (!(item.system.proficiencyMultiplier > 0)) {
      ui.notifications.warn(`${activity.name}: exige proficiência com ${item.name}.`);
      return false;
    }
  });

  Hooks.on('dnd5e.renderChatMessage', (message, html) => {
    if (message.getFlag('dnd5e', 'messageType') !== 'usage') return;
    const activity = message.getAssociatedActivity?.();
    const chave = chaveDaAcao(activity);
    const ability = TR[chave];
    if (!ability) return;
    const botoes = html.querySelector('.card-buttons');
    if (!botoes || botoes.querySelector('.mmr-tr-acao')) return;

    const dc = cdDaAcao(activity);
    const nome = CONFIG.DND5E.abilities[ability]?.label ?? ability;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('mmr-tr-acao');
    const icone = document.createElement('i');
    icone.className = 'fa-solid fa-shield-heart';
    icone.inert = true;
    const rotulo = document.createElement('span');
    rotulo.textContent = `TR de ${nome} CD ${dc}`;
    btn.append(icone, rotulo);
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      // Rola para os alvos do ataque (gravados no card); se não houver, para os tokens selecionados.
      // Nunca para o personagem de quem clicou — quem faz o TR é o alvo.
      const alvos = (message.getFlag('dnd5e', 'targets') ?? [])
        .map(t => fromUuidSync(t.uuid)).filter(Boolean)
        .map(d => d.actor ?? d);
      const selecionados = (canvas.tokens?.controlled ?? []).map(t => t.actor).filter(Boolean);
      const atores = [...new Set(alvos.length ? alvos : selecionados)].filter(a => a?.isOwner);
      if (!atores.length) {
        return ui.notifications.warn(alvos.length
          ? 'Só o mestre (ou o dono do alvo) pode rolar o TR do alvo.'
          : 'Mire (target) ou selecione o token do alvo para rolar o TR.');
      }
      for (const actor of atores) {
        await actor.rollSavingThrow({ event, ability, target: dc });
      }
    });
    botoes.appendChild(btn);
  });
}
