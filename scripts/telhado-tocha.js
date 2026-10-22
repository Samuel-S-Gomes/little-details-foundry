// =============================================================================
//  Meu Módulo RPG — telhado-tocha.js
//  Telhado visto de fora, só até onde a luz/visão do token alcança.
//
//  As paredes do prédio cortam a linha de visão do token que está do lado de
//  fora, e o telhado (que fica do outro lado delas) some na névoa. O "Reveals
//  Fog of War" do Better Roofs resolve revelando o telhado INTEIRO, mesmo no
//  escuro. Aqui o telhado aparece recortado por um círculo em volta do token:
//    - de dia (luz global da cena ativa) → telhado inteiro;
//    - no escuro → raio da luz que o token carrega ou da visão no escuro.
//  Só vale quando o token enxerga algum pedaço do prédio, está abaixo do
//  telhado e o telhado não está esmaecido (token embaixo dele).
//
//  Mecânica (por cliente, nada é gravado no mundo):
//    1. máscara de visão — um sprite branco do telhado, recortado pelo círculo,
//       dentro de canvas.masks.vision (o que estiver lá conta como "visível");
//    2. iluminação — o telhado restringe luz e a tocha do token é cortada pelas
//       paredes, então ele ficaria escuro. Uma luz virtual local, sem paredes,
//       só de iluminação (sem cor), acende o telhado no raio da tocha.
//  FoundryVTT v13
// =============================================================================

import { MODULE_ID } from './reminders.js';

export const TELHADO_SETTING = 'telhado-tocha-ativo';
export const TELHADO_FLAG = 'telhadoTocha';

const { SpriteMesh } = foundry.canvas.containers;
const { BaseSamplerShader } = foundry.canvas.rendering.shaders;
const { PointLightSource } = foundry.canvas.sources;

// Branco × alfa da textura: a máscara de visão só precisa do formato do telhado.
class TelhadoMascaraShader extends BaseSamplerShader {
  static classPluginName = null;
  static fragmentShader = `
    precision ${PIXI.settings.PRECISION_FRAGMENT} float;
    uniform sampler2D sampler;
    uniform vec4 tintAlpha;
    varying vec2 vUvs;
    void main() {
      gl_FragColor = vec4(1.0) * (texture2D(sampler, vUvs).a * tintAlpha);
    }`;
}

let camada = null;                 // PIXI.Container dentro de canvas.masks.vision
const mascaras = new Map();        // tileId → { sprite, recorte (Graphics), src }
const luzes = new Map();           // tokenId → { fonte (PointLightSource), chave }

function ativo() {
  try { return game.settings.get(MODULE_ID, TELHADO_SETTING); } catch { return false; }
}

function ehTelhado(tile) {
  return tile.document.getFlag(MODULE_ID, TELHADO_FLAG) === true;
}

function diaClaro() {
  const g = canvas.environment?.globalLightSource;
  if ( !g?.active ) return false;
  const nivel = canvas.environment.darknessLevel;
  const { min, max } = g.data.darkness;
  return (nivel >= min) && (nivel <= max);
}

// O token enxerga algum pedaço do telhado? (vértices e meios das arestas do
// polígono de visão, empurrados 5 px para fora — a parede fica sob o telhado)
function enxergaPredio(fonteVisao, tile) {
  const pts = fonteVisao.los?.points;
  if ( !pts?.length || !tile.mesh ) return false;
  const { x: cx, y: cy } = fonteVisao;
  const testa = (x, y) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    const p = { x: x + ((x - cx) / d) * 5, y: y + ((y - cy) / d) * 5 };
    return tile.mesh.containsCanvasPoint(p);
  };
  const n = pts.length;
  for ( let i = 0; i < n; i += 2 ) {
    const j = (i + 2) % n;
    if ( testa(pts[i], pts[i + 1]) ) return true;
    if ( testa((pts[i] + pts[j]) / 2, (pts[i + 1] + pts[j + 1]) / 2) ) return true;
  }
  return false;
}

