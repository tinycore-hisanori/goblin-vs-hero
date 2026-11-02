#!/usr/bin/env bash
set -euo pipefail
cd /opt/goblin-vs-hero
if [ "${1:-}" = --update ]; then
    [ -n "${2:-}" ] || { echo 'Usage: bash deploy/install.sh --update /opt/package.tar.gz'; exit 1; }
    exec /opt/goblin-vs-hero/runtime/bin/node /opt/goblin-vs-hero/deploy/update.mjs "$2"
fi
[ "$(id -u)" = 0 ] || { echo 'Run with sudo bash deploy/install.sh'; exit 1; }
[ "$(uname -m)" = x86_64 ] || { echo 'This package targets Linux x86_64'; exit 1; }
for tool in curl tar sha256sum xz runuser; do command -v "$tool" >/dev/null || { echo "Missing command: $tool"; exit 1; }; done
[ -f dist/party.html ] && [ -f server/production.js ] || { echo 'Incomplete package'; exit 1; }
if ss -lntH 'sport = :8788' | grep -q .; then echo 'Port 8788 is already in use. Nothing changed.'; exit 1; fi
if [ -e /etc/systemd/system/goblin-vs-hero.service ]; then echo 'Service already exists. Use the update procedure, not initial installation.'; exit 1; fi
# A private runtime; never modify /usr/bin/node or the existing game.
if [ ! -x runtime/bin/node ]; then
    mkdir -p runtime
    curl --fail --silent --show-error --location https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o runtime/SHASUMS256.txt
    archive=$(awk '$2 ~ /^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ {print $2}' runtime/SHASUMS256.txt)
    [[ "$archive" =~ ^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$ ]] || { echo 'Could not identify official Node 24 archive'; exit 1; }
    curl --fail --silent --show-error --location "https://nodejs.org/dist/latest-v24.x/$archive" -o "runtime/$archive"
    (cd runtime; awk -v file="$archive" '$2==file' SHASUMS256.txt | sha256sum -c -)
    tar -xJf "runtime/$archive" -C runtime --strip-components=1
fi
runtime/bin/node -e 'if(process.versions.node.split(".")[0]!=="24")process.exit(1)'
id goblin-game >/dev/null 2>&1 || useradd --system --home-dir /opt/goblin-vs-hero --shell /usr/sbin/nologin goblin-game
mkdir -p data .npm-cache
chown goblin-game:goblin-game . data .npm-cache
# Only the dependency installation directory and data need write access.
mkdir -p node_modules
chown -R goblin-game:goblin-game node_modules
runuser -u goblin-game -- env PATH="/opt/goblin-vs-hero/runtime/bin:$PATH" npm ci --omit=dev --ignore-scripts --cache /opt/goblin-vs-hero/.npm-cache
install -m 644 deploy/goblin-vs-hero.service /etc/systemd/system/goblin-vs-hero.service
systemctl daemon-reload
systemctl enable --now goblin-vs-hero
curl --fail --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1:8788/healthz
printf '\nGame is running on 127.0.0.1:8788. Nginx has NOT been changed.\n'
