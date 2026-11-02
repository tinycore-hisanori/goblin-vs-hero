# Goblins vs Hero (ゴブリンたち vs 勇者)

**An asymmetric party dungeon game for Twitch.** The streamer raids a goblin nest in first person, and viewers join as goblins from their phone or PC, with no install and no Twitch login. Everyone else in chat changes the game by voting `1` / `2` / `3`.

Built for the **Codex x TwitchCon Hackathon** with OpenAI Codex. Version 0.1.6.

- Live: <https://goblin-vs-hero.kitakuarcade.com/party.html>
- Full game specification (Japanese): [`docs/game-specification.md`](docs/game-specification.md)
- How it was built with Codex: [`docs/codex-development-log.md`](docs/codex-development-log.md)

## How it plays

| Role | Who | Goal |
|---|---|---|
| Hero | Streamer (PC, FPS view) | Roll 3 tools, pull the vault lever, grab the treasure and **get back to the entrance alive** within 4 minutes |
| Goblins | Up to 5 viewers (phone or PC, third-person view) + AI fill-ins | Stop the hero: chase, throw stones, use goblin-only tunnels, train and **evolve** (Goblin → Hobgoblin → King → Lord) |
| Chat | Everyone else on Twitch | 20-second vote: `1` Darkness / `2` Noise (lure AI goblins) / `3` Snacks (heal goblins) |

Viewers join by scanning a QR code or entering a 6-digit room code. Rooms can keep the streamer as the permanent hero or rotate the hero every round.

## Run locally

Requires Node.js 22.12+.

```sh
npm install
npm run dev          # http://localhost:5173/party.html
```

- Hero: open `party.html`, create a room and start (Chrome/Edge recommended; Pointer Lock is required).
- Goblin: open the same URL in another browser, an incognito window or a phone on the same LAN, and join with the room code or QR.
- Solo: `index.html?solo=1` (AI goblins only).

Production build and tests:

```sh
npm run build
npm start                                            # node server/production.js
node --test --test-timeout=20000 scripts/*.test.mjs  # 84 tests (run after build)
```

### Twitch chat voting (optional)

Create a Twitch application and set `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` and the public URL on the server (see [`deploy/TWITCH-ja.md`](deploy/TWITCH-ja.md)). Each streamer then clicks 「自分のTwitchと連携」 (Connect my Twitch) in their room and authorizes `user:read:chat`. Votes are read via EventSub WebSocket and scoped per room. No secrets are stored in this repository.

## Deploy to a public server (Cloudflare → nginx → Node)

The live instance runs this way. Full step-by-step notes (Japanese) are in [`deploy/README-ja.md`](deploy/README-ja.md). Replace `goblin-vs-hero.kitakuarcade.com` with your own domain.

```
Browser ──HTTPS──▶ Cloudflare (proxy ON) ──HTTPS──▶ nginx :443 ──▶ Node 127.0.0.1:8788
                                                     (WebSocket upgrade for /party and /lobby)
```

1. **Build a package** locally with `npm run build`, then copy `dist/`, `server/`, `deploy/`, `package.json` and `package-lock.json` to `/opt/goblin-vs-hero` on a Linux x86_64 server.
2. **Install the service.** Run `sudo bash deploy/install.sh`. It downloads an official Node 24 runtime (SHA256-verified) into `runtime/` without touching the system Node, creates a `goblin-game` system user, runs `npm ci --omit=dev` and starts the systemd service `goblin-vs-hero` on `127.0.0.1:8788`. Set `PUBLIC_ORIGIN` in [`deploy/goblin-vs-hero.service`](deploy/goblin-vs-hero.service) to your URL (it is used for QR invitations).
3. **Check it internally:**
   ```bash
   curl -f http://127.0.0.1:8788/healthz
   /opt/goblin-vs-hero/runtime/bin/node deploy/smoke.mjs http://127.0.0.1:8788
   ```
