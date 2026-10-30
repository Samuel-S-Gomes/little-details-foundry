// =============================================================================
//  Meu Módulo RPG — fixar-janelas.js
//  Fixar (pin) janelas: uma janela fixada não fecha com ESC nem com o botão ✕.
//  Fixar = gesto na barra de título (padrão: duplo clique direito); soltar = clique no alfinete.
//  Por cliente; nada é gravado no mundo.
//
//  Como bloqueia sem quebrar a janela: o ESC do core chama app.close({closeKey: true}) em toda
//  janela aberta. Na janela fixada, trocamos o close *da instância* por um que recusa esse ESC
//  antes de qualquer lógica da subclasse rodar (o close do Levels, por ex., desliga o rangeEnabled
//  antes do fechamento base). O botão ✕ é barrado por listener de captura no documento.
//  Fechamentos feitos por código (troca de cena, ator apagado) continuam passando.
//  FoundryVTT v13 — ApplicationV2 e Application (v1)
// =============================================================================

import { MODULE_ID } from './reminders.js';

export const FIXAR_SETTING_GESTO = 'fixar-janela-gesto';

const fixadas = new Set();
const INTERVALO_DUPLO = 450; // ms entre os dois cliques do gesto duplo

const elementoDe = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const cabecalhoDe = app => elementoDe(app)?.querySelector('.window-header') ?? null;

function appDoCabecalho(header) {
  const v2 = header.closest('.application');
  if (v2?.id) {
    const app = foundry.applications.instances.get(v2.id);
    if (app) return app;
  }
  const v1 = header.closest('.window-app');
  return v1 ? ui.windows[v1.dataset.appid] ?? null : null;
}

// ---------- marcação visual ----------
function desenhaAlfinete(app) {
  const el = elementoDe(app);
  const header = cabecalhoDe(app);
  if (!el || !header) return;
  el.classList.add('mmr-fixada');
  if (header.querySelector('.mmr-pin')) return;
  const pin = document.createElement('a');
  pin.className = 'mmr-pin';
  pin.dataset.tooltip = 'Fixada — clique para soltar';
  pin.setAttribute('aria-label', 'Soltar janela');
  pin.innerHTML = '<i class="fa-solid fa-thumbtack"></i>';
  const titulo = header.querySelector('.window-title');
  if (titulo) titulo.after(pin);
  else header.prepend(pin);
}

function apagaAlfinete(app) {
  const el = elementoDe(app);
  el?.classList.remove('mmr-fixada');
  el?.querySelector('.window-header .mmr-pin')?.remove();
}

function pulsa(app) {
  const pin = cabecalhoDe(app)?.querySelector('.mmr-pin');
  if (!pin) return;
  pin.classList.remove('mmr-pin-pulso');
  void pin.offsetWidth; // reinicia a animação
  pin.classList.add('mmr-pin-pulso');
}

// ---------- fixar / soltar ----------
export function fixar(app) {
  if (!app || fixadas.has(app)) return;
  fixadas.add(app);
  const proprio = Object.hasOwn(app, 'close') ? app.close : null;
  app._mmrCloseProprio = proprio;
  app.close = function (options, ...resto) {
    if (options?.closeKey) { pulsa(this); return Promise.resolve(this); }
    const fechar = proprio ?? Object.getPrototypeOf(this).close;
    return fechar.call(this, options, ...resto);
  };
  desenhaAlfinete(app);
}

export function soltar(app) {
  if (!app || !fixadas.has(app)) return;
  fixadas.delete(app);
  if (app._mmrCloseProprio) app.close = app._mmrCloseProprio;
  else delete app.close;
  delete app._mmrCloseProprio;
  apagaAlfinete(app);
}

export const estaFixada = app => fixadas.has(app);

// ---------- gesto ----------
function gestoBate(e, ultimo) {
  const gesto = game.settings.get(MODULE_ID, FIXAR_SETTING_GESTO);
  if (gesto === 'shift-direito') return e.button === 2 && e.shiftKey;
  const botao = gesto === 'duplo-meio' ? 1 : gesto === 'duplo-direito' ? 2 : null;
  if (botao === null || e.button !== botao) return false;
  return !!ultimo && ultimo.botao === botao && e.timeStamp - ultimo.t < INTERVALO_DUPLO;
}

export function registerFixarJanelasHooks() {
  let ultimo = null; // último clique candidato a gesto duplo: {header, botao, t}

  document.addEventListener('pointerdown', e => {
    // Clique no alfinete: não deixa o cabeçalho começar a arrastar a janela.
    if (e.target.closest?.('.window-header .mmr-pin')) { e.stopPropagation(); return; }
    if (e.button === 0) return;
    const header = e.target.closest?.('.window-header');
    if (!header || e.target.closest('button, a.header-button, .header-control')) return;
    if (e.button === 1) e.preventDefault(); // sem rolagem automática do botão do meio

    const mesmo = ultimo?.header === header ? ultimo : null;
    if (gestoBate(e, mesmo)) {
      ultimo = null;
      const app = appDoCabecalho(header);
      if (app) fixar(app);
      return;
    }
    ultimo = { header, botao: e.button, t: e.timeStamp };
  }, { capture: true });

  // Sem menu do navegador ao clicar com o direito na barra de título.
  document.addEventListener('contextmenu', e => {
    if (e.target.closest?.('.window-header')) e.preventDefault();
  }, { capture: true });

  document.addEventListener('click', e => {
    const pin = e.target.closest?.('.window-header .mmr-pin');
    if (pin) {
      e.preventDefault();
      e.stopImmediatePropagation();
      soltar(appDoCabecalho(pin.closest('.window-header')));
      return;
    }
    // Botão ✕ (v2: data-action=close; v1: .header-button.close) numa janela fixada.
    const fechar = e.target.closest?.('.window-header [data-action="close"], .window-header .header-button.close');
    if (!fechar) return;
    const app = appDoCabecalho(fechar.closest('.window-header'));
    if (app && fixadas.has(app)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      pulsa(app);
    }
  }, { capture: true });

  // Re-render pode recriar o cabeçalho (v1); fechamento por código solta o pin.
  for (const hook of ['renderApplication', 'renderApplicationV2']) {
    Hooks.on(hook, app => { if (fixadas.has(app)) desenhaAlfinete(app); });
  }
  for (const hook of ['closeApplication', 'closeApplicationV2']) {
    Hooks.on(hook, app => { if (fixadas.has(app)) soltar(app); });
  }
}

// Atalho de teclado opcional (sem tecla padrão): fixa/solta a janela ativa.
export function registerFixarJanelasKeybinding() {
  game.keybindings.register(MODULE_ID, 'fixar-janela-ativa', {
    name: 'Fixar/soltar a janela ativa',
    hint: 'Alterna o alfinete da janela em foco (a fixada não fecha com ESC nem pelo ✕).',
    editable: [],
    onDown: () => {
      const app = ui.activeWindow;
      if (!app) return false;
      if (fixadas.has(app)) soltar(app);
      else fixar(app);
      return true;
    }
  });
}
