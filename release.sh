#!/bin/bash
# =============================================================================
#  release.sh — Publicador gráfico do módulo
# =============================================================================
cd "$(dirname "$0")"

# ── Verifica se o token existe ────────────────────────────────────────────────
TOKEN=$(cat .token 2>/dev/null)
if [ -z "$TOKEN" ]; then
  zenity --error \
    --title="Token não configurado" \
    --text="Você precisa configurar seu token do GitHub primeiro.\n\nClique duas vezes em <b>Configurar Token</b> e siga as instruções." \
    --width=380
  exit 1
fi

# ── Lê a versão atual do module.json ─────────────────────────────────────────
current=$(grep '"version"' module.json | sed 's/.*"version": "\(.*\)".*/\1/')
IFS='.' read -r major minor patch <<< "$current"
next_version="$major.$minor.$((patch + 1))"

# ── Janela: confirma ou edita a versão ───────────────────────────────────────
version=$(zenity --entry \
  --title="Publicar Módulo RPG" \
  --text="Versão atual: <b>$current</b>\n\nNova versão:" \
  --entry-text="$next_version" \
  --width=340)

if [ $? -ne 0 ] || [ -z "$version" ]; then exit 0; fi

if ! echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  zenity --error \
    --title="Formato inválido" \
    --text="Use o formato: <b>MAJOR.MINOR.PATCH</b>\nExemplo: 0.2.0" \
    --width=300
  exit 1
fi

# ── Confirmação final ─────────────────────────────────────────────────────────
zenity --question \
  --title="Confirmar publicação" \
  --text="Publicar versão <b>v$version</b> no GitHub?\n\nO Foundry poderá atualizar o módulo automaticamente." \
  --ok-label="Publicar" \
  --cancel-label="Cancelar" \
  --width=360

if [ $? -ne 0 ]; then exit 0; fi

# ── Monta a URL autenticada com o token ──────────────────────────────────────
REMOTE_URL=$(git remote get-url origin)
AUTH_URL=$(echo "$REMOTE_URL" | sed "s|https://|https://$TOKEN@|")

# ── Arquivo temporário para capturar erros ───────────────────────────────────
ERRFILE=$(mktemp)

# ── Executa o processo de release ────────────────────────────────────────────
(
  echo "10"; echo "# Atualizando module.json..."
  sed -i "s/\"version\": \".*\"/\"version\": \"$version\"/" module.json
  sleep 0.4

  echo "30"; echo "# Preparando commit..."
  OUTPUT=$(git add . && git commit -m "release: v$version" 2>&1)
  if [ $? -ne 0 ]; then echo "$OUTPUT" > "$ERRFILE"; echo "100"; exit 1; fi
  sleep 0.4

  echo "55"; echo "# Criando tag v$version..."
  OUTPUT=$(git tag "v$version" 2>&1)
  if [ $? -ne 0 ]; then echo "$OUTPUT" > "$ERRFILE"; echo "100"; exit 1; fi
  sleep 0.4

  echo "75"; echo "# Enviando commits..."
  OUTPUT=$(git push "$AUTH_URL" main 2>&1)
  if [ $? -ne 0 ]; then echo "$OUTPUT" > "$ERRFILE"; echo "100"; exit 1; fi
  sleep 0.4

  echo "90"; echo "# Enviando tag..."
  OUTPUT=$(git push "$AUTH_URL" "v$version" 2>&1)
  if [ $? -ne 0 ]; then echo "$OUTPUT" > "$ERRFILE"; echo "100"; exit 1; fi
  sleep 0.3

  echo "100"; echo "# Concluído!"

) | zenity --progress \
  --title="Publicando v$version..." \
  --text="Iniciando..." \
  --percentage=0 \
  --auto-close \
  --width=400

# ── Verifica se houve erro ────────────────────────────────────────────────────
if [ -s "$ERRFILE" ]; then
  ERRO=$(cat "$ERRFILE")
  rm -f "$ERRFILE"
  zenity --error \
    --title="❌ Erro ao publicar" \
    --text="Algo deu errado:\n\n<tt>$ERRO</tt>\n\nVerifique se o token é válido ou se há conexão com a internet." \
    --width=460
else
  rm -f "$ERRFILE"
  zenity --info \
    --title="✅ Módulo publicado!" \
    --text="Versão <b>v$version</b> enviada com sucesso!\n\nO GitHub Actions vai gerar o release em instantes.\nNo Foundry, clique em <b>Update</b> para atualizar." \
    --width=380
fi
