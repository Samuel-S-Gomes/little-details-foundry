# CLAUDE.md — Hurricane Knight Implementation State

> Este arquivo documenta o estado da implementação da classe **Hurricane Knight** para o módulo `meu-modulo-rpg` (FoundryVTT v13 + dnd5e 5.3.x). Use-o como ponto de retomada entre sessões.

---

## Objetivo

Adicionar uma classe homebrew completa de D&D 5e (1–20) ao módulo, num **novo compêndio do tipo Item**, com **automação total** via:
- `Advancement` (ItemGrant, ItemChoice, Subclass, ScaleValue, Trait, HitPoints, AbilityScoreImprovement)
- `Activities` do dnd5e 5.x (save, attack, utility, damage)
- `ActiveEffects` para resistências, voo, bônus de atributo, etc.
- Compatível com **Midi-QOL** (que o usuário possui instalado)

A classe deve "parecer oficial" — integrada com level-up wizard, starting equipment, save DC automático, scale values acessíveis via `@scale.<id>.<key>`.

### Fonte do conteúdo
Hurricane Knight (5e Class) — D&D Wiki (GNU FDL 1.3). O texto integral foi colado pelo usuário e está fielmente reproduzido nos documentos. Subclasses: **Steel Wind Warrior** e **Storm Knight**.

### Decisões já tomadas com o usuário
1. **Wind Armor** → resistência via Active Effect simples + nota descritiva; o Midi-QOL/macro o usuário ajustará depois.
2. **Hurricane Strike** → standalone Action; sistema não consegue forçar "consome 1 ataque do Attack action".
3. **Defensive Gust** → "floating step speed" interpretado como velocidade de movimento atual do personagem.
4. **Wind Body** → spell `investiture of wind` incluído no texto da feature (não está no SRD do dnd5e).
5. **Thunder Blast** → modifica Air Blast (acrescentando 3ª activity Attack) **e** existe como feat descritivo separado.
6. **Build** → roda no **GitHub Actions** (não local), via `@foundryvtt/foundryvtt-cli`.
7. **dnd5e target**: 5.3.x (Foundry v13, regras 2014).
8. **Idioma**: inglês original.

---

## Estrutura do compêndio

Compêndio: **`hurricane-knight`** (type: Item) — path: `packs/hurricane-knight/`

Folders (4):
- `Class & Subclasses` — `HKOclasssub00001`
- `Class Features` — `HKOfeatures00001`
- `Steel Wind Warrior Features` — `HKOsteelwindFts1`
- `Storm Knight Features` — `HKOstormKnightFt`

### IDs (16-char alfanuméricos)

**Classe e subclasses:**
| Doc | _id |
|---|---|
| Hurricane Knight (class) | `HKCmainHurricane` |
| Steel Wind Warrior (subclass) | `HKSsteelwindWarr` |
| Storm Knight (subclass) | `HKSstormKnight00` |

**Class Features (15):**
| Feature | _id | Level |
|---|---|---|
| Wind Armor | `HKFwindArmor0001` | 1 |
| Air Blast | `HKFairBlast00001` | 1 |
| Hurricane Strike | `HKFhurricaneStrk` | 2 |
| Destructive Tornado | `HKFdestructTorn1` | 2 |
| Knight Order | `HKFknightOrder01` | 3 |
| Gale Step | `HKFgaleStep00001` | 3 |
| Extra Attack | `HKFextraAttack01` | 5 |
| Wind Heart | `HKFwindHeart0001` | 6 |
| Floating Step | `HKFfloatingStep1` | 7 |
| Defensive Gust | `HKFdefensiveGust` | 9 |
| Air Control | `HKFairControl001` | 10 |
| Air Bubble | `HKFairBubble0001` | 15 |
| One With the Storm | `HKFoneWithStorm1` | 15 |
| Flight | `HKFflight0000001` | 18 |
| Wind Walker | `HKFwindWalker001` | 20 |

**Steel Wind Warrior Features (5):**
| Feature | _id | Level |
|---|---|---|
| Steel Cyclone | `HKFsteelCyclone1` | 3 |
| Whirlwind Ward | `HKFwhirlwindWard` | 3 |
| Wrecking Wind | `HKFwreckingWind1` | 6 |
| Rage Tornado | `HKFrageTornado01` | 11 |
| Wind Body | `HKFwindBody00001` | 14 |

