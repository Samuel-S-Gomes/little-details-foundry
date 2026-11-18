// =============================================================================
//  Exportar ficha (dnd5e) → PDF preenchível
//  Item "Exportar ficha (PDF)" no menu ⋮ do cabeçalho da ficha de personagem.
//  Lê os dados JÁ PREPARADOS do ator (modificadores, CA, perícias, ataques)
//  e preenche a ficha oficial em PT-BR (assets/ficha-dnd5e.pdf).
// =============================================================================

import { MODULE_ID } from './reminders.js';
import { preencherFicha } from './ficha-pdf.js';

const BASE = `modules/${MODULE_ID}`;
const ATRIBUTOS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const PERICIAS = {
  acr: 'Acrobatics', arc: 'Arcanismo', ath: 'Atletismo', prf: 'Atuação', dec: 'Blefar',
  ste: 'Furtividade', his: 'História', itm: 'Intimidação', ins: 'Intuição', inv: 'Investigação',
  ani: 'Lidar-com-Animais', med: 'Medicina', nat: 'Natureza', prc: 'Percepção', per: 'Persuasão',
  slt: 'Prestidigitação', rel: 'Religião', sur: 'Sobrevivência'
};
const CAIXA_PERICIA = { acr: 'RB-Acrobacia' };

// Linhas de magia da página 3: [campos de texto, caixas de "preparada"]
function linhasMagia() {
  const nome = (i) => (i < 0 ? 'Magia' : `Magia${i}`);
  const faixa = (de, ate) => Array.from({ length: ate - de + 1 }, (_, k) => de + k);
  const blocos = [[-1, 11], [12, 24], [25, 37], [38, 50], [51, 59], [60, 68], [69, 77], [78, 84], [85, 91]];
  const caixas = [[0, ...faixa(7, 18)], faixa(19, 31), faixa(32, 44), faixa(45, 57), faixa(58, 66),
    faixa(67, 75), faixa(76, 84), faixa(85, 91), faixa(92, 98)];
  return blocos.map(([de, ate], n) => ({
    campos: faixa(de, ate).map(nome),
    caixas: caixas[n].map((c) => `Check Box ${c}`)
  }));
}
const TRUQUES = ['Turques', ...Array.from({ length: 7 }, (_, i) => `Turques${i}`)];

const sinal = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n ?? '');
  return v >= 0 ? `+${v}` : `${v}`;
};

