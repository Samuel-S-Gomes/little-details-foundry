# CLAUDE.md — Module Implementation State

> Estado da implementação do módulo `meu-modulo-rpg` (FoundryVTT v13 + dnd5e 5.3.x). Cobre duas features principais: o compêndio **Hurricane Knight** e o **sistema de lembretes do GM**. Use-o como ponto de retomada entre sessões.

---

## Status geral

### Hurricane Knight (compêndio)
- ✅ Classe Hurricane Knight + 2 subclasses + 27 features implementadas no compêndio
- ✅ Pipeline de build (JSON-fonte → LevelDB) via `@foundryvtt/foundryvtt-cli`
- ✅ Workflow do GitHub Actions com 3 triggers e idempotência
- ✅ Release **v0.3.1** publicada (fix de ícones em cima da v0.3.0)
- ⏳ Pendente teste real no Foundry (level-up wizard, scale values, active effects)

### Sistema de Lembretes do GM (v0.4.0)
- ✅ Código completo na branch `claude/gm-reminder-notifications-zVBDp` (commit `fd4caf8`)
- ✅ `ReminderManager` (carrossel + drag + persist), `ReminderListConfig` (ApplicationV2), CSS e template Handlebars
- ✅ 5 settings + 1 menu registrados em `main.js`
- ⏳ Aguardando merge em `main` → workflow publica v0.4.0 automaticamente
- ⏳ Aguardando teste real no Foundry

### Blocker compartilhado
- ⚠️ **Repositório está privado** → o botão Update do Foundry recebe 404
  - Usuário aprovou tornar o repo **público**; passos passados a ele
  - Depois disso, reinstala no Foundry via manifest URL → atualizações futuras funcionam normalmente

---

## Objetivo

Adicionar uma classe homebrew completa de D&D 5e (1–20) ao módulo, num **compêndio do tipo Item**, com **automação total** via:
- `Advancement` (ItemGrant, ItemChoice, Subclass, ScaleValue, Trait, HitPoints, AbilityScoreImprovement)
- `Activities` do dnd5e 5.x (save, attack, utility, damage)
- `ActiveEffects` para resistências, voo, bônus de atributo, buffs com duração, etc.
- Compatível com **Midi-QOL** (instalado na mesa do usuário)

A classe deve "parecer oficial" — integrada com level-up wizard, starting equipment, save DC automático (8 + PB + CHA), scale values acessíveis via `@scale.<id>.<key>`.

### Fonte do conteúdo
Hurricane Knight (5e Class) — D&D Wiki (GNU FDL 1.3). O texto integral foi colado pelo usuário e está fielmente reproduzido nos documentos. Subclasses: **Steel Wind Warrior** e **Storm Knight**.

### Decisões tomadas com o usuário
1. **Wind Armor** → +PB de AC por 1 round via Active Effect; nota indicando que Midi-QOL pode refinar para ranged-only.
2. **Hurricane Strike** → standalone Action; sistema não consegue forçar "consome 1 ataque do Attack action".
3. **Defensive Gust** → "floating step speed" interpretado como velocidade de movimento atual do personagem.
4. **Wind Body** → spell `investiture of wind` incluído no texto da feature (não está no SRD do dnd5e).
5. **Thunder Blast** → modifica Air Blast (3ª activity Attack adicionada) **e** existe como feat descritivo separado.
6. **Build** → roda no **GitHub Actions** (não local), via `@foundryvtt/foundryvtt-cli`.
7. **dnd5e target**: 5.3.x (Foundry v13, regras 2014).
8. **Idioma**: inglês original.
9. **Visibilidade do repo**: público (aprovado em sessão; usuário ainda precisa aplicar).

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

**Storm Knight Features (7):**
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

### Active Effects embarcados (8)
- `aefWindArmACBst1` — Wind Armor (on-use, +PB AC, 1 round; disabled+transfer=false na activity)
- `aefFloatingStep1` — Floating Step (passivo; Midi flags advantage str-save / escape-grapple)
- `aefAirBubblePass` — Air Bubble (passivo; resistance thunder)
- `aefFlightPassive` — Flight (passivo; upgrade fly = 60 ft)
- `aefWindWalkerPas` — Wind Walker (passivo; dex +4 / dex.max 24 / Midi flags advantage dex-check + grants disadvantage attack.opportunity)
- `aefWhirlWardBuff` — Whirlwind Ward (on-use, resistance b/p/s + bypass mgc, 1 round)
- `aefResistLightng` — Resistance: Lightning (passivo)
- `aefResistThundrr` — Resistance: Thunder (passivo)

---

## Sistema de Lembretes do GM (v0.4.0)

