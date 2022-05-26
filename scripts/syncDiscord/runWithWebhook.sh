cd "$(dirname "${BASH_SOURCE[0]}")"
../discord.sh --webhook-url="$DISCORD_LOG_WEBHOOK" --text="$(node . | jq -Rs . | cut -c 2- | rev | cut -c 2- | rev)"