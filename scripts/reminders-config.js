// =============================================================================
//  Meu Módulo RPG — reminders-config.js
//  Janela ApplicationV2 para gerenciar a lista de lembretes do GM.
// =============================================================================

import { MODULE_ID } from './reminders.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ReminderListConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'mmr-reminders-config',
    tag: 'form',
    window: {
      title: 'Gerenciar Lembretes',
      icon: 'fas fa-sticky-note',
      resizable: true
    },
    position: { width: 520, height: 600 },
    form: {
      handler: ReminderListConfig.#onSubmit,
      closeOnSubmit: true
    },
    actions: {
      addMessage: ReminderListConfig.#onAdd,
      removeMessage: ReminderListConfig.#onRemove
    }
  };

  static PARTS = {
    form: { template: 'modules/meu-modulo-rpg/templates/reminders-config.hbs' }
  };

  #draftMessages = null;

  async _prepareContext() {
    if (this.#draftMessages === null) {
      const stored = game.settings.get(MODULE_ID, 'reminder-messages') ?? [];
      this.#draftMessages = foundry.utils.deepClone(stored);
    }
    return { messages: this.#draftMessages };
  }

  // Lê textareas atualmente no DOM e sincroniza com o estado em memória.
  // Necessário antes de add/remove/submit para preservar edições não salvas.
  #syncFromDOM() {
    if (!this.element) return;
    const textareas = this.element.querySelectorAll('textarea[data-id]');
    for (const ta of textareas) {
      const entry = this.#draftMessages.find((m) => m.id === ta.dataset.id);
      if (entry) entry.text = ta.value;
    }
  }

  static #onAdd(_event, _target) {
    this.#syncFromDOM();
    this.#draftMessages.push({
      id: foundry.utils.randomID(),
      text: ''
    });
    this.render();
  }

  static #onRemove(_event, target) {
    const id = target.dataset.id;
    this.#syncFromDOM();
    this.#draftMessages = this.#draftMessages.filter((m) => m.id !== id);
    this.render();
  }

  static async #onSubmit(_event, _form, _formData) {
    this.#syncFromDOM();
    const clean = this.#draftMessages
      .map((m) => ({ id: m.id, text: (m.text ?? '').trim() }))
      .filter((m) => m.text.length > 0);
    await game.settings.set(MODULE_ID, 'reminder-messages', clean);
  }
}
