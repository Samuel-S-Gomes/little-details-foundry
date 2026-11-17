// =============================================================================
//  Meu Módulo RPG — clima-ajustes.js
//  Ajusta as partículas que o Calendaria liga no FXMaster, por clima.
//
//  O Calendaria só passa ao FXMaster o nome do preset (e, quando o clima é
//  escolhido à mão, densidade/velocidade relativas). Aqui, quando o efeito
//  "apiPreset_*" aparece nas flags da cena, o GM principal troca os valores
//  pelos definidos no próprio preset do Calendaria, no campo `fxAjustes`:
//
//    fxAjustes: { snow: { scale: 0.8, speed: 2 }, rain: { density: 5, tint: { apply: true, value: "#dde6f5" } } }
//
//  Chave = tipo de partícula do FXMaster; valores na escala "de sempre" do
//  FXMaster (a mesma dos presets dele: escala 0.1–5, densidade 0.1–5...).
//  O FXMaster 8 grava esses números comprimidos para 0.1–1; a conversão usa a
//  função dele (CONFIG.fxmaster.normalizeEffectOptionsForStorageFromLegacy).
//  Vale para clima sorteado, escolhido à mão e depois de recarregar a página.
//  FoundryVTT v13 · Calendaria 1.0.17 · FXMaster 8.4
// =============================================================================

import { MODULE_ID } from './reminders.js';

export const CLIMA_AJUSTES_SETTING = 'clima-ajustes-calendaria';
const PREFIXO = 'apiPreset_';
const FLAG = 'climaAjuste';

function souGmPrincipal() {
  return !!game.users.activeGM?.isSelf;
}

function ativo() {
  try { return game.settings.get(MODULE_ID, CLIMA_AJUSTES_SETTING); } catch { return false; }
}

// Clima atual da zona desta cena e o preset dele (com fxAjustes), ou null.
function ajustesDaCena(scene) {
  const cal = globalThis.CALENDARIA;
  const wm = cal?.managers?.WeatherManager;
  if (!wm) return null;
  const clima = wm.getCurrentWeather?.(null, scene);
  if (!clima?.id) return null;
  const preset = wm.getPreset?.(clima.id);
  const ajustes = preset?.fxAjustes;
  if (!ajustes || typeof ajustes !== 'object' || !Object.keys(ajustes).length) return null;
  return { climaId: clima.id, ajustes };
}

// Valores-alvo na forma gravada pelo FXMaster 8 (comprimida).
function paraArmazenamento(tipo, valores) {
  const def = CONFIG.fxmaster?.particleEffects?.[tipo];
  const conv = CONFIG.fxmaster?.normalizeEffectOptionsForStorageFromLegacy;
  if (!def || typeof conv !== 'function') return null;
  const out = conv(def, { ...valores }) ?? {};
  delete out.__fxmNormalizedRangesExpanded;
  return out;
}

function igual(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6;
  return JSON.stringify(a) === JSON.stringify(b);
}

// Calcula o update da cena (ou null se nada a fazer).
export function calcularAjuste(scene) {
  const alvo = ajustesDaCena(scene);
  const efeitos = scene.getFlag?.('fxmaster', 'effects') ?? {};
  const update = {};
  const registro = {};
  for (const [chave, info] of Object.entries(efeitos)) {
    if (!chave.startsWith(PREFIXO) || !info?.type || !info.options) continue;
    const valores = alvo?.ajustes?.[info.type];
    if (!valores) continue;
    const gravar = paraArmazenamento(info.type, valores);
    if (!gravar) continue;
    let muda = false;
    for (const [k, v] of Object.entries(gravar)) {
      if (!igual(info.options[k], v)) {
        update[`flags.fxmaster.effects.${chave}.options.${k}`] = v;
        muda = true;
      }
    }
    if (muda) registro[chave] = alvo.climaId;
  }
  if (!Object.keys(update).length) return null;
  update[`flags.${MODULE_ID}.${FLAG}`] = registro;
  return update;
}

let emAndamento = false;
let pendente = null;

async function aplicar(scene) {
  if (!scene || !ativo() || !souGmPrincipal()) return;
  if (emAndamento) { pendente = scene; return; }
  emAndamento = true;
  try {
    const update = calcularAjuste(scene);
    if (update) await scene.update(update);
  } catch (err) {
    console.warn(`${MODULE_ID} | clima-ajustes:`, err);
  } finally {
    emAndamento = false;
    if (pendente) { const s = pendente; pendente = null; aplicar(s); }
  }
}

// Junta rajadas de updates (o Calendaria troca o preset em mais de um passo).
const timers = new Map();
function agendar(scene) {
  if (!scene) return;
  clearTimeout(timers.get(scene.id));
  timers.set(scene.id, setTimeout(() => { timers.delete(scene.id); aplicar(scene); }, 250));
}

// ---------------------------------------------------------------------------
//  Registro dos hooks — chamado no 'init' do main.js
// ---------------------------------------------------------------------------
export function registerClimaAjustesHooks() {
  Hooks.on('updateScene', (scene, changes) => {
    if (foundry.utils.hasProperty(changes, 'flags.fxmaster')) agendar(scene);
  });
  Hooks.on('canvasReady', (canvas) => agendar(canvas?.scene));
  // Troca de clima sem troca de preset (ex.: Neve leve → Neve, ambos "snow").
  Hooks.on('calendaria.weatherChange', () => {
    for (const s of game.scenes.filter((s) => s.getFlag('fxmaster', 'effects'))) agendar(s);
  });
}
