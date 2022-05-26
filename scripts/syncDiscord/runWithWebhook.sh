#!/bin/bash

cd "$(dirname "$0")"
curl -i -H "Accept: application/json" -H "Content-Type:application/json" -X POST --data "{\"content\": \"$(node scripts/syncDiscord | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev)\"}" $DISCORD_LOG_WEBHOOK
