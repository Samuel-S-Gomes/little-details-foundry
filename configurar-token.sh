#!/bin/bash
# =============================================================================
#  configurar-token.sh — Configuração inicial do token GitHub
#  Execute este script UMA VEZ antes de usar o "Publicar Módulo"
# =============================================================================
cd "$(dirname "$0")"

zenity --info \
  --title="Configuração Inicial" \
  --text="Para publicar no GitHub sem precisar digitar senha,\nvocê precisa cadastrar seu Token de acesso.\n\nEle será salvo localmente e nunca enviado ao GitHub." \
  --width=400

token=$(zenity --entry \
  --title="Token do GitHub" \
  --text="Cole aqui seu Token (Personal Access Token):\n\n<small>GitHub → Settings → Developer settings → Personal access tokens</small>" \
  --hide-text \
  --width=440)

if [ $? -ne 0 ] || [ -z "$token" ]; then
  exit 0
fi

# Salva o token localmente com permissão restrita
echo "$token" > .token
chmod 600 .token

zenity --info \
  --title="✅ Configurado!" \
  --text="Token salvo com sucesso!\n\nAgora você pode usar o <b>Publicar Módulo</b> normalmente." \
  --width=340
