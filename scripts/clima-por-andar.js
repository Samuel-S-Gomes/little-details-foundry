// =============================================================================
//  Meu Módulo RPG — clima-por-andar.js
//  Esconde as partículas do FXMaster (neve, chuva...) na tela de quem está
//  olhando um andar abaixo do chão (elevação < 0) — ex.: subsolo com Levels.
//  Decisão local, por cliente; nada é gravado no mundo.
//  FoundryVTT v13
// =============================================================================

import { MODULE_ID } from './reminders.js';

export const CLIMA_SETTING = 'clima-oculto-abaixo-do-chao';

// Elevação do andar que este cliente está vendo, ou null se não der para saber.
//  1. token(s) selecionado(s) → o mais alto deles
//  2. GM sem token → andar escolhido no widget do Levels (base da faixa)
//  3. jogador sem token → token do personagem dele (ou o primeiro que controla)
function andarVisto() {
  const selecionados = canvas.tokens?.controlled ?? [];
  if (selecionados.length) return Math.max(...selecionados.map(t => t.document.elevation ?? 0));

  if (game.user.isGM) {
    const levelsUI = CONFIG.Levels?.UI;
    if (levelsUI?.rangeEnabled && levelsUI.range?.length) {
      const base = parseFloat(levelsUI.range[0]);
      if (Number.isFinite(base)) return base;
    }
    return null;
  }

  const meu = game.user.character?.getActiveTokens()[0]
    ?? canvas.tokens?.placeables.find(t => t.isOwner);
  return meu ? (meu.document.elevation ?? 0) : null;
}

export function atualizarClimaPorAndar() {
  const camada = canvas?.particleeffects;
  if (!camada) return;
  let ativo = false;
  try { ativo = game.settings.get(MODULE_ID, CLIMA_SETTING); } catch { /* antes do init */ }
  const andar = ativo ? andarVisto() : null;
  camada.visible = !(andar !== null && andar < 0);
}

// controlToken dispara uma vez por token ao trocar a seleção; junta tudo num frame.
let agendado = false;
function agendar() {
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(() => { agendado = false; atualizarClimaPorAndar(); });
}

// ---------------------------------------------------------------------------
//  Registro dos hooks — chamado no 'init' do main.js (em todos os clientes)
// ---------------------------------------------------------------------------
export function registerClimaPorAndarHooks() {
  Hooks.on('canvasReady', agendar);
  Hooks.on('controlToken', agendar);
  Hooks.on('levelsUiChangeLevel', agendar);
  Hooks.on('updateToken', (doc, changes) => {
    if ('elevation' in changes && doc.parent === canvas.scene) agendar();
  });
  // Abrir/fechar o widget do Levels liga/desliga a faixa sem hook próprio.
  Hooks.on('renderLevelsUI', agendar);
  Hooks.on('closeLevelsUI', agendar);
}