**Storm Knight Features (6):**
| Feature | _id | Level |
|---|---|---|
| Thunder Blast | `HKFthunderBlast1` | 3 |
| Storm Heart | `HKFstormHeart001` | 3 |
| Resistance: Lightning | `HKFresistLightng` | 3 (choice) / 14 (auto) |
| Resistance: Thunder | `HKFresistThunder` | 3 (choice) / 14 (auto) |
| Electrify | `HKFelectrify0001` | 6 |
| Thunderous Storm | `HKFthunderousStm` | 11 |
| Lightning Destruction | `HKFlightningDest` | 14 |

### Scale Values
- **Classe (`@scale.hurricane-knight.*`):**
  - `air-blast-distance` (distance ft): 10 / 15 (5) / 20 (9) / 25 (13) / 30 (17)
  - `destructive-tornado-dice` (dice): 3d6 / 4d6 (6) / 5d6 (11) / 6d6 (16)
  - `defensive-gust-uses` (number): 1 / 2 (13) / 3 (17)
- **Steel Wind Warrior (`@scale.steel-wind-warrior.*`):**
  - `rage-tornado-dice` (dice): 4d6 (11) / 6d6 (17)
  - `wind-body-uses` (number): 1 (14) / 2 (17)
- **Storm Knight (`@scale.storm-knight.*`):**
  - `thunder-blast-die` (dice): 1d4 (3) / 1d6 (5) / 1d8 (11) / 1d10 (17)
  - `storm-heart-bonus-dice` (dice): 1d6 (3) / 2d6 (11)
  - `electrify-dice` (dice): 2d8 (6) / 3d8 (11) / 4d8 (17)

---

## Estado atual

### ✅ Já feito

**Infra:**
- `module.json` atualizado — campo `packs` + `packFolders` adicionados, sistema dnd5e minimum 5.0.0 / verified 5.3.2.
- `package.json` criado com devDep `@foundryvtt/foundryvtt-cli` e scripts `build:packs` / `clean:packs`.
- `tools/build-packs.mjs` — script Node que lê `module.json` e compila cada pack de `packs/<name>/_source/*.json` para LevelDB no próprio diretório.
- `.github/workflows/release.yml` — Node 20 + `npm install` + `npm run build:packs` antes do zip. Exclui `tools/`, `package*.json`, `node_modules/`, `packs/*/_source/*` do release.
- `.gitignore` — ignora artefatos LevelDB (`*.ldb`, `*.log`, `*.sst`, `CURRENT`, `LOCK`, `MANIFEST*`).
- `npm install` validado (cli funcional, `compilePack` é uma função).

**Documentos JSON criados em `packs/hurricane-knight/_source/`:**
- ✅ `_folder-class-subclasses.json`
- ✅ `_folder-class-features.json`
- ✅ `_folder-steel-wind.json`
- ✅ `_folder-storm-knight.json`
- ✅ `class-hurricane-knight.json` (com 24 advancements: HitPoints + 3 Traits + 9 ItemGrants + 5 ASIs + 1 Subclass + 3 ScaleValues; tabela 1–20 completa no description; startingEquipment configurado)
- ✅ `subclass-steel-wind-warrior.json` (4 ItemGrants + 2 ScaleValues)

### 🚧 Em andamento

- Subclass `Storm Knight` (a próxima coisa a escrever): 4 ItemGrants + 1 ItemChoice em L3+L14 (pool = {resist lightning, resist thunder}) + 3 ScaleValues.

### ⏳ Pendente — features (26 arquivos JSON)

Para cada feature, precisamos: descrição HTML fiel ao texto da homebrew, requirements ("Hurricane Knight N"), type {value: class|subclass, subtype: hurricane-knight|steel-wind-warrior|storm-knight}, activation, range, target template, activities (save/attack/utility/damage), uses+recovery quando aplicável, ActiveEffects quando aplicável.

