# Meu Módulo RPG

Módulo pessoal para **FoundryVTT v13** com **D&D 5e**, contendo um conjunto crescente de funções utilitárias para uso nas minhas mesas de RPG.

---

## 📋 Requisitos

| Dependência | Versão mínima |
|---|---|
| FoundryVTT | 13 |
| Sistema D&D 5e | 5.0.0 (verificado em 5.3.2) |

---

## ⚙️ Instalação manual

1. Faça o download do `.zip` da [última release](../../releases/latest)
2. Extraia o conteúdo dentro de `Data/modules/`
3. A estrutura deve ficar: `Data/modules/meu-modulo-rpg/module.json`
4. No Foundry, vá em **Game Settings → Manage Modules** e ative o módulo

---

## ✨ Funcionalidades

### 1. Alerta de dano — Item vigiado

Quando um personagem que possui um item específico **equipado** sofre dano e tem o HP reduzido, um pop-up é exibido **exclusivamente ao GM** com a mensagem:

> ⚔️ **[Nome do personagem] foi atingido!**

O pop-up também informa os valores de HP antes e depois do dano.

**Item monitorado:** `Item.0otYDkF02RnuX8Gy`

> [!NOTE]
> O item deve ter sido arrastado do item do mundo para o inventário do personagem para que o rastreamento funcione corretamente.

---

### 2. Compêndio: Hurricane Knight (classe homebrew)

Adiciona a classe **Hurricane Knight** (1–20) ao compêndio do módulo, com automação completa via Advancements, Activities e Active Effects.

**Conteúdo do compêndio `Hurricane Knight`:**
- 1 classe — `Hurricane Knight` com 24 advancements (hit points, proficiências, skills com choice, item grants em todos os níveis-chave, 5 ASIs, slot de subclasse no 3, 3 scale values).
- 2 subclasses — `Steel Wind Warrior` e `Storm Knight`, cada uma com suas próprias item grants e scale values.
- 27 features (15 da classe + 12 das subclasses), com:
  - **Activities** prontas (save / attack / utility / damage) com DC = `8 + PB + CHA`.
  - **Scale Values** acessíveis via `@scale.hurricane-knight.*`, `@scale.steel-wind-warrior.*` e `@scale.storm-knight.*`.
  - **Active Effects** para resistências passivas (thunder, lightning), velocidade de voo (Flight), Dex +4 cap 24 (Wind Walker), buffs de 1 round (Wind Armor, Whirlwind Ward) e flags Midi-QOL (vantagem em saves de movimento, no-AoO).
  - Starting equipment configurado para o assistente do nível 1.

**Compatibilidade com Midi-QOL.** Algumas integrações (vantagem em saves específicos, supressão de AoO, dano mágico em class features) usam flags do Midi-QOL. Se você não tem o Midi-QOL, esses pontos viram lembretes no texto da feature.

**Como usar.** Habilitando o módulo, o compêndio **`Hurricane Knight`** aparece na sidebar. Arraste a classe para a ficha de personagem e o level-up wizard cuida do resto.

> [!NOTE]
> Fonte: [Hurricane Knight (5e Class) — D&D Wiki](https://www.dandwiki.com/wiki/Hurricane_Knight_(5e_Class)), sob GNU Free Documentation License 1.3.

---

### 4. Recapitulador (+2 de uso único)

Active Effect chamado **Recapitulador** que concede um bônus de **+2 de uso único** a *qualquer* rolagem do dnd5e (teste de atributo, salvaguarda, perícia, ataque, dano etc.).

**Como funciona:**
- Enquanto o ator tiver o efeito ativo, toda rolagem abre o modal padrão do Foundry com uma checkbox extra: **`Usar Recapitulador (+2)`**.
- Se a checkbox estiver **marcada quando a rolagem for confirmada**, o `+2` entra na fórmula e o **efeito é consumido (deletado) automaticamente** — é uso único.
- Marcar/desmarcar a checkbox sem rolar, ou fechar o modal, **não consome** o efeito.
- Funciona para o **GM e para todos os jogadores**, cada um na própria rolagem (a lógica é carregada via esmodule em todos os clientes).

**Ligar/desligar:** em **Game Settings → Configurar Módulos → Meu Módulo RPG**, use a checkbox **"Ativar Recapitulador"** (visível apenas ao GM).

**Aplicar o efeito (macro de 1 linha):** selecione o token e rode uma macro de script com:

```js
game.modules.get("meu-modulo-rpg").api.toggleSelected();
```

Essa macro **alterna** o efeito: aplica no token selecionado se ele ainda não tiver, e remove se já tiver. A API também expõe `apply`, `remove`, `toggle` e `applyToSelected` caso você queira comportamentos específicos.

---

## 📁 Estrutura do projeto

```
meu-modulo-rpg/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── workflows/
│       └── release.yml         ← build dos compêndios + release
├── packs/
│   └── hurricane-knight/
│       ├── _source/            ← JSON fonte de cada documento (versionado)
│       └── *.ldb / *.log ...   ← LevelDB gerado pelo build (ignorado no git)
├── scripts/
│   └── main.js
├── tools/
│   └── build-packs.mjs         ← compilador LevelDB
├── .gitignore
├── CHANGELOG.md
├── CLAUDE.md
├── LICENSE
├── README.md
├── module.json
├── package.json
└── release.sh
```

---

## 🛠️ Desenvolvimento

### Build dos compêndios

O build dos compêndios LevelDB é executado automaticamente pelo GitHub Actions ao criar a tag de release, então não há necessidade de instalar Node localmente para publicar. Se quiser rodar localmente (opcional):

```bash
npm install
npm run build:packs
```

A saída fica em `packs/<nome>/` (LevelDB binário, ignorado pelo git). As fontes JSON ficam em `packs/<nome>/_source/`.

### Fluxo de release

1. Edite o conteúdo do compêndio em `packs/hurricane-knight/_source/*.json`.
2. Execute o script gráfico (`./release.sh` ou ícone na área de trabalho).
3. O workflow `release.yml` no GitHub Actions roda o build, empacota e publica o release.

---

## 📝 Changelog

Veja [CHANGELOG.md](CHANGELOG.md) para o histórico de versões.

---

## 📄 Licença

[MIT](LICENSE)

O conteúdo da classe Hurricane Knight é redistribuído sob a [GNU Free Documentation License 1.3](https://www.gnu.org/licenses/fdl-1.3.html) (licença original da fonte na D&D Wiki).
