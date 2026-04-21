#!/usr/bin/env bash
# One-shot Netlify env var setup for GSI AI Studio prod.
#
# Usage:
#   1. Fill in the placeholders below (or export them from a local secrets file).
#   2. Run `npx netlify login` and `npx netlify link` first.
#   3. Run this script: bash scripts/setup-netlify-env.sh
#
# Safe to re-run — `netlify env:set` is idempotent.
# Each secret is written with scope=production to keep deploy-previews clean.

set -euo pipefail

# ─── Fill in before running ──────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN_STUDIO="${TELEGRAM_BOT_TOKEN_STUDIO:-REPLACE_ME}"
TELEGRAM_BOT_TOKEN_CEO="${TELEGRAM_BOT_TOKEN_CEO:-REPLACE_ME}"
TELEGRAM_WEBHOOK_SECRET_STUDIO="${TELEGRAM_WEBHOOK_SECRET_STUDIO:-$(openssl rand -hex 32)}"
TELEGRAM_WEBHOOK_SECRET_CEO="${TELEGRAM_WEBHOOK_SECRET_CEO:-$(openssl rand -hex 32)}"
BOT_SETUP_SECRET="${BOT_SETUP_SECRET:-$(openssl rand -hex 32)}"
PEXELS_API_KEY="${PEXELS_API_KEY:-REPLACE_ME}"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="${NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:-REPLACE_ME}"
# Optional — leave empty to rely on HF anonymous rate limits
HF_API_TOKEN="${HF_API_TOKEN:-}"

# ─── Static value ────────────────────────────────────────────────────────────
IMAGE_MODE="hybrid"

# ─── Sanity check ────────────────────────────────────────────────────────────
for var in TELEGRAM_BOT_TOKEN_STUDIO TELEGRAM_BOT_TOKEN_CEO PEXELS_API_KEY NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; do
  if [[ "${!var}" == "REPLACE_ME" ]]; then
    echo "ERROR: $var is still REPLACE_ME. Edit this script or export it, then re-run."
    exit 1
  fi
done

# ─── Set each var (prod scope) ───────────────────────────────────────────────
# Using --context production scopes these to the prod site build only.
set_env() {
  local key="$1" val="$2"
  if [[ -z "$val" ]]; then
    echo "  skip  $key (empty)"
    return
  fi
  npx netlify env:set "$key" "$val" --context production >/dev/null
  echo "  set   $key"
}

echo "Setting Netlify env vars (production scope)…"
set_env TELEGRAM_BOT_TOKEN_STUDIO "$TELEGRAM_BOT_TOKEN_STUDIO"
set_env TELEGRAM_BOT_TOKEN_CEO "$TELEGRAM_BOT_TOKEN_CEO"
set_env TELEGRAM_WEBHOOK_SECRET_STUDIO "$TELEGRAM_WEBHOOK_SECRET_STUDIO"
set_env TELEGRAM_WEBHOOK_SECRET_CEO "$TELEGRAM_WEBHOOK_SECRET_CEO"
set_env BOT_SETUP_SECRET "$BOT_SETUP_SECRET"
set_env PEXELS_API_KEY "$PEXELS_API_KEY"
set_env NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID "$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"
set_env IMAGE_MODE "$IMAGE_MODE"
set_env HF_API_TOKEN "$HF_API_TOKEN"

echo ""
echo "Done. Generated secrets (save these somewhere safe — you will need them):"
echo "  BOT_SETUP_SECRET              = $BOT_SETUP_SECRET"
echo "  TELEGRAM_WEBHOOK_SECRET_STUDIO = $TELEGRAM_WEBHOOK_SECRET_STUDIO"
echo "  TELEGRAM_WEBHOOK_SECRET_CEO   = $TELEGRAM_WEBHOOK_SECRET_CEO"
echo ""
echo "Next: trigger a Netlify deploy so the new env vars take effect."
echo "Then run scripts/register-telegram-webhooks.sh"
