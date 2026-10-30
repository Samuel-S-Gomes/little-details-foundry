// =============================================================================
//  Meu Módulo RPG — modulos-so-mestre.js
//  Esconde dos jogadores (quem não é Mestre/Assistente) o "Gerenciar Módulos" e os
//  "Detalhes de Suporte" (que também listam os módulos ativos), além da contagem de
//  módulos na aba Configurações — e impede essas janelas de abrir por outro caminho.
//  É só na interface: os dados dos módulos continuam no cliente (console, F12).
//  FoundryVTT v13
// =============================================================================

import { MODULE_ID } from './reminders.js';

export const MODULOS_SETTING = 'modulos-so-mestre';

const ativo = () => !game.user?.isGM && game.settings.get(MODULE_ID, MODULOS_SETTING);

export function registerModulosSoMestreHooks() {
  Hooks.on('renderSettings', (_app, html) => {
    if (!ativo()) return;
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    raiz?.querySelectorAll('[data-app="modules"], [data-app="support"], .modules').forEach(el => el.remove());
  });

  // Barreira na própria janela: _canRender que lança erro vira aviso e a janela não abre.
  const { ModuleManagement, SupportDetails } = foundry.applications.sidebar.apps;
  for (const cls of [ModuleManagement, SupportDetails]) {
    const original = cls.prototype._canRender;
    cls.prototype._canRender = function (options) {
      if (ativo()) throw new Error('Só o Mestre pode ver os módulos deste mundo.');
      return original.call(this, options);
    };
  }
}