function garantirCamada() {
  const visao = canvas.masks?.vision;
  if ( !visao ) return null;
  if ( !camada || camada.destroyed ) {
    camada = new PIXI.Container();
    camada.name = `${MODULE_ID}-telhado-tocha`;
  }
  if ( camada.parent !== visao ) visao.addChild(camada);
  return camada;
}

function mascaraDoTile(tile) {
  let m = mascaras.get(tile.id);
  const textura = tile.mesh?.texture;
  if ( m && (m.src !== tile.document.texture.src || m.sprite.destroyed) ) {
    camada.removeChild(m.sprite, m.recorte);
    m.sprite.destroy(); m.recorte.destroy();
    mascaras.delete(tile.id);
    m = null;
  }
  if ( !m ) {
    if ( !textura?.baseTexture ) return null;
    const sprite = new SpriteMesh(textura, TelhadoMascaraShader);
    sprite.visible = false;                       // nunca revelar o telhado inteiro sem querer
    const recorte = new PIXI.Graphics();
    recorte.renderable = false;                   // o círculo só serve de máscara
    camada.addChild(sprite, recorte);
    m = { sprite, recorte, src: tile.document.texture.src };
    mascaras.set(tile.id, m);
  }
  // mesma posição/escala/rotação da malha do tile
  const { sprite } = m;
  sprite.anchor.copyFrom(tile.mesh.anchor);
  sprite.position.copyFrom(tile.mesh.position);
  sprite.scale.copyFrom(tile.mesh.scale);
  sprite.rotation = tile.mesh.rotation;
  return m;
}

function esconderTudo() {
  for ( const m of mascaras.values() ) m.sprite.visible = false;
  return removerLuzes(new Set());
}

// ---------------------------------------------------------------------------
//  Luz virtual (só deste cliente): ilumina o telhado no raio da tocha
// ---------------------------------------------------------------------------
function luzVirtual(token, fonteVisao, raio) {
  const real = token.light;
  const temTocha = real?.active && (real.radius > 0);
  const d = temTocha ? real.data : {};
  const dados = {
    x: fonteVisao.x, y: fonteVisao.y, elevation: token.document.elevation,
    radius: raio, dim: raio, bright: temTocha ? Math.min(d.bright ?? 0, raio) : 0,
    walls: false, vision: false,
    color: null, alpha: 0,                       // sem cor: não soma com a tocha real
    attenuation: d.attenuation ?? 0.5, luminosity: d.luminosity ?? 0.5,
    contrast: d.contrast ?? 0, saturation: d.saturation ?? 0, shadows: d.shadows ?? 0,
    coloration: 1, angle: 360, rotation: 0,
    animation: temTocha ? foundry.utils.deepClone(d.animation ?? {}) : {},
    seed: d.seed ?? 0, priority: 0, disabled: false
  };
  const chave = [dados.x, dados.y, dados.elevation, dados.radius, dados.bright, dados.animation?.type].join('|');
  let reg = luzes.get(token.id);
  if ( reg?.chave === chave ) return false;
  if ( !reg ) {
    const fonte = new PointLightSource({ sourceId: `${MODULE_ID}.telhado.${token.id}` });
    fonte.initialize(dados, { reset: true });
    fonte.add();
    luzes.set(token.id, { fonte, chave });
  } else {
    reg.fonte.initialize(dados, { reset: true });
    reg.chave = chave;
  }
  return true;
}

function removerLuzes(manter) {
  let mudou = false;
  for ( const [id, reg] of luzes ) {
    if ( manter.has(id) ) continue;
    reg.fonte.destroy();
    luzes.delete(id);
    mudou = true;
  }
  return mudou;
}

