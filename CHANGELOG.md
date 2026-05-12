# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

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
