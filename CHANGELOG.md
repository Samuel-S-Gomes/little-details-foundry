# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [0.5.0] — 2026-06-23

### Adicionado
- Feature **Recapitulador**: um Active Effect que concede **+2 de uso único** a qualquer rolagem do dnd5e.
  - Enquanto o ator tem o efeito, toda rolagem abre o modal padrão com uma checkbox extra **"Usar Recapitulador (+2)"**.
  - Marcar a checkbox e confirmar a rolagem soma o `+2` na fórmula e **consome o efeito** (deleta automaticamente). Marcar/desmarcar sem rolar, ou fechar o modal, não consome nada.
  - Funciona para o **GM e todos os jogadores**, cada um na própria rolagem — os hooks são carregados via esmodule em todos os clientes.
  - Nova setting **"Ativar Recapitulador"** (world, restrita ao GM) para ligar/desligar a feature.
  - API do módulo (`game.modules.get('meu-modulo-rpg').api`) com `apply`, `remove`, `toggle`, `applyToSelected`, `toggleSelected` para uso via macro.

### Corrigido
- Legibilidade da janela **"Gerenciar Lembretes"**: o texto das mensagens e dos botões ficava claro sobre fundo claro (invisível) quando o Foundry aplicava tema escuro à janela. Agora a janela usa fundo de pergaminho com texto escuro explícito.

---

## [0.4.1] — 2026-05-15

### Corrigido
- Erro ao abrir o menu **"Gerenciar Lembretes"**: `Template part "form" must render a single HTML element`. O template `templates/reminders-config.hbs` tinha `<header>`, `<section>` e `<footer>` como irmãos no topo, mas o `ApplicationV2 + HandlebarsApplicationMixin` do Foundry v13 exige que cada part renderize um único elemento raiz. Tudo foi envolvido em um `<div class="mmr-reminders-root">`; CSS não precisou ser ajustado (seletores já são descendentes de `#mmr-reminders-config`).

---

## [0.4.0] — 2026-05-13

### Adicionado
- Sistema de **lembretes em pop-up para o GM** (estilo post-it):
  - Carrossel cíclico de mensagens visíveis apenas para o GM.
  - Cada post-it aparece a cada `X` segundos e some sozinho após `Y` segundos (ambos configuráveis).
  - Botão `×` no canto do card para dispensar manualmente sem esperar o tempo.
  - Card arrastável com posição salva por usuário (client setting).
- Janela dedicada **"Gerenciar Lembretes"** acessível pelas configurações do módulo:
  - Adicionar, editar e remover mensagens individualmente.
  - Mensagens vazias são descartadas automaticamente ao salvar.
- Toggle global **"Ativar lembretes do GM"** nas settings para ligar/desligar todo o sistema.

### Infraestrutura
- Primeira UI configurável do módulo: ApplicationV2 + HandlebarsApplicationMixin (Foundry v13).
- `module.json` agora declara `styles/reminders.css`.
- Novo template Handlebars em `templates/reminders-config.hbs`.

---

## [0.3.1] — 2026-05-12

### Corrigido
- Ícones das features da Hurricane Knight: paths apontavam para arquivos inexistentes na biblioteca core do Foundry, exibindo o fallback. Substituídos por paths confirmados (cruzados com `spell-icon-migration.json` do dnd5e e fontes oficiais do compêndio do sistema).

---

## [0.3.0] — 2026-05-12

### Adicionado
- Compêndio `Hurricane Knight` (Item) com a classe homebrew completa de D&D 5e (1–20):
  - Classe `Hurricane Knight` com 24 advancements (hit die d10, proficiências, skill choice, item grants, 5 ASIs, slot de subclass no 3, 3 scale values).
  - Subclasses `Steel Wind Warrior` e `Storm Knight` com suas próprias progressões.
  - 27 features (15 da classe + 12 de subclasses) com activities, scale values e active effects.
  - Starting equipment configurado para o wizard de criação.
  - Compatibilidade com Midi-QOL para integrações de vantagem/desvantagem.

### Infraestrutura
- Pipeline de build dos compêndios via `@foundryvtt/foundryvtt-cli` (`tools/build-packs.mjs`).
- Workflow `release.yml` agora compila o LevelDB no GitHub Actions antes de empacotar o `.zip`.
- `.gitignore` ignora os artefatos LevelDB; versionamos apenas os JSON-fonte.
- `module.json` declara o pack `hurricane-knight` e bump de compatibilidade do dnd5e para 5.0.0+ (verificado em 5.3.2).

---

## [0.1.0] — 2026-04-27

### Adicionado
- Alerta ao GM quando personagem com item vigiado equipado sofre dano (`Item.0otYDkF02RnuX8Gy`)
- Pop-up exclusivo ao GM exibindo nome do personagem e variação de HP