// ---------------------------------------------------------------------------
//  Atualização — roda a cada refresh de visão (hook sightRefresh)
// ---------------------------------------------------------------------------
export function atualizarTelhados() {
  if ( !canvas?.ready ) return;
  if ( !garantirCamada() ) return;

  const telhados = ativo() ? canvas.tiles.placeables.filter(ehTelhado) : [];
  if ( !telhados.length ) {
    if ( esconderTudo() ) canvas.perception.update({ refreshLighting: true });
    return;
  }

  // tile apagado ou sem a opção: some com a máscara dele
  const ids = new Set(telhados.map(t => t.id));
  for ( const [id, m] of mascaras ) {
    if ( ids.has(id) ) continue;
    m.sprite.destroy(); m.recorte.destroy();
    mascaras.delete(id);
  }

  const dia = diaClaro();
  const fontesVisao = [...canvas.effects.visionSources].filter(s =>
    s.active && !s.isPreview && !s.isBlinded && (s.object instanceof foundry.canvas.placeables.Token));
  const luzesUsadas = new Set();
  let luzMudou = false;

  for ( const tile of telhados ) {
    const m = mascaraDoTile(tile);
    if ( !m ) continue;
    m.recorte.clear();
    let inteiro = false, algum = false;

    if ( tile.visible && !tile.occluded && !tile.document.hidden ) {
      for ( const fv of fontesVisao ) {
        const token = fv.object;
        const olho = token.losHeight ?? token.document.elevation;
        if ( olho >= tile.document.elevation ) continue;           // em cima do telhado: nada a fazer
        if ( !enxergaPredio(fv, tile) ) continue;
        if ( dia ) { inteiro = true; algum = true; break; }
        const tocha = (token.light?.active && token.light.radius > 0) ? token.light.radius : 0;
        const raio = Math.max(tocha, fv.radius ?? 0);
        if ( raio <= 0 ) continue;
        m.recorte.beginFill(0xFFFFFF).drawCircle(fv.x, fv.y, raio).endFill();
        algum = true;
        luzMudou = luzVirtual(token, fv, raio) || luzMudou;
        luzesUsadas.add(token.id);
      }
    }
    m.sprite.visible = algum;
    m.sprite.mask = (algum && !inteiro) ? m.recorte : null;
    m.recorte.renderable = false;                 // o PIXI religa ao tirar a máscara
  }

  luzMudou = removerLuzes(luzesUsadas) || luzMudou;
  // Luz nova/movida: o lighting precisa redesenhar. Só quando muda (evita laço com o próprio sightRefresh).
  if ( luzMudou ) canvas.perception.update({ refreshLighting: true });
}

function limpar() {
  for ( const reg of luzes.values() ) reg.fonte.destroy();
  luzes.clear();
  for ( const m of mascaras.values() ) { m.sprite.destroy(); m.recorte.destroy(); }
  mascaras.clear();
  camada?.destroy({ children: true });
  camada = null;
}

// ---------------------------------------------------------------------------
//  Checkbox na aba "Sobreposição" da configuração do tile (só GM)
// ---------------------------------------------------------------------------
function injetarConfig(app, html) {
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  const aba = raiz?.querySelector('.tab[data-tab="overhead"]');
  if ( !aba || aba.querySelector(`[name="flags.${MODULE_ID}.${TELHADO_FLAG}"]`) ) return;
  const marcado = app.document.getFlag(MODULE_ID, TELHADO_FLAG) === true;
  const grupo = document.createElement('div');
  grupo.className = 'form-group';
  grupo.innerHTML = `
    <label>Telhado à luz da tocha</label>
    <div class="form-fields">
      <input type="checkbox" name="flags.${MODULE_ID}.${TELHADO_FLAG}" ${marcado ? 'checked' : ''}>
    </div>
    <p class="hint">Visto de fora, o telhado aparece só até onde a luz ou a visão do token alcança
      (inteiro de dia). Deixe desligado o "Reveals Fog of War" do Better Roofs neste tile.</p>`;
  aba.appendChild(grupo);
}

// ---------------------------------------------------------------------------
//  Registro dos hooks — chamado no 'init' do main.js (em todos os clientes)
// ---------------------------------------------------------------------------
export function registerTelhadoTochaHooks() {
  Hooks.on('sightRefresh', atualizarTelhados);
  Hooks.on('canvasTearDown', limpar);
  Hooks.on('renderTileConfig', injetarConfig);
  // textura nova ou flag ligada/desligada → recalcular
  Hooks.on('updateTile', (doc, changes) => {
    if ( doc.parent !== canvas.scene ) return;
    if ( foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`) || ('texture' in changes) || ('hidden' in changes) ) {
      canvas.perception.update({ refreshVision: true });
    }
  });
}