4. **Cloudflare.** Add a DNS record for your subdomain with the proxy ON (orange cloud) and SSL mode "Full (strict)". Create a Cloudflare Origin Certificate and save it on the server, for example as `/etc/ssl/cloudflare/cert.pem` and `key.pem`. WebSockets work through Cloudflare by default.
5. **nginx.** Install [`deploy/nginx-goblin-vs-hero.conf`](deploy/nginx-goblin-vs-hero.conf) into `sites-available`, link it into `sites-enabled`, then run `nginx -t && systemctl reload nginx`. The config proxies `/party` and `/lobby` with `Upgrade`/`Connection` headers for WebSockets and everything else as plain HTTP.
6. **Verify publicly:** `node deploy/smoke.mjs https://your.domain`
7. **Twitch (optional).** Edit the Client ID in `deploy/configure-twitch.sh` to your Twitch app, then run `sudo bash deploy/configure-twitch.sh`. It prompts for the secret and writes `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` to `/etc/goblin-vs-hero/twitch.env` (outside the repository). Register `https://your.domain/auth/twitch/callback` as the OAuth redirect URL. See [`deploy/TWITCH-ja.md`](deploy/TWITCH-ja.md).

**Updates:** `node deploy/update.mjs /opt/goblin-vs-hero-latest.tar.gz` stages the new version, smoke-tests it on a spare port, backs up code and `data/`, switches over and rolls back automatically if the post-switch check fails.

## Architecture

- `server/` is a Node.js lobby, matchmaking and WebSocket relay, plus Twitch OAuth and EventSub (`twitch.js`, `twitch-chat.js`).
- The hero's browser runs the authoritative simulation (`src/main.js`, `src/local-session.js`) at about 10 Hz state broadcast. Goblin clients send input at about 20 Hz.
- Three.js 3D with rigged GLB models (`public/models/`). Character models were generated with Meshy from concept art in `assets/concepts/`.
- `deploy/` holds nginx, systemd and a safe update script with staging, backup and rollback.

---

# Development notes (historical, Japanese/English mixed)

> The notes below were written during development and may describe earlier milestones. The current behavior is documented in `docs/game-specification.md`.

# Goblin Getaway

PC browser 3D dungeon escape party game. Current milestone: local FPS treasure expedition versus AI goblins. Twitch authentication, viewer command UI, growth and goblin chat are planned and not yet implemented.

## Run

Node.js 22.12+ or 24 recommended.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. First-person view: click the scene to capture the mouse, Esc releases it. WASD or arrow keys move relative to the view; double-tap a movement direction within 280 ms and hold it to sprint; Shift sneaks, mouse looks, left-click attacks. Play requires pointer lock. If an embedded browser blocks it, use Chrome or Edge at the same local URL. The game pauses while unlocked. Left mouse down attacks immediately; holding repeats on cooldown. Space is no longer assigned to attack. Roll three starting tools, enter the nest, find its treasure chest and return to the starting entrance within seven minutes. The translucent automap records explored areas and always marks the entrance; treasure is marked only after discovery. Restart using the on-screen button.

```sh
npm run build
```

Character models supplied by the project owner via Meshy. Source files are preserved in Downloads; project copies are in public/models. No API keys are needed for this local milestone. No adult content.

## Next milestones

- Verify model animation deformation, attack timing and camera visibility in actual play.
- Tune maze navigation and balance. AI uses grid paths including low goblin-only wall tunnels. Hero collision blocks these tunnels; attacks cannot pass through walls.
- Add viewer command page and authoritative multiplayer server, with AI fallback.
- Add growth, proximity canned goblin speech and Twitch identity.
- Add idle, damage and death animations. FPS uses a procedural sword; the full hero GLB is retained for a future spectator view. Current stopped goblin locomotion uses its last pose.

## Viewpoint agreement

## Temporary burrow sealing

Aim at a nearby low tunnel and press E to seal it with sand for 30 seconds. Sealing has a 5-second cooldown; occupied entrances cannot be sealed and an existing seal cannot be refreshed. AI goblins follow routes that may include sealed tunnels, stop at the entrance and dig every 0.45 seconds. A seal takes 24 hits (roughly 10–11 seconds for one goblin) to remove; several goblins can help. Sand and the aimed tunnel hint show the seal and remaining durability. Timers and digging pause with the game; restart clears seals. The viewer attack button will use the same digging rules when the viewer control screen is implemented.
Hero: first-person. Viewer goblin: overhead view with destination and tactic commands; not yet connected. Melee follows the current horizontal and vertical camera direction during a 0.26-second swing, once per target per swing. Non-graphic gold/white impact sparks and a hit marker indicate a successful hit.

