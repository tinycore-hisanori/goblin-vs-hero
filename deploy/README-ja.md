# 公開サーバーへの初回配置

対象: goblin-vs-hero.kitakuarcade.com → nginx → 127.0.0.1:8788
既存 rumor.kitakuarcade.com / 8787、システムのNode18は変更しない。

## 1. 転送と展開
このフォルダのパッケージはビルド済みdist、server、依存関係定義、deployだけを含む。ローカルdata、node_modules、秘密情報は含まない。
`goblin-vs-hero-20261102.tar.gz`をSFTP/WinSCPなどでサーバーの `/opt/` へ転送する。

SSH先で初回だけ実行:
```bash
cd /opt
# 同名ディレクトリがあれば停止し、既存内容を確認する。
mkdir /opt/goblin-vs-hero && \
  tar -xzf /opt/goblin-vs-hero-20261102.tar.gz -C /opt/goblin-vs-hero && \
  cd /opt/goblin-vs-hero && \
  bash deploy/install.sh
```
install.shはNode24のLinux x64公式配布とSHA256を取得・照合し、アプリ専用runtimeへ展開する。既存/usr/bin/nodeは変更しない。専用ユーザーgoblin-game、systemdのgoblin-vs-heroサービスを作成する。npm ci --omit=dev --ignore-scriptsで本番依存だけ導入する。nginxはまだ変更しない。

## 2. 内部接続確認
```bash
curl -f http://127.0.0.1:8788/healthz
/opt/goblin-vs-hero/runtime/bin/node /opt/goblin-vs-hero/deploy/smoke.mjs http://127.0.0.1:8788
systemctl status goblin-vs-hero --no-pager
```
HTTP OKが4行、Game WebSocket OKとLobby WebSocket / chat OKが出れば次へ。

## 3. nginxに新規サイトだけ追加
既存証明書 /etc/ssl/cloudflare/kitaku-cert.pem は *.kitakuarcade.com を含む。CloudflareプロキシONを維持する。
```bash
# 既存ファイルがあれば上書きせず停止する。
test ! -e /etc/nginx/sites-available/goblin-vs-hero && test ! -e /etc/nginx/sites-enabled/goblin-vs-hero && install -m 644 /opt/goblin-vs-hero/deploy/nginx-goblin-vs-hero.conf /etc/nginx/sites-available/goblin-vs-hero && ln -s /etc/nginx/sites-available/goblin-vs-hero /etc/nginx/sites-enabled/goblin-vs-hero
nginx -t && systemctl reload nginx
```
nginx -tに失敗したらreloadしない。今回追加したリンクだけ `unlink /etc/nginx/sites-enabled/goblin-vs-hero` で無効化し、エラーを確認する。

## 4. 公開URLから確認
```bash
/opt/goblin-vs-hero/runtime/bin/node /opt/goblin-vs-hero/deploy/smoke.mjs https://goblin-vs-hero.kitakuarcade.com
```
PCとスマホで https://goblin-vs-hero.kitakuarcade.com を開いて、部屋作成・QR招待・移動・訓練・進化・対戦・復帰を確認する。公開招待URLはPUBLIC_ORIGINから生成し、LANアドレスを返さない。
既存の https://rumor.kitakuarcade.com も表示確認する。

## 運用
ログ: `journalctl -u goblin-vs-hero -n 80 --no-pager`
再起動: `systemctl restart goblin-vs-hero` (進行中の部屋・試合は終了する)
停止: `systemctl stop goblin-vs-hero`
永続データ: /opt/goblin-vs-hero/data (更新時も保持・バックアップする)

現時点は部屋番号とブラウザ端末IDでのテスト公開。Twitch認証・ランキングの不正対策は未実装。試合計算は勇者のブラウザで行うため、勇者の画面を閉じると継続できない。サーバーの再起動で部屋は復元されない。Node18は変更不要だが、今回のサービスは専用Node24で運用する。

## ローカルで確認済み
npm run build成功、49自動テスト成功。本番サーバー起動後にHTTP配信4項目、ゲームWebSocket、ロビー作成・チャットのsmoke成功。
Linux上のinstall.sh / systemd / nginx / Cloudflare経由は未実行。サーバー上で上記を順に確認する。

公式資料:
- https://nodejs.org/dist/latest-v24.x/
- https://nginx.org/en/docs/http/websocket.html

## 5. 更新（初回install.shの再実行とは別）

新版 `goblin-vs-hero-latest.tar.gz` と単独の `goblin-vs-hero-update.mjs` を `/opt/` に転送する。
旧パッケージにはupdate.mjsがないため、最初の更新から使えるようアップデーターも別ファイルで配布する。
稼働中の `/opt/goblin-vs-hero` にtarを直接上書き展開しない。

```bash
/opt/goblin-vs-hero/runtime/bin/node /opt/goblin-vs-hero-update.mjs /opt/goblin-vs-hero-latest.tar.gz
```
以後、同じコマンドで更新可能。新版のパッケージを同名で転送する。同一SHA256のパッケージは「already installed」と出て再起動もしない。
更新版install.shでは `bash /opt/goblin-vs-hero/deploy/install.sh --update /opt/goblin-vs-hero-latest.tar.gz` でも同じ処理。
引数なしのinstall.shは引き続き初回専用。サービスが既存なら安全に停止し、勝手に初期化しない。

処理:
1. 排他ロックとパッケージ内容検査。data/runtimeや任意のパスへの上書き、リンクを拒否。
2. 別のstageディレクトリへ展開。専用Node24を再利用して本番依存をインストール。この間は旧版が稼働。
3. ループバックの別ポートで新版を起動しHTTP・部屋・WebSocket・チャットをsmoke確認。失敗時は旧サービスに触れない。
4. このゲームのサービスだけ停止。dataのスナップショットと旧コード・旧依存をbackups配下へ退避して新版へ切り替える。
5. サービス起動後にもsmoke確認。失敗したらコードと依存を旧版へ戻し、もともと稼働中だったサービスを起動して再確認する。
6. 成功時はパッケージSHA256を記録。nginx・systemd設定・runtime・dataは維持する。

更新時には短時間の停止があり、進行中の試合・部屋は終了する。再接続だけで旧試合は復元されない。プレイヤー保存データはdata/に残る。
バックアップは自動削除しない。容量は `du -sh /opt/goblin-vs-hero/backups /opt/goblin-vs-hero-stage-*` で確認できる。stageは診断用に残す。
強制終了や停電でロックが残った場合、表示される .update-lock/pid を読み、当該プロセスがもう存在しないことを確認してからロックを解消する。
旧版への復元まで失敗した場合はエラーとバックアップ場所を表示して停止する。稼働復旧に成功したとは表示しない。
更新テストでは、正常切り替え・データ維持・旧依存を含むロールバック・不完全パッケージで停止しないこと・危険なエントリの拒否を確認。
Linux実機のsystemd操作を含む更新はまだ未実行。初回は実行結果を確認しながら進める。

## 6. Twitch連携

複数配信者向けOAuth・チャット投票を追加。公開サーバー側の初回設定と配信者の操作は [TWITCH-ja.md](TWITCH-ja.md) を参照。
更新パッケージにClient Secretは含めない。ゲーム更新後に `bash /opt/goblin-vs-hero/deploy/configure-twitch.sh` でサーバー管理者が一度設定する。
Twitchの実アカウント認可・チャット確認はサーバーで別途必要。