/** HTML do Foundry → texto simples (resolve @UUID[..]{Nome}, [[/r 1d6]] etc.). */
export function htmlParaTexto(html) {
  if (!html) return '';
  const nomeUuid = (ref) => {
    try { const n = globalThis.fromUuidSync?.(ref)?.name; if (n) return n; } catch { /* sem acesso */ }
    return ref.split('.').pop();
  };
  let s = String(html)
    .replace(/\s*\n\s*/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[@&]\w+\[[^\]]*\]\{([^}]*)\}/g, '$1')
    .replace(/&Reference\[([^\]]*)\]/g, (_, r) => r.split('=').pop().split(' ')[0])
    .replace(/@UUID\[([^\]]*)\]/g, (_, ref) => nomeUuid(ref))
    // tags do Plutonium/5etools: @item[shield|phb], @class[fighter|phb|Battle Master|...]
    .replace(/@\w+\[([^\]]*)\]/g, (_, ref) => {
      if (!ref.includes('|')) return ref.split('.').pop();
      const p = ref.split('|');
      return (p.length >= 3 && p[2] ? p[2] : p[0]).trim();
    })
    .replace(/\{@\w+ ([^}]*)\}/g, (_, ref) => { const p = ref.split('|'); return (p.length >= 3 && p[2] ? p[2] : p[0]).trim(); })
    .replace(/\[\[\/(save|check|skill)\s+([^\]]*)\]\]/g, (_, tipo, args) => {
      const dc = args.match(/dc=(\d+)/)?.[1];
      const alvo = args.match(/(?:ability|skill)=(\w+)/)?.[1] ?? args.split(' ')[0];
      const rot = CONFIG.DND5E?.abilities?.[alvo]?.label ?? CONFIG.DND5E?.skills?.[alvo]?.label ?? alvo;
      return `${tipo === 'save' ? 'salvaguarda de' : 'teste de'} ${rot}${dc ? ` CD ${dc}` : ''}`;
    })
    .replace(/\[\[\/\w+\s+([^\]]*?)(?:\s*#[^\]]*)?\]\](?:\{([^}]*)\})?/g, (_, f, rot) => rot || f)
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\/\s*(p|div|h\d|li|tr|ul|ol|table|blockquote|section)\s*>/gi, '\n')
    .replace(/<\s*(td|th)[^>]*>/gi, ' ');
  const doc = new DOMParser().parseFromString(s, 'text/html');
  return (doc.body.textContent ?? '')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function rotuloTraco(chave, trait) {
  try { return dnd5e.documents.Trait.keyLabel(chave, { trait }) ?? chave; } catch { return chave; }
}

function usosTexto(item) {
  const u = item.system.uses;
  if (!u?.max) return '';
  const per = (u.recovery ?? []).map((r) => CONFIG.DND5E.limitedUsePeriods?.[r.period]?.abbreviation
    ?? CONFIG.DND5E.limitedUsePeriods?.[r.period]?.label ?? r.period).filter(Boolean).join('/');
  return ` [${u.value ?? 0}/${u.max}${per ? ` ${per}` : ''}]`;
}

function ataqueDoItem(item) {
  let bonus = item.labels?.modifier ?? item.labels?.toHit ?? '';
  let dano = (item.labels?.damages ?? []).map((d) => {
    const tipo = CONFIG.DND5E.damageTypes[d.damageType]?.label ?? CONFIG.DND5E.healingTypes?.[d.damageType]?.label ?? '';
    return `${d.formula}${tipo ? ` ${tipo.toLowerCase()}` : ''}`;
  }).join(' + ');
  const atv = item.system.activities?.find?.((a) => a.type === 'attack' || a.type === 'save' || a.type === 'damage');
  if (atv) {
    if (!bonus && atv.labels?.toHit) bonus = atv.labels.toHit;
    if (!bonus && atv.save?.dc?.value) bonus = `CD ${atv.save.dc.value}`;
    if (!dano && atv.labels?.damage?.length) {
      dano = atv.labels.damage.map((d) => `${d.formula}${d.damageType ? ` ${(CONFIG.DND5E.damageTypes[d.damageType]?.label ?? '').toLowerCase()}` : ''}`).join(' + ');
    }
  }
  if (bonus && /^\d/.test(String(bonus))) bonus = `+${bonus}`;
  return { nome: item.name, bonus: String(bonus ?? ''), dano };
}

async function retratoPng(src) {
  if (!src || /mystery-man|default/i.test(src)) return null;
  try {
    const img = await new Promise((ok, falha) => {
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = () => ok(i); i.onerror = falha; i.src = src;
    });
    // botão tem ~162×217 pt; 3× para ficar nítido na impressão
    const escala = Math.min(1, 650 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), tipo: 'png' };
  } catch (err) {
    console.warn(`${MODULE_ID} | retrato não carregou`, err);
    return null;
  }
}

/** Magia utilizável: preparada, sempre preparada, inata, de pacto etc. */
function preparada(m) {
  const metodo = m.system.method ?? m.system.preparation?.mode;
  const prep = m.system.prepared ?? m.system.preparation?.prepared;
  return metodo !== 'prepared' && metodo !== 'spell' ? true : Boolean(prep);
}

/** Monta { texto, marcar, rotulos, anexos } a partir do ator preparado. */
export function coletarFicha(actor) {
  const s = actor.system;
  const T = {}, marcar = [], anexos = [];
  const rotulos = {
    'Ataques e Magias': 'Ataques e magias', 'Idiomas e outras Proficiências': 'Idiomas e proficiências',
    'Equipamento': 'Equipamento', 'Caracteristicas e Habilidades': 'Características e habilidades',
    'Outras Características e Habilidades': 'Descrição das características', 'História do Personagem': 'História',
    'Tesouro': 'Tesouro', 'Aliados e Organizações': 'Aliados e organizações', 'Traços de Personalidade': 'Traços de personalidade'
  };
  const itens = actor.items.contents;
  const porTipo = (t) => itens.filter((i) => i.type === t);

  // --- Cabeçalho ------------------------------------------------------------
  T['Nome do Personagem'] = actor.name;
  const classes = Object.values(actor.classes ?? {}).sort((a, b) => b.system.levels - a.system.levels);
  T['Classe e Nível'] = classes.map((c) => `${c.name} ${c.system.levels}${c.subclass ? ` (${c.subclass.name})` : ''}`).join(' / ');
  T['Antecedente'] = s.details.background?.name ?? '';
  const jogador = game.users.find((u) => !u.isGM && actor.testUserPermission(u, 'OWNER'));
  T['Nome do Jogador'] = jogador?.name ?? '';
  T['Raça'] = s.details.race?.name ?? (typeof s.details.race === 'string' ? '' : '');
  T['Tendência'] = s.details.alignment ?? '';
  T['Pontos de Experiência'] = s.details.xp?.value ? String(s.details.xp.value) : '';

  // --- Atributos, salvaguardas e perícias ----------------------------------
  for (const [k, campo] of Object.entries(ATRIBUTOS)) {
    const a = s.abilities[k];
    T[campo] = String(a.value ?? '');
    T[`${campo}mod`] = sinal(a.mod);
    const save = typeof a.save === 'object' ? a.save?.value : a.save;
    T[`Res-${campo}`] = sinal(save ?? a.mod);
    if (a.proficient) marcar.push(`RB-${campo}-R`);
  }
  for (const [k, campo] of Object.entries(PERICIAS)) {
    const sk = s.skills?.[k];
    if (!sk) continue;
    T[campo] = sinal(sk.total ?? sk.mod);
    if (sk.value >= 1) marcar.push(CAIXA_PERICIA[k] ?? `RB-${campo}`);
  }
  T['Inspiration'] = s.attributes.inspiration ? 'X' : '';
  T['ProfBonus'] = sinal(s.attributes.prof);
  T['Passive'] = String(s.skills?.prc?.passive ?? '');

  // --- Combate ----------------------------------------------------------------
  T['AC'] = String(s.attributes.ac?.value ?? '');
  T['Iniciativa'] = sinal(s.attributes.init?.total ?? s.attributes.init?.mod);
  const mov = s.attributes.movement ?? {};
  const un = mov.units ?? '';
  const outros = ['fly', 'swim', 'climb', 'burrow'].filter((m) => mov[m])
    .map((m) => `${CONFIG.DND5E.movementTypes?.[m]?.label ?? CONFIG.DND5E.movementTypes?.[m] ?? m} ${mov[m]}`.toLowerCase());
  T['Deslocamento'] = [`${mov.walk ?? 0} ${un}`.trim(), ...outros].join(' / ');
  const hp = s.attributes.hp ?? {};
  T['PV'] = String(hp.max ?? '');
  T['PV TOTAL'] = String(hp.value ?? '');
  T['PV Temporários'] = hp.temp ? String(hp.temp) : '';
  const dados = classes.map((c) => `${c.system.levels}${c.system.hd?.denomination ?? ''}`);
  T['Dados de Vida'] = dados.join('+');
  T['Dados de Vida0'] = String(s.attributes.hd?.value ?? '');
  const morte = s.attributes.death ?? {};
  for (let i = 1; i <= 3; i++) {
    if ((morte.success ?? 0) >= i) marcar.push(`Check Box ${i}`);
    if ((morte.failure ?? 0) >= i) marcar.push(`Check Box ${i + 3}`);
  }

  // --- Ataques ----------------------------------------------------------------
  const armas = porTipo('weapon').sort((a, b) => (b.system.equipped ?? 0) - (a.system.equipped ?? 0)).map(ataqueDoItem);
  armas.slice(0, 3).forEach((a, i) => {
    T[`Arma ${i + 1}`] = a.nome; T[`Bônus ${i + 1}`] = a.bonus; T[`Dano / Tipo ${i + 1}`] = a.dano;
  });
  const linhasAtaque = armas.slice(3).map((a) => `${a.nome}${a.bonus ? `: ${a.bonus}` : ''}${a.dano ? `, ${a.dano}` : ''}`);
  const linhaAtaque = (a) => `${a.nome}${a.bonus ? `: ${a.bonus}` : ''}${a.dano ? `, ${a.dano}` : ''}`;
  const magiasAtaque = porTipo('spell').filter((i) => (i.system.level === 0 || preparada(i)) && i.system.activities?.some?.((a) => ['attack', 'save', 'damage'].includes(a.type)))
    .sort((a, b) => a.system.level - b.system.level).map(ataqueDoItem).map(linhaAtaque);
  const outrosAtaques = porTipo('feat').filter((i) => i.system.activities?.some?.((a) => a.type === 'attack' || a.type === 'save'))
    .map(ataqueDoItem).map(linhaAtaque);
  T['Ataques e Magias'] = [
    ...linhasAtaque,
    ...(outrosAtaques.length ? ['', ...outrosAtaques] : []),
    ...(magiasAtaque.length ? ['', 'Magias:', ...magiasAtaque] : [])
  ].join('\n').trim();

  // --- Idiomas e proficiências ---------------------------------------------
  const tr = s.traits ?? {};
  const lista = (conj, trait) => [...(conj?.value ?? [])].map((k) => rotuloTraco(k, trait))
    .concat(conj?.custom ? conj.custom.split(';').map((x) => x.trim()).filter(Boolean) : []);
  const idiomas = tr.languages?.labels?.languages ?? lista(tr.languages, 'languages');
  const ferramentas = Object.keys(s.tools ?? {}).map((k) => rotuloTraco(k, 'tool'))
    .concat(porTipo('tool').map((t) => t.name));
  const blocoProf = [
    idiomas.length && `Idiomas: ${idiomas.join(', ')}`,
    lista(tr.armorProf, 'armor').length && `Armaduras: ${lista(tr.armorProf, 'armor').join(', ')}`,
    lista(tr.weaponProf, 'weapon').length && `Armas: ${lista(tr.weaponProf, 'weapon').join(', ')}`,
    ferramentas.length && `Ferramentas: ${[...new Set(ferramentas)].join(', ')}`,
    lista(tr.dr, 'dr').length && `Resistências: ${lista(tr.dr, 'dr').join(', ')}`,
    lista(tr.di, 'di').length && `Imunidades: ${lista(tr.di, 'di').join(', ')}`,
    lista(tr.dv, 'dv').length && `Vulnerabilidades: ${lista(tr.dv, 'dv').join(', ')}`,
    lista(tr.ci, 'ci').length && `Imune a condições: ${lista(tr.ci, 'ci').join(', ')}`,
    (() => {
      const sentidos = Object.entries(s.attributes.senses ?? {})
        .filter(([k, v]) => typeof v === 'number' && v > 0 && k !== 'units')
        .map(([k, v]) => `${CONFIG.DND5E.senses?.[k]?.label ?? CONFIG.DND5E.senses?.[k] ?? k} ${v} ${s.attributes.senses.units ?? ''}`.trim());
      return sentidos.length && `Sentidos: ${sentidos.join(', ')}`;
    })()
  ].filter(Boolean);
  T['Idiomas e outras Proficiências'] = blocoProf.join('\n');

  // --- Equipamento e tesouro ------------------------------------------------
  const fisico = ['weapon', 'equipment', 'consumable', 'tool', 'container', 'loot'];
  const fmtItem = (i) => {
    const q = i.system.quantity ?? 1;
    const marcas = [i.system.equipped ? 'eq.' : '', i.system.attunement && i.system.attuned ? 'sint.' : ''].filter(Boolean).join(', ');
    return `${q > 1 ? `${q}× ` : ''}${i.name}${marcas ? ` (${marcas})` : ''}`;
  };
  const dentro = (i) => i.system.container;
  const linhasEquip = [];
  for (const i of itens.filter((x) => fisico.includes(x.type) && x.type !== 'loot' && !dentro(x))) {
    linhasEquip.push(fmtItem(i));
    if (i.type === 'container') {
      for (const c of itens.filter((x) => x.system.container === i.id)) linhasEquip.push(`   – ${fmtItem(c)}`);
    }
  }
  T['Equipamento'] = linhasEquip.join('\n');
  const moedas = s.currency ?? {};
  const nomesMoeda = { pp: 'PL', gp: 'PO', ep: 'PE', sp: 'PP', cp: 'PC' };
  const linhaMoedas = Object.entries(nomesMoeda).filter(([k]) => moedas[k]).map(([k, n]) => `${moedas[k]} ${n}`).join(' · ');
  // caixinhas de moeda da página 1 (sem campo no formulário): PC, PP, PE, PO, PL
  const desenhos = [['cp', 605], ['sp', 634], ['ep', 661], ['gp', 686], ['pp', 712]]
    .filter(([k]) => moedas[k]).map(([k, y]) => ({ pagina: 0, x: 249, y, texto: String(moedas[k]), tamanho: String(moedas[k]).length > 4 ? 7 : 9 }));
  T['Tesouro'] = [linhaMoedas && `Moedas: ${linhaMoedas}`, ...porTipo('loot').filter((x) => !dentro(x)).map(fmtItem)]
    .filter(Boolean).join('\n');

  // --- Personalidade e detalhes --------------------------------------------
  const d = s.details;
  T['Traços de Personalidade'] = htmlParaTexto(d.trait);
  T['Ideais'] = htmlParaTexto(d.ideal);
  T['Ligações'] = htmlParaTexto(d.bond);
  T['Defeitos'] = htmlParaTexto(d.flaw);
  T['Idade'] = d.age; T['Altura'] = d.height; T['Peso'] = d.weight;
  T['Olhos'] = d.eyes; T['Pele'] = d.skin; T['Cabelos'] = d.hair;
  const fluxos = [];
  fluxos.push({ titulo: 'História', ordem: 2, campos: ['História do Personagem'], texto: [
    d.gender && `Gênero: ${d.gender}`,
    d.appearance && `Aparência: ${htmlParaTexto(d.appearance)}`,
    htmlParaTexto(d.biography?.value)
  ].filter(Boolean).join('\n\n') });

  // --- Características ------------------------------------------------------
  const feats = porTipo('feat');
  const grupos = new Map();
  const grupoDe = (f) => {
    const t = f.system.type?.value;
    if (t === 'class') return f.system.type?.subtype ? 'Classe' : 'Classe';
    if (t === 'race') return 'Raça';
    if (t === 'background') return 'Antecedente';
    if (t === 'feat') return 'Talentos';
    return 'Outras';
  };
  for (const f of feats) {
    const g = grupoDe(f);
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(f);
  }
  const ordem = ['Classe', 'Raça', 'Antecedente', 'Talentos', 'Outras'];
  T['Caracteristicas e Habilidades'] = ordem.filter((g) => grupos.has(g))
    .map((g) => `${g.toUpperCase()}\n${grupos.get(g).map((f) => `• ${f.name}${usosTexto(f)}`).join('\n')}`)
    .join('\n\n');
  // descrições iguais (ex.: Spellcasting de várias classes) entram uma vez só
  const descricoes = new Map();
  for (const f of feats) {
    const txt = htmlParaTexto(f.system.description?.value);
    if (!txt) continue;
    if (descricoes.has(txt)) descricoes.get(txt).add(f.name); else descricoes.set(txt, new Set([f.name]));
  }
  const textoFeats = [...descricoes].map(([txt, nomes]) => `${[...nomes].join(' / ').toUpperCase()}: ${txt.replace(/\n\n+/g, '\n')}`).join('\n');
  fluxos.push({
    titulo: 'Características e habilidades', ordem: 1,
    campos: ['Aliados e Organizações', 'Outras Características e Habilidades'],
    texto: [d.faith ? `FÉ: ${d.faith}` : '', textoFeats].filter(Boolean).join('\n')
  });

  // --- Magias --------------------------------------------------------------
  const conj = classes.filter((c) => c.system.spellcasting?.progression && c.system.spellcasting.progression !== 'none');
  const habConj = s.attributes.spellcasting;
  const magias = porTipo('spell');
  if (conj.length || magias.length) {
    T['Classe de Conjurador'] = conj.map((c) => c.name).join(' / ');
    T['SpellcastingAbility'] = habConj ? (CONFIG.DND5E.abilities[habConj]?.abbreviation ?? habConj).toUpperCase() : '';
    T['SpellSaveDC'] = s.attributes.spell?.dc ? String(s.attributes.spell.dc) : (habConj ? String(s.abilities[habConj]?.dc ?? '') : '');
    const atk = s.attributes.spell?.attack ?? (habConj ? s.abilities[habConj]?.attack : null);
    T['SpellAtkBonus'] = atk != null ? sinal(atk) : '';
  }
  const rotMagia = (m) => {
    const tags = [m.system.properties?.has?.('concentration') ? 'C' : '', m.system.properties?.has?.('ritual') ? 'R' : ''].filter(Boolean);
    return `${m.name}${tags.length ? ` (${tags.join(',')})` : ''}`;
  };
  const porNivel = Array.from({ length: 10 }, () => []);
  // preparadas primeiro: num druida/clérigo com a lista inteira, são elas que ficam na página
  for (const m of magias.sort((a, b) => (preparada(b) - preparada(a)) || a.name.localeCompare(b.name, 'pt-BR'))) porNivel[Math.min(9, m.system.level ?? 0)].push(m);
  const sobra = [];
  const encher = (campos, caixas, lista, nivel) => {
    const cabe = lista.length > campos.length ? campos.length - 1 : campos.length;
    lista.slice(0, cabe).forEach((m, i) => {
      T[campos[i]] = rotMagia(m);
      if (caixas && preparada(m)) marcar.push(caixas[i]);
    });
    if (lista.length > cabe) {
      T[campos[cabe]] = `+${lista.length - cabe} no anexo`;
      sobra.push(`${nivel === 0 ? 'Truques' : `${nivel}º círculo`}: ${lista.slice(cabe).map((m) => `${rotMagia(m)}${nivel && preparada(m) ? ' [prep.]' : ''}`).join(', ')}`);
    }
  };
  encher(TRUQUES, null, porNivel[0], 0);
  const linhas = linhasMagia();
  const pacto = s.spells?.pact;
  for (let n = 1; n <= 9; n++) {
    const esp = s.spells?.[`spell${n}`] ?? {};
    let total = esp.max ?? 0, usados = (esp.max ?? 0) - (esp.value ?? 0);
    const sufixo = n === 1 ? '' : String(n - 2);
    if (pacto?.max && pacto.level === n) {
      T[`Total de Espaços Nível ${n}`] = total ? `${total}+${pacto.max}P` : `${pacto.max}P`;
      usados += pacto.max - (pacto.value ?? 0);
    } else if (total) T[`Total de Espaços Nível ${n}`] = String(total);
    if (total || pacto?.level === n) T[`Espaços Usados${sufixo}`] = usados ? String(usados) : '';
    encher(linhas[n - 1].campos, linhas[n - 1].caixas, porNivel[n], n);
  }
  if (sobra.length) anexos.push({ titulo: 'Magias que não couberam na página 3', ordem: 3, texto: sobra.join('\n') });

  for (const k of Object.keys(T)) if (T[k] == null) delete T[k]; else T[k] = String(T[k]);
  return { texto: T, marcar, rotulos, anexos, fluxos, desenhos, titulo: actor.name };
}

let pdfLibPromise = null;
function carregarPdfLib() {
  if (globalThis.PDFLib) return Promise.resolve(globalThis.PDFLib);
  pdfLibPromise ??= new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = `${BASE}/vendor/pdf-lib.min.js`;
    s.onload = () => ok(globalThis.PDFLib);
    s.onerror = () => { pdfLibPromise = null; falha(new Error('pdf-lib não carregou')); };
    document.head.append(s);
  });
  return pdfLibPromise;
}