## Expedition and recovery (current rules)
- Start at the nest entrance; collect the deepest reachable treasure and return to the same entrance. Seven-minute limit.
- Maximum HP 150; base goblin hit 5, 1.1-second shared damage immunity. Respawn delay 22 seconds.
- Starting roulette: one healing item, one utility, one combat item. Use slots with 1/2/3; passive gear is automatically equipped. No duplicate items.
- Potion: 60 HP, three charges; cannot consume at full HP. Recovery ring: 1.5 HP/sec during active play. Soul Eater: 18 HP per goblin kill, automatically equipped and indicated by a glowing blade. All recovery is capped at maximum HP.
- Utility: flash bomb (nearby visible goblins stunned six seconds), speed boots (12 seconds). Combat: protection charm (12 seconds half damage), whetstone (15 seconds double attack). Two charges each.
- Four concealed low passages and four climbable wall connections supplement normal burrows. Goblins animate up and across climbable walls; hero collision blocks both passage types. Hidden passages appear as walls on the hero map.
- Automap reveals nearby line-of-sight cells, retains explored areas, and never reveals live enemy positions or undiscovered treasure. Pausing stops all gameplay timers and recovery.
- Verification: build, hero treasure round trip, goblin-only collision, guaranteed healing roulette, recovery values and HP cap passed. Browser roulette UI verified. Embedded browser refused pointer lock; full FPS playtest remains for Chrome/Edge.

## Weapons
Q switches between sword and pistol. Left mouse attacks/fires; holding repeats on cooldown. R reloads the pistol. Pistol: six-round magazine, 36 reserve rounds, 1.6-second reload, 18-unit range, two damage, 0.28-second firing interval. The closest unobstructed aimed goblin is hit; walls block shots. Muzzle flash, recoil, tracer and impact sparks are provided. Reloading advances only during active gameplay. Sword remains usable when ammunition runs out. Soul Eater healing and whetstone damage apply to sword attacks only. Item shortcuts remain 1/2/3.

## Stealth and goblin awareness
Hold Shift to sneak (lower eye height, 1.15 movement speed, no ordinary footstep event). Hero collision still prevents using goblin-only tunnels. Guards idle and patrol near their spawn, detect a visible hero within their forward field of view, investigate heard sounds, chase the last seen position, search briefly, and return to their post. Suspicion uses ? and confirmed detection uses ! overhead. Standing detection range is 7.5 units; sneaking reduces it to 4.5 and slows recognition. At extremely close range guards can notice a hero behind them. Walls block sight. Ordinary footsteps carry 2.5 route units, running 7, sword swings 3, and gunshots 20. Hearing uses dungeon route distance. Picking up treasure does not grant enemies global knowledge. Damaging a guard alerts that guard. Gameplay pause freezes awareness, patrol and noise timers.

Verification: AI tests cover no tracking through walls, patrol departure, front detection, reduced sneak range, rear approach, sound range, lost-target memory and damage alerts. Full in-browser FPS playtest remains dependent on a browser permitting pointer lock.

Sprint ends when its direction is released, Shift is pressed, or input is cleared on pause/blur/restart. Keyboard auto-repeat and holding two aliases of one direction do not trigger double-tap sprint.

Starting loadout rerolls: the first spin starts one real-time 30-second window. The reroll button redraws all three slots without extending the deadline. A spin accepted before the deadline may finish afterward. Starting exploration confirms the equipment immediately; pausing cannot reopen selection. On expiry the latest equipment is retained, and the player clicks Start explicitly (no automatic pointer lock). A new expedition resets the selection window.

