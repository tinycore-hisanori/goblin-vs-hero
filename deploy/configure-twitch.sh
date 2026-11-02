#!/usr/bin/env bash
set -euo pipefail
if [[ $(id -u) != 0 ]]; then echo 'Run as root.' >&2; exit 1; fi
systemctl cat goblin-vs-hero.service >/dev/null
echo 'Twitch Client Secretを入力してください（非表示。チャットには貼らないでください）。'
read -r -s -p 'Client Secret: ' twitch_secret
printf '\n'
if [[ ! "$twitch_secret" =~ ^[A-Za-z0-9_-]{20,200}$ ]]; then echo 'Secret format is invalid.' >&2; exit 1; fi
umask 077
install -d -m 700 /etc/goblin-vs-hero
printf 'TWITCH_CLIENT_ID=avws7n9v1a3akiyqoy5uwwrvrv5m6q\nTWITCH_CLIENT_SECRET=%s\n' "$twitch_secret" > /etc/goblin-vs-hero/twitch.env
unset twitch_secret
chmod 600 /etc/goblin-vs-hero/twitch.env
install -d -m 755 /etc/systemd/system/goblin-vs-hero.service.d
printf '[Service]\nEnvironmentFile=/etc/goblin-vs-hero/twitch.env\n' > /etc/systemd/system/goblin-vs-hero.service.d/twitch.conf
systemctl daemon-reload
systemctl restart goblin-vs-hero
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:8788/api/twitch/status | /opt/goblin-vs-hero/runtime/bin/node --input-type=module -e 'let s="";for await(const c of process.stdin)s+=c;if(!JSON.parse(s).enabled)process.exit(1)'; then
    echo 'Twitchアプリ設定が有効になりました。固定部屋を作り「自分のTwitchと連携」を押してください。'
    exit 0
  fi
  sleep 1
done
echo 'Service verification failed. Check: systemctl status goblin-vs-hero --no-pager' >&2
exit 1