**Class Features (15):**
1. Wind Armor — bonus action (utility, 1 round AE para AC) + reaction (Str save, push 5ft)
2. Air Blast — action (Str save, range = `@scale.hurricane-knight.air-blast-distance`) + bonus action mesma activity. Storm Knight adiciona attack activity (1d4+CHA scaling) ao editar este arquivo conforme necessário.
3. Hurricane Strike — action (Str save, círculo 5ft self, 1d6 bludg)
4. Destructive Tornado — action (Str save, círculo 10ft, `@scale.hurricane-knight.destructive-tornado-dice` bludg, half on save, 1/short rest)
5. Knight Order — descritivo
6. Gale Step — bonus action (utility, voar 10×PB ft)
7. Extra Attack — descritivo (sistema não auto-aplica)
8. Wind Heart — descritivo (magical damage para class features)
9. Floating Step — descritivo (ignora difficult terrain, advantage em saves contra movimento forçado/grapple/restraint)
10. Defensive Gust — reaction (utility), uses = `@scale.hurricane-knight.defensive-gust-uses`, recovery lr
11. Air Control — action (utility, message magic, área 5-ft, choke), uses = `@abilities.cha.mod`, recovery lr
12. Air Bubble — passivo (Active Effect: resistance thunder, immune to inhale-required effects)
13. One With the Storm — descritivo (flight × 2 sob vento moderado/forte)
14. Flight — passivo (Active Effect: `system.attributes.movement.fly = 60`)
15. Wind Walker — passivo (Active Effect: Dex +4 max 24, sem AoO, advantage Dex checks)

**Steel Wind Warrior Features (5):**
16. Steel Cyclone — descritivo
17. Whirlwind Ward — action (utility + AE 1 round: resistance bludg/pierce/slash não-mágico)
18. Wrecking Wind — action vs objeto (descritivo)
19. Rage Tornado — action (Dex save, cilindro 20×30 ft, `@scale.steel-wind-warrior.rage-tornado-dice` bludg + Str save de push)
20. Wind Body — action (utility, casts investiture of wind — texto completo da spell no description), uses = `@scale.steel-wind-warrior.wind-body-uses`, recovery lr

**Storm Knight Features (6+1):**
21. Thunder Blast — descritivo (também ajustar Air Blast com attack activity)
22. Storm Heart — descritivo (adiciona `@scale.storm-knight.storm-heart-bonus-dice` lightning/thunder ao Destructive Tornado + previne reactions on fail)
23. Resistance (Lightning) — passivo (AE: damage resistance lightning)
24. Resistance (Thunder) — passivo (AE: damage resistance thunder)
25. Electrify — action (Dex save, cube 5-ft, `@scale.storm-knight.electrify-dice` lightning, duração 1 min)
26. Thunderous Storm — descritivo (criaturas que falham no Destructive Tornado ficam stunned até fim do próximo turno)
27. Lightning Destruction — action (cast chain lightning via spell reference), 1/lr

### ⏳ Pendente — fechamento

- Validar build local: `npm run build:packs` (deve gerar LevelDB sem erros)
- Atualizar `README.md` (seção "Funcionalidades" listando a nova classe + compêndio)
- Atualizar `CHANGELOG.md` (nova entrada 0.3.0 ou similar)
- Bump de versão no `module.json` se solicitado
- `git add`, `git commit`, `git push` para branch `claude/foundry-new-feature-WCcV6`

---

## Pendente de resposta do usuário

**Nenhum item pendente no momento.** Todas as perguntas iniciais foram respondidas:
- Texto da homebrew ✅ (colado pelo usuário)
- dnd5e versão ✅ (5.3.2 com regras 2014)
- Automação ✅ (total via Advancements)
- Idioma ✅ (inglês original)
- Ambiguidades 1–5 ✅ (respostas dadas)
- Build local vs CI ✅ (CI)

Se surgirem ambiguidades novas durante a implementação dos features, registrar aqui.

---

## Convenções técnicas

- IDs Foundry: exatamente 16 chars alfanuméricos `[A-Za-z0-9]`. Sem hífens, sem underscores.
- `_key` no JSON-source: `!items!<id>` para itens, `!folders!<id>` para folders. O `@foundryvtt/foundryvtt-cli` respeita isso.
- UUID de referência cross-compêndio dentro do mesmo módulo:  
  `Compendium.meu-modulo-rpg.hurricane-knight.Item.<feature-id>`
- Activities ficam em `system.activities` como objeto chaveado por id (não array).
- Item-level uses em `system.uses` (max + recovery array). Activities consomem via `consumption.targets: [{type: "itemUses", value: "1"}]`.
- Active Effects que precisam ser transferidos ao ator: `transfer: true` no nível do ActiveEffect.
- Para features passivas que aplicam o efeito ao equipar/adquirir: `transfer: true` + `disabled: false`.
- Para features que aplicam o efeito ao USAR a activity: `transfer: false`, e a activity inclui `effects: [{ _id: "<effect_id>" }]`.

---

## Próximo passo concreto

Escrever `subclass-storm-knight.json`, depois começar pelos features mais complexos (Air Blast, Wind Armor, Destructive Tornado, Hurricane Strike) e finalizar com os passivos descritivos.
