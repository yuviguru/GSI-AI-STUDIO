#!/usr/bin/env bash
# Register Telegram webhooks against a LOCAL tunneled dev server.
#
# Usage:
#   1. Start `npx netlify dev --live` in another terminal; copy the Live server URL.
#   2. TUNNEL_URL=https://gsi-ai-studio-abc123.netlify.live \
#        bash scripts/register-telegram-webhooks-local.sh
#
# The tunnel URL changes every time you restart `netlify dev --live`, so
# re-run this script after each restart (or pass --unset to clear webhooks
# before the tunnel dies to avoid Telegram hitting a dead URL).

set -euo pipefail

# ─── Load .env.local ─────────────────────────────────────────────────────────
if [[ -f .env.local ]]; then
  # Shell-safe env parse: only KEY=VALUE lines, skip comments.
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^[A-Z_]+=' .env.local | sed 's/^\([A-Z_]*\)=\(.*\)$/\1=\2/')
  set +a
fi

TUNNEL_URL="${TUNNEL_URL:-}"
if [[ -z "$TUNNEL_URL" ]]; then
  echo "ERROR: Pass TUNNEL_URL (your netlify dev --live URL)."
  echo "  Example: TUNNEL_URL=https://gsi-ai-studio-abc123.netlify.live bash $0"
  exit 1
fi
TUNNEL_URL="${TUNNEL_URL%/}"

unset_webhook() {
  local name="$1" token="$2"
  echo -n "  $name: unsetting webhook… "
  curl -sS "https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true" | sed 's/.*"ok":\([a-z]*\).*/\1/'
}

set_webhook() {
  local name="$1" token="$2" secret="$3" path="$4"
  local url="${TUNNEL_URL}${path}"
  echo "  $name: registering $url"
  local args=( -F "url=${url}" -F "allowed_updates=[\"message\",\"callback_query\"]" )
  if [[ -n "$secret" ]]; then
    args+=( -F "secret_token=${secret}" )
  fi
  local resp
  resp=$(curl -sS "https://api.telegram.org/bot${token}/setWebhook" "${args[@]}")
  if echo "$resp" | grep -q '"ok":true'; then
    echo "    OK"
  else
    echo "    FAILED: $resp"
  fi
}

if [[ "${1:-}" == "--unset" ]]; then
  echo "Clearing webhooks on Telegram (useful before shutting down tunnel)…"
  [[ -n "${TELEGRAM_BOT_TOKEN_CEO:-}" ]]    && unset_webhook "CEO   " "$TELEGRAM_BOT_TOKEN_CEO"
  [[ -n "${TELEGRAM_BOT_TOKEN_STUDIO:-}" ]] && unset_webhook "STUDIO" "$TELEGRAM_BOT_TOKEN_STUDIO"
  exit 0
fi

echo "Registering Telegram webhooks against $TUNNEL_URL"
if [[ -n "${TELEGRAM_BOT_TOKEN_CEO:-}" ]]; then
  set_webhook "CEO   " \
    "$TELEGRAM_BOT_TOKEN_CEO" \
    "${TELEGRAM_WEBHOOK_SECRET_CEO:-}" \
    "/.netlify/functions/telegram-webhook-ceo"
else
  echo "  CEO   : TELEGRAM_BOT_TOKEN_CEO not set — skipping"
fi

if [[ -n "${TELEGRAM_BOT_TOKEN_STUDIO:-}" ]]; then
  set_webhook "STUDIO" \
    "$TELEGRAM_BOT_TOKEN_STUDIO" \
    "${TELEGRAM_WEBHOOK_SECRET_STUDIO:-}" \
    "/.netlify/functions/telegram-webhook-studio"
else
  echo "  STUDIO: TELEGRAM_BOT_TOKEN_STUDIO not set — skipping"
fi

echo ""
echo "Done. Message @YourStudioBot or @YourCeoBot on Telegram and send /start."
echo "Watch the netlify dev terminal for incoming webhook logs."
echo ""
echo "When you stop the dev server, run: bash $0 --unset"
echo "to tell Telegram to stop POSTing to a dead tunnel."
