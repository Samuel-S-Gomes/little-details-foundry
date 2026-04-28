# Meu Módulo RPG

Módulo pessoal para **FoundryVTT v13** com **D&D 5e**, contendo um conjunto crescente de funções utilitárias para uso nas minhas mesas de RPG.

---

## 📋 Requisitos

| Dependência | Versão mínima |
|---|---|
| FoundryVTT | 13 |
| Sistema D&D 5e | 3.0.0 |

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

## 📁 Estrutura do projeto

```
meu-modulo-rpg/
├── .github/
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── scripts/
│   └── main.js
├── .gitignore
├── CHANGELOG.md
├── LICENSE
├── README.md
└── module.json
```

---

## 📝 Changelog

Veja [CHANGELOG.md](CHANGELOG.md) para o histórico de versões.

---

## 📄 Licença

[MIT](LICENSE)
