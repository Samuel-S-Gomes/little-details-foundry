#!/bin/bash
# =============================================================================
#  release.sh — Publicador gráfico do módulo
#  Não edite este arquivo manualmente.
# =============================================================================

# Garante que o script roda sempre na própria pasta
cd "$(dirname "$0")"

# ── Lê a versão atual do module.json ─────────────────────────────────────────
current=$(grep '"version"' module.json | sed 's/.*"version": "\(.*\)".*/\1/')
IFS='.' read -r major minor patch <<< "$current"

# Sugere a próxima versão (incrementa o patch automaticamente)
next_version="$major.$minor.$((patch + 1))"

# ── Janela: confirma ou edita a versão ───────────────────────────────────────
version=$(zenity --entry \
  --title="Publicar Módulo RPG" \
  --text="Versão atual: $current\n\nNova versão:" \
  --entry-text="$next_version" \
  --width=340)

# Usuário fechou ou cancelou
if [ $? -ne 0 ] || [ -z "$version" ]; then
  exit 0
fi

# Valida formato semântico (ex: 0.2.0)
if ! echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  zenity --error \
    --title="Formato inválido" \
    --text="Use o formato: MAJOR.MINOR.PATCH\nExemplo: 0.2.0" \
    --width=300
  exit 1
fi

# ── Confirmação final ─────────────────────────────────────────────────────────
zenity --question \
  --title="Confirmar publicação" \
  --text="Publicar versão v$version no GitHub?\n\nO Foundry poderá atualizar o módulo automaticamente." \
  --ok-label="Publicar" \
  --cancel-label="Cancelar" \
  --width=360

if [ $? -ne 0 ]; then
  exit 0
fi

# ── Executa o processo de release ────────────────────────────────────────────
(
  echo "10"
  echo "# Atualizando module.json..."
  sed -i "s/\"version\": \".*\"/\"version\": \"$version\"/" module.json
  sleep 0.5

  echo "30"
  echo "# Preparando commit..."
  git add .
  git commit -m "release: v$version"
  sleep 0.5

  echo "60"
  echo "# Criando tag v$version..."
  git tag "v$version"
  sleep 0.5

  echo "80"
  echo "# Enviando para o GitHub..."
  git push 2>&1
  git push --tags 2>&1
  sleep 0.5

  echo "100"
  echo "# Concluido!"

) | zenity --progress \
  --title="Publicando v$version..." \
  --text="Iniciando..." \
  --percentage=0 \
  --auto-close \
  --width=380

# ── Resultado ─────────────────────────────────────────────────────────────────
if [ $? -eq 0 ]; then
  zenity --info \
    --title="Modulo publicado!" \
    --text="Versao v$version enviada com sucesso!\n\nO GitHub Actions vai gerar o release em instantes.\nNo Foundry, clique em Update para atualizar." \
    --width=380
else
  zenity --error \
    --title="Erro ao publicar" \
    --text="Algo deu errado durante o envio.\nVerifique sua conexao e tente novamente." \
    --width=340
fi
