# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [0.8.1] — 2026-10-29

### Alterado — Hurricane Knight (revisão no VTT)
- **Thunder Blast** saiu do Air Blast e virou activity do próprio item Thunder Blast (só o Storm Knight recebe). Ataque à distância (classificação "arma"), dano relâmpago **ou** trovão escolhido no diálogo de dano.
- **Thunder Blast** ganhou a activity **Hurricane Strike (Lightning)**: a opção de relâmpago só existe para o Storm Knight.
- **Storm Heart**: dano extra com escolha relâmpago/trovão no diálogo de dano.
- **Floating Step**: efeito Midi-QOL removido; a feature é só informativa.
- **Wind Armor**: o efeito não mexe mais na CA. Vira marcador no token até o início do próximo turno (DAE `turnStart`; 1 rodada/6 s de reserva).
- **Defensive Gust**: move até a distância do Gale Step (era "floating step speed", erro de digitação do original). Novo scale value `@scale.hurricane-knight.gale-step-distance` (20/30/40/50/60 ft nos níveis 3/5/9/13/17), mostrado no texto do Gale Step e do Defensive Gust.
- **Wind Body**: texto da magia removido; link para *Investiture of Wind* do compêndio Magia (`coisas-dnd`).

### Corrigido
- Valores de escala no texto das features (`@scale...`) apareciam crus; agora usam `[[lookup ...]]` e mostram o valor atual quando o item está numa ficha.
- IDs de activity do Air Blast com 15 caracteres (o Foundry exige 16).
- Erros de texto: "lighting" → "lightning", "were" → "where", concordâncias e frases quebradas (Floating Step, Gale Step, Whirlwind Ward, Rage Tornado, Electrify etc.). Knight Order agora cita os níveis reais da subclasse (6, 11, 14).

---

## [0.8.0] — 2026-10-22

### Adicionado
- Feature **Telhado à luz da tocha**: o telhado de um prédio, visto de fora, aparece só até onde a luz que o token carrega (tocha, lanterna) ou a visão no escuro alcança — e inteiro de dia (luz global da cena). Resolve o telhado sumindo na névoa porque as paredes cortam a linha de visão, sem o "Reveals Fog of War" do Better Roofs revelar o telhado inteiro no escuro.
  - Só age quando o token enxerga algum pedaço do prédio, está abaixo do telhado e o telhado não está esmaecido (token embaixo dele).
  - Nova opção **"Telhado à luz da tocha"** na aba Sobreposição da configuração do tile (liga por telhado).
  - Nova setting **"Telhado à luz da tocha"** (world, restrita ao GM, ligada por padrão) para desligar tudo.
  - Por cliente: recorte na máscara de visão + luz virtual local (sem paredes, sem cor) para o telhado não ficar escuro. Luzes do cenário não entram no recorte.

---

## [0.7.0] — 2026-10-14

### Adicionado
- Feature **Esconder clima abaixo do chão**: some com as partículas do FXMaster (neve, chuva...) na tela de quem está vendo um andar com elevação negativa — token selecionado, andar do widget do Levels (GM) ou token do próprio jogador. Decisão local por cliente; atualiza ao selecionar token, mudar elevação ou trocar de andar no Levels.
  - Nova setting **"Esconder clima abaixo do chão"** (world, restrita ao GM, ligada por padrão).

---

## [0.6.0] — 2026-10-03

### Adicionado
- Feature **Ocultar elevação dos tokens**: esconde o número de elevação (ex.: `-10 ft`) que o Foundry desenha acima dos tokens.
  - Nova setting **"Ocultar elevação dos tokens"** (world, restrita ao GM, ligada por padrão) para ligar/desligar.
  - Novo menu **"Quem vê a elevação"** com uma checkbox por usuário (nome, papel e status de conexão). Por padrão só o GM vê.
  - Mudanças valem na hora para todos os clientes conectados, sem recarregar.

 — 2026-06-23

### Corrigido
- **Recapitulador não era consumido** após a rolagem (o efeito permanecia no ator). A causa: o consumo dependia de casar o estado da checkbox entre dois hooks via um `Set` de UUIDs, frágil em alguns fluxos. Agora a intenção de consumo é gravada **no próprio objeto de configuração da rolagem** (compartilhado entre `dnd5e.buildRollConfig` e `dnd5e.postRollConfiguration`), garantindo que o efeito seja deletado exatamente quando a rolagem é confirmada com a checkbox marcada.
- **Checkbox agora é injetada dentro do `<form>`** do diálogo (via `app.form`), garantindo que entre no `FormData` e dispare a reconstrução da rolagem — sem isso, o `+2` podia não ser aplicado.
- **Ícone do Recapitulador agora aparece no token.** O Active Effect ganhou `statuses`, tornando-o "temporário" aos olhos do Foundry, que então desenha o ícone sobre o token (como o Arcane Armor).

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