Carrossel cíclico de mensagens em pop-up no estilo post-it, visíveis apenas para o GM. Cada card aparece a cada X segundos, some sozinho após Y segundos (ambos configuráveis), pode ser arrastado (posição salva por usuário) e fechado manualmente via botão `×`. Lista de mensagens gerenciada por janela dedicada acessível via configurações do módulo.

### Decisões tomadas com o usuário
1. **Edição da lista**: janela dedicada (ApplicationV2 + HandlebarsApplicationMixin), não textarea bruta.
2. **Posicionamento**: card arrastável; última posição salva em client setting por usuário.
3. **Ordem**: sequencial cíclica (após a última mensagem, volta à primeira).
4. **Extras incluídos**: botão `×` de fechar manual + toggle global on/off.
5. **Extras descartados**: hotkey, pausa em combate, som de notificação.
6. **Idioma**: PT-BR literal inline (consistente com `main.js` atual; sem pasta `lang/`).
7. **Unidades**: segundos para X e Y (defaults: X=600s, Y=10s).

### Arquivos da feature
- `scripts/reminders.js` — classe `ReminderManager` (singleton). Métodos públicos: `init`, `start`, `stop`, `refresh`, `dismissCurrent`, `handleSettingChange`, `isActive`. Estado em campos privados (`#currentIndex`, `#intervalTimerId`, `#durationTimerId`, `#currentElement`, `#messages`, `#dragState`).
- `scripts/reminders-config.js` — classe `ReminderListConfig` (ApplicationV2 + HandlebarsApplicationMixin). Sistema `actions` do V2 com `addMessage` / `removeMessage`. Estado de rascunho em `#draftMessages` preservado entre re-renders via `#syncFromDOM()`.
- `styles/reminders.css` — visual post-it (amarelo `#fff7a8`, rotação `-1.2deg`, sombra, fade in/out animado) + estilos da janela de gerenciamento.
- `templates/reminders-config.hbs` — template Handlebars. Botão "Adicionar mensagem" + iteração `{{#each messages}}` + footer "Salvar". Pré-carregado via `loadTemplates` no hook `init`.

### Settings registradas (em `main.js` hook `init`)
| Key | Scope | Tipo | Default | Restricted | Config UI |
|---|---|---|---|---|---|
| `reminder-enabled` | world | Boolean | `false` | true | true |
| `reminder-interval-seconds` | world | Number | `600` | true | true |
| `reminder-duration-seconds` | world | Number | `10` | true | true |
| `reminder-messages` | world | Array `{id, text}` | `[]` | true | false |
| `reminder-position` | client | Object `{x, y}` | `{x:20, y:80}` | false | false |

E um `registerMenu`: `reminder-list-menu` → `ReminderListConfig`, label "Gerenciar Lembretes", `restricted: true`. Cada setting tem `onChange` que roteia para `ReminderManager.instance?.handleSettingChange(key)`.

### Comportamento do ciclo
- `start()` agenda primeiro post-it após X seg (não imediato — mais previsível).
- `showNext()` renderiza `messages[index]`, agenda `dismissCurrent` em Y seg, incrementa índice com `% length`.
- `dismissCurrent()` limpa timer de duração, inicia animação de saída via classe `.mmr-postit-leaving` (com `animationend` listener), e agenda próximo `scheduleNext` em X seg.
- `refresh()` chamado quando settings mudam → `stop()` + `start()` se `isActive()`.
- `isActive()` = `game.user.isGM && enabled && messages.length > 0`. Esta combinação restringe ao GM em runtime; settings `restricted: true` restringem em UI.
- Reset de `currentIndex` para `% length` quando a lista encolhe (evita OOB).

### Render do post-it
- Injetado direto em `document.body` via `document.createElement` (não Application). Mais leve e dá liberdade de posicionamento.
- Texto da mensagem via `.textContent` (não `innerHTML`) — evita XSS.
- `z-index: 100` — acima do canvas/HUD, abaixo de `.window-app` (9999+). Proposital, para não cobrir character sheet.
- Drag implementado com pointer events nativos (`pointerdown` / `pointermove` / `pointerup` + `setPointerCapture`). **Não** usa `foundry.utils.Draggable` (acoplado a Applications).
- `#clampToViewport` garante que o card não fique off-screen após resize da janela.

### Como aparece para o jogador
- Nenhum post-it é renderizado (gate `game.user.isGM` no `init` e em `isActive`).
- Settings `restricted: true` ficam invisíveis na UI de configurações para não-GMs.
- Menu "Gerenciar Lembretes" também `restricted: true`.

---

## Infraestrutura de release (atualizada após v0.4.0)

