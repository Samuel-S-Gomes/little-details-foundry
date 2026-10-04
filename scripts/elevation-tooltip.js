// =============================================================================
//  Meu Módulo RPG — elevation-tooltip.js
//  Oculta o número de elevação ("-10 ft") desenhado pelo core acima dos tokens,
//  exceto para os usuários marcados como "podem ver". Carregado em TODOS os
//  clientes; as settings são de mundo, então qualquer mudança do GM se propaga
//  na hora para todos os conectados (onChange roda em cada cliente).
//  FoundryVTT v13
// =============================================================================

import { MODULE_ID } from './reminders.js';

// Chaves das settings (registradas no main.js).
export const ELEV_SETTING_ENABLED = 'elevation-tooltip-hide-enabled';
export const ELEV_SETTING_VIEWERS = 'elevation-tooltip-viewers';

// Cache da decisão para o usuário atual — o hook refreshToken dispara a cada
// frame de animação de movimento, então não lemos settings ali.
let hideForMe = null;

// Mapa { userId: boolean }. Usuário sem entrada segue o padrão: GM vê, demais não.
export function canUserView(user, viewers) {
  const map = viewers ?? game.settings.get(MODULE_ID, ELEV_SETTING_VIEWERS) ?? {};
  return map[user.id] ?? user.isGM;
}

function computeHideForMe() {
  try {
    if (!game.settings.get(MODULE_ID, ELEV_SETTING_ENABLED)) return false;
    return !canUserView(game.user);
  } catch {
    return false;
  }
}

function onRefreshToken(token) {
  hideForMe ??= computeHideForMe();
  if (hideForMe && token.tooltip) token.tooltip.visible = false;
}

// Recalcula e força o redesenho do estado de todos os tokens da cena.
// refreshState faz o core restaurar `tooltip.visible`; o hook volta a ocultar
// em seguida se for o caso.
export function refreshElevationTooltips() {
  hideForMe = computeHideForMe();
  for (const token of canvas?.tokens?.placeables ?? []) {
    token.renderFlags.set({ refreshState: true });
  }
}

// ---------------------------------------------------------------------------
//  Registro dos hooks — chamado no 'init' do main.js (em todos os clientes)
// ---------------------------------------------------------------------------
export function registerElevationTooltipHooks() {
  Hooks.on('refreshToken', onRefreshToken);

  // Promoção/rebaixamento de papel muda o padrão de quem não tem entrada no mapa.
  Hooks.on('updateUser', (user, changes) => {
    if (user.isSelf && 'role' in changes) refreshElevationTooltips();
  });
}