## Authored goblin nest (replaces generated maze)
The current map is a handcrafted 25×25 grid: entrance porch, firelit guard room, pantry, sleeping quarters, stolen-goods workshop, bone hall and treasury. Corridors are narrower than rooms. Barrels, shelves, sacks, straw beds, workbenches, scrap, firepit and loot piles provide room identities; large furniture occupies blocked navigation cells. Wood doorway frames and room signs orient the player. Room names appear on entry and on explored map areas.

The treasury door starts closed. Visit the workshop and press E near its lever to open it; collect the treasure and return to the entrance. Goblin-only hidden tunnels, low passages and climbable connections remain usable. Gate state, treasure, mapping, enemy patrols and supplies reset on a new expedition. Tests verify workshop reachability, locked hero treasury access, goblin bypasses, all shortcut endpoints, unobstructed spawns, and hero round-trip access after operating the gate.

## Jumping and pressure traps
Space jumps while grounded, with gravity and no mid-air repeat jumps. Eye height follows jump height. Bone and scrap piles (0.3 units) can be crossed and stood on while airborne; stepping off drops back to the floor. Tall furniture, walls and goblin-only passages remain blocked. Landing makes a small noise even while sneaking. Three pressure plates in the bone hall warn for 0.7 seconds, raise spikes for 0.45 seconds and reset after three seconds. Warning plates glow orange; jump above 0.6 units during the active phase or go around the plates to avoid damage. A grounded trigger and a hit are different checks, so a plate triggered earlier can still hit a late jumper. Trap timers pause with gameplay. Automated checks cover jump/landing and collision, trap transitions and objective reachability; actual FPS timing needs a supporting-browser playtest.

## Visual interface
The preparation screen uses a dark olive/aged-gold style, a goblin character backdrop, three illustrated equipment cards and staggered reel stops. Item glyphs are local SVG; the backdrop reuses the project's generated concept image. No remote fonts, image services or external UI libraries are needed. The original 30-second reroll/confirmation rules are retained. Inventory uses matching icons; vitality has a responsive bar and low-health color, with mission/timer/map/weapon information placed around the edge of the view. Control instructions are collapsed into the menu guide. Responsive layouts were checked at 375px, 756px and 1280px. Reduced-motion preferences suppress reel/landing CSS animation.

## Goblin ambient motion
Idle goblins restore their skeleton bind pose instead of pausing a running frame. Procedural breathing, head glances and body scanning keep them alive between patrols; body rotation changes the actual vision facing. Patrol uses the existing Walking clip and three nearby waypoints plus home, while chase uses Running. Route replans retain the current waypoint to avoid cutting tile corners. Respawn restores the pose and patrol state. A 60-second no-player simulation verified that all eight spawn guards leave their post and travel; a synthetic skeleton test verified idle motion, clip switching and reset. Seated/stand-up animation assets are not yet supplied or integrated.

## Goblin Lord model
`public/models/goblin-lord.glb` is the creator-supplied Meshy dark-knight Lord (28 joints, 22,151 triangles, one material). Clips: Running (0.633 s), Walking (1.033 s), Sit_Cross_Legged_on_Floor (2.5 s). The sitting clip is a seated loop, not a stand-to-sit transition; no stand-up clip is included. Model metadata is in `public/models/goblin-lord.metadata.json`. A development preview is available at `/character-preview.html` with orbit controls and animation selection. The model is imported for viewer evolution; it is not yet spawned or integrated into evolution gameplay.

Hob Goblin: creator-supplied GLB imported as `public/models/hob-goblin.glb` (28 bones, 21,600 triangles). Running 0.633s, Walking 1.033s, and a generated-ID clip lasting 2.967s. The third clip moves the hips from standing to seated height, so preview playback uses LoopOnce and holds the end pose rather than repeatedly snapping back to standing. `/character-preview.html?model=hob` previews it, with a clearly labeled reverse-playback stand action. It is not yet connected to evolution gameplay.
Reroll UI: the reroll button is always visible and explicitly states initial/rolling/expired/confirmed status instead of disappearing or fading out. It is enabled after the first draw within the original 30-second window.