### Arquivos da pipeline
- `module.json` — campos `manifest` e `download` apontam para `releases/latest/download/...`. Sistema mínimo dnd5e 5.0.0, verified 5.3.2.
- `package.json` — devDep `@foundryvtt/foundryvtt-cli`, scripts `build:packs` / `clean:packs`.
- `tools/build-packs.mjs` — lê `module.json`, itera `packs`, compila cada `_source/*.json` em LevelDB no próprio dir do pack.
- `.github/workflows/release.yml` — triggers: `push.tags: v*`, `push.branches: main`, `workflow_dispatch`.
  - Lê versão do `module.json` quando o trigger não é tag.
  - Checa se a tag já existe (idempotência); pula se sim.
  - `softprops/action-gh-release@v2` cria a tag automaticamente via `tag_name`.
  - Sobe **dois assets**: `meu-modulo-rpg.zip` e `module.json`.
- `.gitignore` — ignora LevelDB (`*.ldb`, `*.log`, `*.sst`, `CURRENT`, `LOCK`, `MANIFEST*`) sob `packs/*/`.
- `release.sh` — fluxo gráfico legacy via zenity; ainda funciona mas não é mais a única forma (push em main já dispara o workflow).

### Como fazer uma release (fluxo recomendado, daqui pra frente)
1. Mexer no que precisa, em qualquer branch.
2. Bumpar `version` no `module.json`.
3. Mergear em `main`.
4. Pronto — workflow detecta versão nova, compila o LevelDB, cria tag `vX.Y.Z` e a release com os 2 assets.
   - Se a tag já existir, o workflow pula sem erro.

### IDs do que está publicado
- Última release publicada: **v0.3.1** (fix de ícones, 2026-05-12)
- Em branch aguardando merge: **v0.4.0** (sistema de lembretes do GM) na branch `claude/gm-reminder-notifications-zVBDp`
- URLs públicas (só funcionam quando o repo for público):
  - Manifest: `https://github.com/Samuel-S-Gomes/little-details-foundry/releases/latest/download/module.json`
  - Download: `https://github.com/Samuel-S-Gomes/little-details-foundry/releases/latest/download/meu-modulo-rpg.zip`

---

## Issue ativo

### Repositório privado → Foundry recebe 404
- O Foundry faz request HTTP **não autenticado** para a manifest URL.
- GitHub retorna **404** para qualquer asset de repo privado consultado sem credenciais.
- Sintoma: erro "No module manifest found at https://..." no Foundry.

**Resolução (passou-se ao usuário):**
1. Settings → General → Danger Zone → Change repository visibility → Make public.
2. No Foundry: desinstalar `meu-modulo-rpg` atual → Install Module → colar manifest URL → Install.
3. A partir dessa reinstalação, o `manifest` fica gravado e o botão Update funciona em todas as futuras releases.

A instalação atual do usuário (v0.2.1) foi feita manualmente (zip baixado pelo navegador logado), e o `module.json` daquele zip não tinha `manifest`, então o "Check for Updates" sempre falharia até a reinstalação.

---

## Pendências

- ⏳ Usuário tornar o repo público.
- ⏳ Reinstalar o módulo via manifest URL.
- ⏳ Mergear branch `claude/gm-reminder-notifications-zVBDp` em `main` → workflow publica v0.4.0.
- ⏳ Testar a classe Hurricane Knight dentro do Foundry (level-up wizard, scale values em activities, active effects passivos, escolha de subclasse, escolha de resistência no Storm Knight em L3 + L14).
- ⏳ Testar o sistema de lembretes do GM (ativar, ver post-it aparecer/sumir, arrastar, reload preservar posição, dispensar manual, gerenciar lista, isolamento de jogador).
- ⏳ Ajustes que possam ser necessários após os testes reais.

---

## Convenções técnicas (referência rápida)

### Compêndio (Hurricane Knight)
- IDs Foundry: exatamente 16 chars alfanuméricos `[A-Za-z0-9]`. Sem hífens, sem underscores.
- `_key` no JSON-source:
  - Items: `!items!<id>`
  - Folders: `!folders!<id>`
  - **Embedded effects: `!items.effects!<itemId>.<effectId>`** (esquecer disso é a causa do `LEVEL_INVALID_KEY`)
- UUID de referência cross-compêndio dentro do mesmo módulo:
  `Compendium.meu-modulo-rpg.hurricane-knight.Item.<feature-id>`
