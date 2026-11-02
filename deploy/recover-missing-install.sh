#!/usr/bin/env bash
# Recover an accidentally removed installation without replacing its systemd/nginx settings.
set -euo pipefail
app_root=/opt/goblin-vs-hero
package=/opt/goblin-vs-hero-latest.tar.gz
unit=goblin-vs-hero.service
candidate_pid=''
stage=''
cleanup() {
  if [[ -n "$candidate_pid" ]] && kill -0 "$candidate_pid" 2>/dev/null; then
    kill "$candidate_pid" 2>/dev/null || true
    wait "$candidate_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT
[[ $(id -u) == 0 ]] || { echo 'Run as root.' >&2; exit 1; }
[[ $(uname -m) == x86_64 ]] || { echo 'Expected Linux x86_64.' >&2; exit 1; }
[[ ! -e "$app_root" && ! -L "$app_root" ]] || { echo 'Installation path exists: refusing to overwrite it. Use the normal updater.' >&2; exit 1; }
[[ -f "$package" ]] || { echo "Missing package: $package" >&2; exit 1; }
for tool in curl tar sha256sum xz runuser systemctl node; do command -v "$tool" >/dev/null || { echo "Missing tool: $tool" >&2; exit 1; }; done
[[ $(systemctl show "$unit" -p LoadState --value) == loaded ]] || { echo 'Existing service not found.' >&2; exit 1; }
[[ $(systemctl show "$unit" -p WorkingDirectory --value) == "$app_root" ]] || { echo 'Unexpected service working directory.' >&2; exit 1; }
[[ $(systemctl show "$unit" -p User --value) == goblin-game ]] || { echo 'Unexpected service user.' >&2; exit 1; }
id goblin-game >/dev/null

# Verify all archive entries before extraction, using only Node standard modules.
node --input-type=module - "$package" <<'NODE'
import {execFileSync} from 'node:child_process';
const archive=process.argv[2],names=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}),listing=execFileSync('tar',['-tvzf',archive],{encoding:'utf8'});
for(const name of names.split('\n').filter(Boolean)) {
  const p=name.replace(/^\.\//,'');
  if(p.includes('\\')||p.startsWith('/')||p.split('/').includes('..')||!['dist','server','deploy','package.json','package-lock.json'].includes(p.split('/')[0]))throw Error('Unexpected archive entry');
}
for(const line of listing.split('\n').filter(Boolean))if(!['-','d'].includes(line[0]))throw Error('Archive contains links or special files');
NODE
stage=$(mktemp -d /opt/.goblin-recovery-XXXXXX)
chmod 755 "$stage"
printf 'Preparing recovery in %s. Existing process is still running.\n' "$stage"
tar -xzf "$package" --no-same-owner --no-same-permissions -C "$stage"
for file in dist/party.html server/production.js package-lock.json deploy/smoke.mjs; do
  [[ -f "$stage/$file" ]] || { echo "Incomplete package: $file" >&2; exit 1; }
done
mkdir -p "$stage/data" "$stage/runtime" "$stage/.npm-cache" "$stage/node_modules"

# A process can sometimes still see a renamed directory or a mounted data directory.
# Copy any accessible saves before stopping it. Never claim deleted saves were recovered.
game_pid=$(systemctl show "$unit" -p MainPID --value)
saved=0
if [[ "$game_pid" =~ ^[1-9][0-9]*$ ]]; then
  for source in "/proc/$game_pid/cwd/data" "/proc/$game_pid/root$app_root/data"; do
    if [[ -d "$source" ]]; then
      cp -a "$source/." "$stage/data/"
    fi
  done
fi
if [[ -s "$stage/data/goblin-careers.json" ]]; then
  saved=1
  echo 'Copied an accessible goblin-careers.json. Original files were not modified.'
else
  echo 'No accessible server save found. Starting with empty server storage; deleted saves need a backup.'
fi

curl --fail --silent --show-error --location https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$stage/runtime/SHASUMS256.txt"
node_archive=$(awk '$2 ~ /^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ {print $2}' "$stage/runtime/SHASUMS256.txt")
[[ "$node_archive" =~ ^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$ ]] || { echo 'Unable to select official Node 24 archive.' >&2; exit 1; }
curl --fail --silent --show-error --location "https://nodejs.org/dist/latest-v24.x/$node_archive" -o "$stage/runtime/$node_archive"
(cd "$stage/runtime"; awk -v file="$node_archive" '$2==file' SHASUMS256.txt | sha256sum -c -)
tar -xJf "$stage/runtime/$node_archive" -C "$stage/runtime" --strip-components=1
"$stage/runtime/bin/node" -e 'if(process.versions.node.split(".")[0]!=="24")process.exit(1)'
chown -R goblin-game:goblin-game "$stage"
(cd "$stage"; runuser -u goblin-game -- env PATH="$stage/runtime/bin:$PATH" "$stage/runtime/bin/npm" ci --omit=dev --ignore-scripts --cache "$stage/.npm-cache")

port=$("$stage/runtime/bin/node" --input-type=module -e 'import {createServer} from "node:net";const s=createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close();});')
health() {
  local target=$1
  for attempt in {1..40}; do
    if curl -fsS --max-time 2 "http://127.0.0.1:$target/healthz" >/dev/null; then return 0; fi
    sleep 0.25
  done
  return 1
}
runuser -u goblin-game -- env HOST=127.0.0.1 PORT="$port" PUBLIC_ORIGIN=https://goblin-vs-hero.kitakuarcade.com "$stage/runtime/bin/node" "$stage/server/production.js" >"$stage/recovery-check.log" 2>&1 &
candidate_pid=$!
health "$port" || { echo "Candidate failed. Existing service was not stopped. Check $stage/recovery-check.log" >&2; exit 1; }
kill -0 "$candidate_pid"
"$stage/runtime/bin/node" "$stage/deploy/smoke.mjs" "http://127.0.0.1:$port"
cleanup
candidate_pid=''

[[ ! -e "$app_root" && ! -L "$app_root" ]] || { echo 'Installation path reappeared during recovery; stopping without overwrite.' >&2; exit 1; }
echo 'Candidate passed. Stopping this game only, restoring its directory and restarting.'
systemctl stop "$unit"
mv -T "$stage" "$app_root"
stage=''
systemctl start "$unit" || { echo 'Start failed. Files restored; inspect systemctl status goblin-vs-hero --no-pager.' >&2; exit 1; }
health 8788 || { echo 'Health check failed. Files restored; inspect service status.' >&2; exit 1; }
"$app_root/runtime/bin/node" "$app_root/deploy/smoke.mjs" http://127.0.0.1:8788
sha256sum "$package" | awk '{print $1}' > "$app_root/.deployment-sha256"
printf '\nRECOVERY OK. nginx, systemd configuration and other games were not changed.\n'
if [[ "$saved" == 0 ]]; then echo 'Server saves were not recovered. Keep any external backups for a later restore.'; fi
echo 'Next: bash /opt/goblin-vs-hero/deploy/configure-twitch.sh'