Goblin King: creator-supplied GLB imported as `public/models/goblin-king.glb` (28 bones, 21,248 triangles, one material). It includes Walking (1.033s) and Running (0.633s), with no sitting clip. `/character-preview.html?model=king` previews it; sitting controls are hidden for this character. Hob, King and Lord can be selected in the shared development preview. Evolution gameplay remains pending.

Training room: an eighth authored room now connects the entrance and pantry wings. Equipment includes a wooden dummy, weights, hanging bag, bench and training mat. Three station approach cells are exported for future viewer training commands. Geometry/collision and reachability are implemented; training XP and persistent rewards are still proposals in `docs/progression-proposal.md`.

## Local viewer progression (implemented)

1. Open the hero game and click `ゴブリン育成テスト` in its preparation menu. This starts a local test round with random hero equipment and opens `goblin.html` with a temporary room ID.
2. Enter a nickname and join. Click the overhead map to move, choose training equipment, or select a goblin to hunt. The hero tab must remain open.
3. Training awards 6 round EXP after four uninterrupted seconds plus a two-second rest. Killing another goblin awards 18 EXP; the same victim grants XP at most once per 60 seconds. Unsealing a blocked hole grants 8 EXP with duplicate-credit protection.
4. Evolve voluntarily at 30/90/180 total round EXP: Goblin → Hob → King → Lord. Actual supplied GLB models, height, maximum HP, damage, speed and shortcut permissions change. Evolution preserves the current HP fraction. Normal goblins use holes/climbs; Hob uses climbs only; King/Lord use neither. Death preserves round growth and respawns a viewer after eight seconds. New rounds reset strength/EXP.
5. Career merit, achievement counts, highest evolution and the selected title/scarf color persist in the host browser's localStorage under the local nickname-derived profile ID. Career credit is limited to 60 per round; excess round EXP still advances evolution. Cosmetic rewards never add combat stats. Browser storage is local to this PC and origin, is not a secure identity, and is not Twitch/cloud persistence.

The local connection uses BroadcastChannel and works between tabs of the same browser profile on the same PC. It is not network multiplayer or Twitch integration. In this explicit local test mode, the goblin simulation continues when pointer lock is released so commands from another tab can run; the unoperated hero is protected and the escape timer stops. Once the hero captures the mouse, combat and the timer run normally. The hero test toolbar can reset a round or stop the local test. The ordinary solo mode retains pause-on-unlock. The test mode keeps up simulation in a background tab, subject to browser throttling. Full remote Twitch-authorized play remains pending.

Automated progression/session checks: `node --test scripts/progression.test.mjs`.

## LANでのテスト（2026-10-28）

Twitchアカウント不要。勇者のPCで `npm run dev` を実行し、勇者画面の「LANテスト開始」を選ぶ。同じLAN・Wi-Fi上の別PC・タブレットで、勇者画面に表示された `http://<勇者のIPv4>:5173/goblin.html` を開き、6桁の部屋コードと名前で参加する。ゴブリンは最大6人。現時点の接続先は http://192.168.1.15:5173/goblin.html （IPは環境により変わる）。PCでは勇者、タブレットでは指示型ゴブリンとして操作できる。

接続方式はWebSocket。勇者のブラウザがゲームを計算するので、勇者タブと開発サーバーを開いたままにする。勇者画面の再読み込みで部屋コードが変わる。勇者未操作中のテストではHP保護・時間停止。累計報酬は勇者側ブラウザに保存、参加者の識別子は各端末のブラウザに保存される。ブラウザ・接続元URLを変えると別参加者として扱われる場合がある。

別端末から開けない場合は、同じネットワークか、ゲストWi-Fiの端末間通信制限がないかを確認。Windowsファイアウォールの許可画面が出たら、自宅等の信頼できるプライベートネットワークに限定してNode.jsを許可する。ルーターのポート開放は不要。これはLANテスト向けで、インターネット公開用の認証・Twitch連携・60秒の準備ロビーはまだ含まない。

確認：`npm run build`、`node --test scripts/progression.test.mjs scripts/party-relay.test.mjs`。別WebSocket接続間の入室・操作・同期、接続IDの固定、無効コード拒否、勇者切断をテスト。実物の別端末からの接続は未確認。