// O saveDataToFile do core revoga o blob 100 ms depois do clique; com o PDF
// (~600 KB) o navegador ainda não leu e o download falha ("Algo deu errado").
function baixarArquivo(bytes, tipo, nome) {
  const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.style.display = 'none';
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 60_000);
}

export async function exportarFichaPdf(actor) {
  const aviso = ui.notifications.info(`Gerando a ficha de ${actor.name}…`, { permanent: true });
  try {
    const [PDFLib, bytes] = await Promise.all([
      carregarPdfLib(),
      fetch(`${BASE}/assets/ficha-dnd5e.pdf`).then((r) => {
        if (!r.ok) throw new Error(`ficha vazia não encontrada (${r.status})`);
        return r.arrayBuffer();
      })
    ]);
    const dados = coletarFicha(actor);
    dados.retrato = await retratoPng(actor.img);
    const pdf = await preencherFicha(PDFLib, bytes, dados);
    const nome = `${actor.name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'ficha'}.pdf`;
    baixarArquivo(pdf, 'application/pdf', nome);
    ui.notifications.info(`Ficha exportada: ${nome}`);
  } catch (err) {
    console.error(`${MODULE_ID} | exportar ficha`, err);
    ui.notifications.error(`Não foi possível exportar a ficha: ${err.message}`);
  } finally {
    ui.notifications.remove?.(aviso);
  }
}

export function registerExportarFichaHooks() {
  // Menu ⋮ do cabeçalho das fichas ApplicationV2 (dnd5e 5.x)
  Hooks.on('getHeaderControlsActorSheetV2', (app, controles) => {
    const actor = app.document;
    if (actor?.type !== 'character' || !actor.isOwner) return;
    if (controles.some((c) => c.action === 'mmrExportarFicha')) return;
    controles.push({
      action: 'mmrExportarFicha',
      icon: 'fa-solid fa-file-pdf',
      label: 'Exportar ficha (PDF)',
      onClick: () => exportarFichaPdf(actor)
    });
  });
}