- Activities em `system.activities` como objeto chaveado por id (não array).
- Item-level uses em `system.uses` (max + recovery array). Activities consomem via `consumption.targets: [{type: "itemUses", value: "1"}]`.
- Save DC: usar `save.dc = { calculation: "cha", formula: "" }` — o sistema calcula 8 + PB + mod CHA sozinho (mais limpo que `calculation: ""` + `formula: "..."`).
- Active Effect change modes: 0=CUSTOM, 1=MULTIPLY, 2=ADD, 3=DOWNGRADE, 4=UPGRADE, 5=OVERRIDE.
- `transfer: true` em AE = aplica automaticamente ao ator quando o item é equipado/adquirido.
- `transfer: false` + `disabled: true` em AE + activity tem `effects: [{ _id }]` = aplica via activity ao usar.

### Scripts/UI (sistema de lembretes e features futuras)
- `module.json` carrega tudo via `esmodules` (não `scripts`); o entry é `scripts/main.js`.
- `MODULE_ID` é exportado de `scripts/reminders.js` e importado em `main.js` / `reminders-config.js` — fonte única.
- Settings registradas no hook `init`, não `ready` (Foundry exige settings antes de `ready`).
- `game.settings.register` com `restricted: true` esconde da UI para não-GMs; combinar com gate `game.user.isGM` em runtime para defesa em camadas.
- Para gating de funcionalidades GM-only em hooks, sempre `if (!game.user.isGM) return;` no topo do callback.
- ApplicationV2: usar `foundry.applications.api.ApplicationV2` + `HandlebarsApplicationMixin`. Handlers de UI declarados via `static DEFAULT_OPTIONS.actions = { actionName: ... }` e atributos `data-action="actionName"` no template HBS. Métodos podem ser static — V2 chama com `this` ligado à instância.
- Templates HBS pré-carregados via `loadTemplates(['modules/meu-modulo-rpg/templates/...'])` no `init`.
- Texto vindo do usuário → sempre `element.textContent = ...`, nunca `innerHTML`, para evitar XSS.
- Drag em DOM solto → pointer events nativos (`pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`); não usar `foundry.utils.Draggable` (acoplado a `Application`).
- Comentários PT-BR só quando o porquê não é óbvio. Strings de UI inline em PT-BR (sem pasta `lang/` por enquanto).

---

## Histórico de sessões

### 2026-05-12 — implementação completa
- Pesquisa, planejamento e perguntas-chave esclarecidas com o usuário.
- 30 documentos JSON criados em `packs/hurricane-knight/_source/`.
- Build local validado (`npm run build:packs`) → 42 keys no LevelDB (4 folders + 30 items + 8 effects).
- Bug encontrado e corrigido: embedded effects exigem `_key` explícito (`!items.effects!<itemId>.<effectId>`).
- Commit + push na branch `claude/foundry-new-feature-WCcV6`.

### 2026-05-12 — release v0.3.0
- Adicionado campo `manifest` no `module.json`.
- Workflow atualizado: 3 triggers, idempotência, sobe `module.json` como asset.
- Sandbox bloqueou push direto para `main` e push de tags; resolvido via PR + merge pelo GitHub MCP API.
- PR #1 mergeado em main, sha `13b8cdd`; workflow rodou e publicou v0.3.0.
- Erro "no manifest URL" no Foundry → diagnóstico: repo é privado, GitHub retorna 404 para clientes anônimos.
- Usuário aprovou tornar o repo público.

### 2026-05-13 — sistema de lembretes do GM (v0.4.0 em branch)
- Pesquisa do código existente (apenas alerta de combate em `main.js`, sem settings, sem CSS, sem i18n).
- Perguntas-chave alinhadas com o usuário: janela dedicada para edição da lista, drag com persist por usuário, ordem sequencial cíclica, extras = botão fechar + toggle global.
- Plano final escrito em `/root/.claude/plans/preciso-criar-uma-funcionalidade-valiant-fern.md`.
- Implementação:
  - `scripts/reminders.js` (ReminderManager singleton com ciclo, timers, drag, fade in/out).
  - `scripts/reminders-config.js` (ReminderListConfig — ApplicationV2 + HandlebarsApplicationMixin).
  - `styles/reminders.css` (post-it amarelo + janela de gerenciamento).
  - `templates/reminders-config.hbs` (template Handlebars).
  - `scripts/main.js` modificado (5 settings + 1 menu + hook ready instanciando o manager).
  - `module.json` bumpado para `0.4.0` + campo `styles`.
  - `CHANGELOG.md` com entrada `[0.4.0]`.
- Sintaxe validada com `node --check`.
- Commit `fd4caf8` na branch `claude/gm-reminder-notifications-zVBDp`; push feito.
- PR ainda **não criado** — aguardando confirmação do usuário antes de abrir.
