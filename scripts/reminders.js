// =============================================================================
//  Meu Módulo RPG — reminders.js
//  Carrossel de post-its de lembrete visíveis apenas para o GM.
// =============================================================================

export const MODULE_ID = 'meu-modulo-rpg';

const POSTIT_WIDTH = 220;
const POSTIT_MIN_HEIGHT = 110;
const VIEWPORT_MARGIN = 8;

export class ReminderManager {
  static instance = null;

  #currentIndex = 0;
  #intervalTimerId = null;
  #durationTimerId = null;
  #currentElement = null;
  #messages = [];
  #dragState = null;

  // Handlers ligados ao this — armazenados para poder remover depois.
  #boundOnPointerMove = this.#onPointerMove.bind(this);
  #boundOnPointerUp = this.#onPointerUp.bind(this);

  static init() {
    if (ReminderManager.instance) return ReminderManager.instance;
    const mgr = new ReminderManager();
    ReminderManager.instance = mgr;
    if (mgr.isActive()) mgr.start();
    return mgr;
  }

  isActive() {
    if (!game.user?.isGM) return false;
    if (!game.settings.get(MODULE_ID, 'reminder-enabled')) return false;
    const messages = game.settings.get(MODULE_ID, 'reminder-messages') ?? [];
    return messages.length > 0;
  }

  start() {
    this.stop();
    this.#messages = game.settings.get(MODULE_ID, 'reminder-messages') ?? [];
    if (this.#messages.length === 0) return;
    if (this.#currentIndex >= this.#messages.length) this.#currentIndex = 0;
    this.#scheduleNext();
  }

  stop() {
    if (this.#intervalTimerId) {
      clearTimeout(this.#intervalTimerId);
      this.#intervalTimerId = null;
    }
    if (this.#durationTimerId) {
      clearTimeout(this.#durationTimerId);
      this.#durationTimerId = null;
    }
    this.#destroyPostIt();
  }

  refresh() {
    this.stop();
    if (this.isActive()) this.start();
  }

  handleSettingChange(key) {
    if (key === 'reminder-position') {
      // Atualiza ao vivo se houver post-it visível, sem reiniciar o ciclo.
      if (this.#currentElement) this.#applySavedPosition(this.#currentElement);
      return;
    }
    if (key === 'reminder-messages') {
      const updated = game.settings.get(MODULE_ID, 'reminder-messages') ?? [];
      this.#messages = updated;
      // Reset do índice para evitar out-of-bounds quando a lista encolhe.
      if (this.#currentIndex >= updated.length) this.#currentIndex = 0;
    }
    this.refresh();
  }

  // ---------------------------------------------------------------------------
  //  Ciclo
  // ---------------------------------------------------------------------------

  #scheduleNext() {
    const intervalSeconds = Math.max(
      1,
      Number(game.settings.get(MODULE_ID, 'reminder-interval-seconds')) || 1
    );
    this.#intervalTimerId = setTimeout(() => {
      this.#intervalTimerId = null;
      this.#showNext();
    }, intervalSeconds * 1000);
  }

  #showNext() {
    if (!this.isActive()) return;
    // Re-lê messages — pode ter mudado entre o agendamento e o disparo.
    this.#messages = game.settings.get(MODULE_ID, 'reminder-messages') ?? [];
    if (this.#messages.length === 0) return;
    if (this.#currentIndex >= this.#messages.length) this.#currentIndex = 0;

    const message = this.#messages[this.#currentIndex];
    this.#renderPostIt(message);
    this.#currentIndex = (this.#currentIndex + 1) % this.#messages.length;

    const durationSeconds = Math.max(
      1,
      Number(game.settings.get(MODULE_ID, 'reminder-duration-seconds')) || 1
    );
    this.#durationTimerId = setTimeout(() => {
      this.#durationTimerId = null;
      this.dismissCurrent();
    }, durationSeconds * 1000);
  }

  dismissCurrent({ manual = false } = {}) {
    if (this.#durationTimerId) {
      clearTimeout(this.#durationTimerId);
      this.#durationTimerId = null;
    }
    if (!this.#currentElement) {
      // Sem post-it visível — apenas reagenda se manual chamou fora do ciclo.
      if (manual && this.isActive()) this.#scheduleNext();
      return;
    }
    this.#startDismissAnimation();
    if (this.isActive()) this.#scheduleNext();
  }

  // ---------------------------------------------------------------------------
  //  Render
  // ---------------------------------------------------------------------------

  #renderPostIt(message) {
    this.#destroyPostIt();

    const el = document.createElement('div');
    el.className = 'mmr-postit';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'mmr-postit-close';
    closeBtn.setAttribute('aria-label', 'Dispensar');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.dismissCurrent({ manual: true });
    });

    const body = document.createElement('div');
    body.className = 'mmr-postit-body';
    body.textContent = message.text ?? '';

    el.append(closeBtn, body);
    document.body.append(el);

    this.#currentElement = el;
    this.#applySavedPosition(el);
    this.#attachDragHandlers(el);
  }