### 洞穴の変化
新しい試合ごとに通路の迂回パターンと12箇所の罠を抽選する。部屋の配置は固定。棘（茶色）は予兆の後に発動しジャンプで回避可能、毒胞子（緑）は距離を取って回避、鳴子（黄色）はゴブリンを音で呼ぶ。探索済み自動マップは維持。LANでは勇者の地形を参加者に同期する。検証：`node --test scripts/cave.test.mjs scripts/progression.test.mjs scripts/party-relay.test.mjs`。

### 勇者の宝物庫と道具店
準備画面の「宝物庫と道具店」で収集・購入・抽選候補を管理。生還は60金貨＋12種類のお宝のいずれか。重複は追加25金貨。失敗時は発見記録のみ保持。3/6/9種類の展示で、投げ石袋（100金貨）/変装セット（160金貨）/身代わり人形（220金貨）の購入権が開く。薬草包帯は80金貨で初期から購入可能。購入した道具のチェックを外せば追加抽選候補から除外でき、基本道具と回復枠保証は維持。記録は勇者の同じURL・ブラウザに保存される（127.0.0.1とLAN IPは別保存）。チェックや購入は抽選開始前または終了後に行う。

追加道具：包帯25回復×4、投げ石でAIの注意をそらす×4、変装15秒×2（走行・攻撃・AIへの接近で解除）、身代わり人形10秒×2（付近のAIを誘導。視聴者の判断は拘束しない）。確認：`node --test scripts/hero-career.test.mjs scripts/cave.test.mjs scripts/progression.test.mjs scripts/party-relay.test.mjs`。

### 子ゴブリンの復活
視聴者は死亡10秒後、鍛錬場でHP3・小さな子ゴブリンとして復活。20秒後に死亡前から1段階下（通常は通常）へ成長し、経験値はその段階の開始値へ戻る。累計功績は維持。子ども中は同族から保護され、自分からの同族狩り・訓練・進化も禁止。移動・穴掘り（経験値なし）・弱い勇者攻撃は可能で、勇者には倒される。子ども中に再死亡しても成長予定の段階は保持。専用のゆりかご部屋は未実装。

### LANの参加者ID
表示名と役割に依存しない、ブラウザ保存のランダム端末IDを使用。名前を変えても同じ部屋の個体・経験値・功績は継続する。勇者の金貨・宝物庫はこのIDに紐づけて同じブラウザに保存。既存記録は引き継ぐ。ハードウェアIDではないため、別ブラウザ・別URL（localhost／127.0.0.1／LAN IP）・データ消去では別IDになる。ゴブリン功績は現状ホストのブラウザに保存され、ホスト変更時の自動同期はない。

## 現在の入口：6人パーティロビー
`http://<LANサーバーのIP>:5173/party.html`（トップからも移動）。部屋を作り、同じ集合番号で参加。最大6人で、勇者1人・残りはゴブリン。勇者を辞退可能。管理役の「勇者を抽選して準備へ」で勇者回数が少ない立候補者から抽選し、終了後は同じ部屋で次を抽選。管理役と勇者は別役割。各ラウンド4分、勇者の出発で時間開始。ゴブリンはAIを置き換える。1人テストと `/index.html?solo=1` も使用可能。

ゴブリンの操作方式：Auto指示／直接操作。直接はWASD・矢印・画面のタッチボタン。Spaceで勇者攻撃、Fで選択した同族攻撃。作戦ボタンを選ぶとAutoに切り替わる。子ゴブリン保護は共通。累計功績はLANサーバーの `data/goblin-careers.json` に保存され、勇者交代時も引き継ぐ。ファイルはGit管理外で、サーバーのPCを変える場合はこのファイルの移行が必要。

現時点では集合ロビーがサーバー管理、ゲーム計算はラウンドの勇者ブラウザ。勇者が退出するとそのラウンドを中断する。実機6台の性能テスト・スマホ実機テストは未実施。WindowsファイアウォールのLAN向け許可は別途必要。

