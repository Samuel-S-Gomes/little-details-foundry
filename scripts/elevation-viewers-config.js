// =============================================================================
//  Meu Módulo RPG — elevation-viewers-config.js
//  Janela ApplicationV2 para marcar quais usuários podem ver a elevação
//  dos tokens.
// =============================================================================

import { MODULE_ID } from './reminders.js';
import { ELEV_SETTING_VIEWERS, canUserView } from './elevation-tooltip.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const ROLE_LABELS = {
  [CONST.USER_ROLES.PLAYER]: 'Jogador',
  [CONST.USER_ROLES.TRUSTED]: 'Jogador Confiável',
  [CONST.USER_ROLES.ASSISTANT]: 'Assistente',
  [CONST.USER_ROLES.GAMEMASTER]: 'Mestre'
};

export class ElevationViewersConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'mmr-elevation-viewers',
    tag: 'form',
    window: {
      title: 'Quem vê a elevação',
      icon: 'fas fa-layer-group',
      resizable: true
    },
    position: { width: 420, height: 'auto' },
    form: {
      handler: ElevationViewersConfig.#onSubmit,
      closeOnSubmit: true
    }
  };

  static PARTS = {
    form: { template: 'modules/meu-modulo-rpg/templates/elevation-viewers-config.hbs' }
  };

  async _prepareContext() {
    const viewers = game.settings.get(MODULE_ID, ELEV_SETTING_VIEWERS) ?? {};
    const users = game.users.contents
      .sort((a, b) => (b.role - a.role) || a.name.localeCompare(b.name))
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: ROLE_LABELS[u.role] ?? '',
        active: u.active,
        canView: canUserView(u, viewers)
      }));
    return { users };
  }

  static async #onSubmit(_event, _form, formData) {
    const data = formData.object;
    const viewers = {};
    for (const u of game.users) viewers[u.id] = data[u.id] === true;
    await game.settings.set(MODULE_ID, ELEV_SETTING_VIEWERS, viewers);
  }
}
