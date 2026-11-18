// Teste fora do Foundry: monta um "ator preparado" aproximado a partir do JSON
// cru (dump do mundo) e gera o PDF. Uso: node tools/testar-ficha-pdf.mjs atores.jsonl NOME saida.pdf
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.self = globalThis; await import('../vendor/pdf-lib.min.js'); const PDFLib = globalThis.PDFLib;
const [arq, nome, saida] = process.argv.slice(2);
const raw = fs.readFileSync(arq, 'utf8').split('\n').filter(Boolean).map(JSON.parse).find((a) => a.name === nome);

globalThis.DOMParser = class { parseFromString(s) { return { body: { textContent: s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&') } }; } };
globalThis.CONFIG = { DND5E: { damageTypes: {}, healingTypes: {}, abilities: {}, limitedUsePeriods: { lr: { abbreviation: 'DL' }, sr: { abbreviation: 'DC' }, day: { abbreviation: 'dia' } }, movementTypes: {}, senses: {} } };
globalThis.game = { users: [] };
globalThis.Roll = { replaceFormulaData: (f, d) => f.replace(/@[\w.-]+/g, (k) => { const v = k.slice(1).split(".").reduce((o, p) => o?.[p], d); return v ?? ""; }), safeEval: (f) => { if (!/^[\d+\-*/(). ]+$/.test(f) || !f.trim()) throw new Error("x"); return Function(`return (${f})`)(); } };
globalThis.dnd5e = { documents: { Trait: { keyLabel: (k) => k } } };

const s = structuredClone(raw.system);
const itens = raw.items.map((i) => ({ ...i, id: i._id, system: { ...i.system, properties: new Set(i.system.properties ?? []), activities: Object.values(i.system.activities ?? {}) } }));
const classes = itens.filter((i) => i.type === 'class');
const nivel = classes.reduce((t, c) => t + c.system.levels, 0);
const prof = Math.ceil(nivel / 4) + 1;
for (const [k, a] of Object.entries(s.abilities)) { a.mod = Math.floor((a.value - 10) / 2); a.save = { value: a.mod + (a.proficient ? prof : 0) }; }
const habPer = { acr: 'dex', arc: 'int', ath: 'str', prf: 'cha', dec: 'cha', ste: 'dex', his: 'int', itm: 'cha', ins: 'wis', inv: 'int', ani: 'wis', med: 'wis', nat: 'int', prc: 'wis', per: 'cha', slt: 'dex', rel: 'int', sur: 'wis' };
for (const [k, h] of Object.entries(habPer)) { const sk = (s.skills[k] ??= { value: 0 }); sk.total = s.abilities[h].mod + Math.floor((sk.value ?? 0) * prof); sk.passive = 10 + sk.total; }
s.attributes.prof = prof; s.attributes.ac.value = 10 + s.abilities.dex.mod; s.attributes.init.total = s.abilities.dex.mod;
s.attributes.hp.max ??= 50; s.attributes.hd = { value: nivel };
s.details.race = itens.find((i) => i.type === 'race'); s.details.background = itens.find((i) => i.type === 'background');
s.attributes.spell = { dc: 8 + prof + 3, attack: prof + 3 };
for (let n = 1; n <= 9; n++) { const e = s.spells[`spell${n}`]; if (e) e.max = e.override ?? Math.max(0, 5 - Math.floor(n / 2)); }
for (const i of itens) if (i.type === 'weapon') i.labels = { modifier: String(prof + 3), damages: (i.system.damage?.base ? [{ formula: `${i.system.damage.base.number ?? 1}d${i.system.damage.base.denomination ?? 6}+3`, damageType: [...(i.system.damage.base.types ?? [])][0] }] : []) };
const byId = Object.fromEntries(classes.map((c) => [c.system.identifier, c]));
for (const sc of itens.filter((i) => i.type === 'subclass')) if (byId[sc.system.classIdentifier]) byId[sc.system.classIdentifier].subclass = sc;
const actor = { name: raw.name, img: raw.img, type: 'character', system: s, items: { contents: itens }, classes: Object.fromEntries(classes.map((c) => [c.id, c])), testUserPermission: () => false };

const { coletarFicha } = await import('../scripts/exportar-ficha.js');
const { preencherFicha } = await import('../scripts/ficha-pdf.js');
const dados = coletarFicha(actor);
fs.writeFileSync(saida + '.json', JSON.stringify(dados, null, 1));
const pdf = await preencherFicha(PDFLib, fs.readFileSync(new URL('../assets/ficha-dnd5e.pdf', import.meta.url)), dados);
fs.writeFileSync(saida, pdf);
console.log('ok', saida, pdf.length, 'bytes; anexos:', dados.anexos.length);