## 入口の更新：ランダム／固定メンバー
現在のトップは2つの入口。ランダム参加では同じLANサーバー内のランダム部屋へ自動で振り分け、2人で20秒待機、3人以上で残り最大5秒へ短縮して勇者を抽選する。最大6人で、満員の場合は新しい部屋に振り分ける。固定部屋には自動参加しない。

固定参加ではプライベート部屋を作成するか、6桁番号で入る。管理役はラウンドの合間に「ラウンドごとに交代」または「指定した人が毎回勇者」を保存できる。固定勇者が退出・辞退した場合は再指定するまで開始できない。

どちらも途中参加可能。試合中に合流した人はゴブリンになり、次の試合から勇者候補に入る。人数上限は共通で6人。途中参加者もAIを置き換える。ランダム側は1人だけでは開始せず2人を待つ。1人でのテストはヘッダーの「1人で探索」から行う。これはLAN内マッチングであり、インターネット公開サーバーは未提供。

確認：`node --test scripts/matchmaking.test.mjs scripts/lobby.test.mjs`。

### 固定部屋のスマホ招待QR
固定部屋で「スマホを招待（QRコード）」、試合中は上部の「招待QR」を押す。QRには `http://<LAN IP>:5173/party.html?room=<6桁番号>` が入る。同じWi-Fiのスマホで読み取ると、固定部屋の番号が入力済みの参加画面になる。複数ネットワークのPCではダイアログから接続先を選べる。QR生成は端末内で完結し外部APIは使わない。WindowsのLAN向け受信許可は引き続き必要。確認：`node --test scripts/party-invite.test.mjs`。

### スマホの直接操作
「直接操作」を選ぶと、マップ左下の仮想スティックで移動し、右下の半透明ボタンで勇者へ攻撃できる。小さい「同族」ボタンは選択した相手を攻撃する。スティックは倒す量で速度が変わり、指を離すと停止する。移動と攻撃の同時タッチに対応。PCのWASD操作は維持。確認：`node --test scripts/touch-controls.test.mjs`。

### ゴブリンの標準視点
現在は直接操作＋ゴブリンの斜め後ろ上方からの3D追従視点が標準。画面ドラッグで視点を回転でき、移動方向はカメラの向きに対応する。地図は右上の補助表示で、必要なときだけ「地図を広げる」。Autoを選んでも3Dで自分の動きを観察できる。周辺の壁は見やすい高さにカット表示される（実際の通行判定は勇者側と共通）。

### 接続断とAuto操作の更新
一時的な切断は90秒間参加枠を保持し、同じ端末IDで自動復帰する。Auto指示は維持し、直接操作の押しっぱなし入力は停止する。明示的な「退出」は即時退室。ゴブリン側のページ再読み込みも同じ試合内なら進化・EXPを引き継ぐ。勇者側の完全な再読み込みは計算状態を失うため集合へ戻す。開発サーバー自体を再起動した場合の試合復元はできない。

Auto指示の取りこぼし・同じマス内での停止・封鎖穴での停止を修正。到達できない場合は状態を表示する。通し確認の成功範囲と未確認事項は `docs/integration-check-2026-10-29.md` を参照。

### 2026-10-31 ロビー・ゴブリンHUD・投石
待機中は2Dの焚き火広場をクリック／タップ／WASDで移動。他の参加者にも移動が同期し、部屋内チャットと定型文が吹き出しに出る。チャットは100文字・30件・送信間隔800ms、部屋間を分離。参加者の位置と会話は短時間の再接続で維持。
ゴブリン画面は3Dを主画面にし、進化／作戦／報酬を下のタブで開く。HP・EXPを常時表示。視点ボタンで追従／近め／俯瞰、左右45度回転、背後へ戻す。Vキーでも視点変更。
技②は投石。2またはE、スマホは投石ボタン。5秒CD、射程9、弾速7。通常攻撃とは独立。前方、または選択対象へ投げる。壁で停止し、回避可能。ゴブリンに2ダメージ＋0.35秒ひるみ、勇者に6ダメージ。子ゴブリンの同族保護は維持。試合リセットで弾とCDもリセット。
