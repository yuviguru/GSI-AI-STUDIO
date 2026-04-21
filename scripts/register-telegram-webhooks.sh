#!/usr/bin/env bash
# Registers the Telegram webhooks for both @GSIKidCeoAssistantBot and @GSIPersonalAssistantBot
# by calling the deployed /bot-setup Netlify Function.
#
# Prerequisites:
#   - setup-netlify-env.sh already ran (BOT_SETUP_SECRET set, bot tokens set)
#   - A Netlify deploy with the new env has finished (so the function has them)
#
# Usage:
#   BOT_SETUP_SECRET=... SITE_URL=https://your-site.netlify.app \
#     bash scripts/register-telegram-webhooks.sh
#
# Or just let it read from netlify env if logged in:
#   bash scripts/register-telegram-webhooks.sh

set -euo pipefail

if [[ -z "${BOT_SETUP_SECRET:-}" ]]; then
  echo "Looking up BOT_SETUP_SECRET from Netlify env…"
  BOT_SETUP_SECRET="$(npx netlify env:get BOT_SETUP_SECRET --context production 2>/dev/null | tail -1 || true)"
fi

if [[ -z "${SITE_URL:-}" ]]; then
  echo "Looking up site URL from Netlify…"
  SITE_URL="$(npx netlify api getSite 2>/dev/null | node -e 'let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{try{console.log(JSON.parse(s).ssl_url||JSON.parse(s).url)}catch{}})' || true)"
fi

if [[ -z "${BOT_SETUP_SECRET:-}" || -z "${SITE_URL:-}" ]]; then
  echo "ERROR: Could not resolve BOT_SETUP_SECRET or SITE_URL."
  echo "  Pass them explicitly: BOT_SETUP_SECRET=... SITE_URL=https://... bash $0"
  exit 1
fi

URL="${SITE_URL%/}/.netlify/functions/bot-setup?secret=${BOT_SETUP_SECRET}"

echo "POST $URL"
curl -sS -X POST "$URL" -H 'Content-Type: application/json'
echo ""