  #destroyPostIt() {
    if (!this.#currentElement) return;
    this.#detachDragHandlers(this.#currentElement);
    this.#currentElement.remove();
    this.#currentElement = null;
  }

  #startDismissAnimation() {
    const el = this.#currentElement;
    if (!el) return;
    const finish = () => {
      el.removeEventListener('animationend', finish);
      if (this.#currentElement === el) {
        this.#detachDragHandlers(el);
        el.remove();
        this.#currentElement = null;
      }
    };
    el.addEventListener('animationend', finish);
    el.classList.add('mmr-postit-leaving');
  }

  #applySavedPosition(el) {
    const saved = game.settings.get(MODULE_ID, 'reminder-position') ?? { x: 20, y: 80 };
    const clamped = this.#clampToViewport(saved);
    el.style.left = `${clamped.x}px`;
    el.style.top = `${clamped.y}px`;
  }

  #clampToViewport({ x, y }) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxX = Math.max(VIEWPORT_MARGIN, vw - POSTIT_WIDTH - VIEWPORT_MARGIN);
    const maxY = Math.max(VIEWPORT_MARGIN, vh - POSTIT_MIN_HEIGHT - VIEWPORT_MARGIN);
    return {
      x: Math.min(Math.max(VIEWPORT_MARGIN, Number(x) || 0), maxX),
      y: Math.min(Math.max(VIEWPORT_MARGIN, Number(y) || 0), maxY)
    };
  }

  // ---------------------------------------------------------------------------
  //  Drag (pointer events nativos)
  // ---------------------------------------------------------------------------

  #attachDragHandlers(el) {
    el.addEventListener('pointerdown', (ev) => this.#onPointerDown(ev));
  }

  #detachDragHandlers(el) {
    el.removeEventListener('pointermove', this.#boundOnPointerMove);
    el.removeEventListener('pointerup', this.#boundOnPointerUp);
  }

  #onPointerDown(ev) {
    if (ev.button !== 0) return;
    if (ev.target.closest('.mmr-postit-close')) return;
    const el = this.#currentElement;
    if (!el) return;
    this.#dragState = {
      pointerStartX: ev.clientX,
      pointerStartY: ev.clientY,
      originX: el.offsetLeft,
      originY: el.offsetTop
    };
    el.setPointerCapture(ev.pointerId);
    el.addEventListener('pointermove', this.#boundOnPointerMove);
    el.addEventListener('pointerup', this.#boundOnPointerUp, { once: true });
    el.addEventListener('pointercancel', this.#boundOnPointerUp, { once: true });
  }

  #onPointerMove(ev) {
    if (!this.#dragState || !this.#currentElement) return;
    const dx = ev.clientX - this.#dragState.pointerStartX;
    const dy = ev.clientY - this.#dragState.pointerStartY;
    const next = this.#clampToViewport({
      x: this.#dragState.originX + dx,
      y: this.#dragState.originY + dy
    });
    this.#currentElement.style.left = `${next.x}px`;
    this.#currentElement.style.top = `${next.y}px`;
  }

  #onPointerUp() {
    const el = this.#currentElement;
    if (el) {
      el.removeEventListener('pointermove', this.#boundOnPointerMove);
      const x = el.offsetLeft;
      const y = el.offsetTop;
      game.settings.set(MODULE_ID, 'reminder-position', { x, y });
    }
    this.#dragState = null;
  }
}
