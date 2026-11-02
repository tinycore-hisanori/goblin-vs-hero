# Twitch連携の公開手順

## 構成

開発者が登録した共通のTwitchアプリを、各配信者が自分のアカウントで認可する。
特定チャンネルの許可リストはない。cyberojisanも他の配信者も同じ手順。
配信者はアプリ登録・Client Secretの入力・サーバー契約をする必要がない。
ゲームの部屋の管理役とTwitchアプリの管理者は別の役割。

固定メンバーの部屋の管理役が、自分のTwitchチャンネルを連携する。
複数の配信者が、それぞれ別の部屋で同時に利用できる。同じチャンネルを別の部屋につなぎ直すと、以前の部屋の連携は解除する。
ランダムマッチとLANでのゲームプレイは、Twitch認証なしでも従来どおり利用できる。

## サーバー管理者が1回だけ行う設定

Twitch Developer ConsoleのアプリのOAuth Redirect URLを次の値にする：

`https://goblin-vs-hero.kitakuarcade.com/auth/twitch/callback`

Client ID：`avws7n9v1a3akiyqoy5uwwrvrv5m6q`

ConfidentialアプリのClient Secretを取得する。Secretをチャット・ソース・ブラウザーのJavaScriptに貼らない。
最新版パッケージと更新スクリプトを `/opt/` に転送後、SSHで以下を実行する。

```bash
/opt/goblin-vs-hero/runtime/bin/node /opt/goblin-vs-hero-update.mjs /opt/goblin-vs-hero-latest.tar.gz
bash /opt/goblin-vs-hero/deploy/configure-twitch.sh
```

スクリプトがSecretを非表示で尋ねる。その欄で入力する。設定後はこのゲームのサービスが再起動し、進行中の部屋は終了する。
設定ファイルは `/etc/goblin-vs-hero/twitch.env`（rootのみ読み書き、0600）、systemdのdrop-inで読み込む。既存の別ゲーム・nginx設定は変更しない。
以後のゲーム更新でこの設定は維持される。Secretを変更するときだけconfigure-twitch.shを再実行する。

確認：

```bash
curl -fsS https://goblin-vs-hero.kitakuarcade.com/api/twitch/status
/opt/goblin-vs-hero/runtime/bin/node /opt/goblin-vs-hero/deploy/smoke.mjs https://goblin-vs-hero.kitakuarcade.com
```

最初の結果の `enabled:true` はアプリ設定済みを示す。実際の認可・チャット受信が成功したことは示さない。

## 各配信者の利用手順

1. 公開URLを開き「固定メンバーで遊ぶ」→「プライベート部屋を作る」。
2. 待機画面の「自分のTwitchと連携」を押す。別ウインドウで**自分の配信アカウント**を認可する。ゲームの元のタブは開いたままにする。
3. 完了タブを閉じる。待機画面で自分のチャンネル名と「接続済み」を確認する。
4. 冒険を開始する。ゲーム中の左上の「Twitch」欄を展開し「20秒のチャット投票を開始」を押す。勇者のマウスロック中はEscで解除して操作する。
5. 配信で3つの選択肢を見せる。視聴者は配信者のTwitchチャットに `1` / `2` / `3` を送信する。ゲームの6人枠に入らなくても投票できる。
6. 20秒後、最多票のイベントがゲームに反映される。1人1票、投票中は変更可。同数は抽選、0票ならイベントなし。次の投票開始は前回開始から60秒後。

イベント：勇者の視界が8秒暗くなる／勇者の位置で騒音が出る／生存中のゴブリンのHPが2回復する。
終了・中断したラウンドの投票はキャンセルする。配信者以外のブラウザーから投票開始・連携解除はできない。
TwitchのネイティブPoll機能ではなく、チャットを受信して集計するゲーム内投票。AffiliateやPartner、サブスク、ポイント支払いは不要。

## 認証・保存・再接続

- 権限は `user:read:chat` のみ。OAuth Authorization CodeとEventSub WebSocketを利用する。チャット送信・モデレーション権限は要求しない。
- 認可開始には部屋の管理役のWebSocket接続へ返す一時チケットを使う。OAuth stateとHttpOnly/Secure/SameSite cookieを照合する。
- アクセス/リフレッシュトークンはサーバーのメモリー内だけで保持し、ブラウザー・ステータスAPI・ゲームスナップショットには返さない。サーバー再起動時には部屋と連携が終了する。
- 連携は最大12時間。部屋の消滅・管理役の変更・連携解除でも終了する。次回は配信者が再連携する。
- トークンを定期的に検証し、期限前に更新する。接続切断では再接続、認可取消時は再認可を表示する。切断中のチャット投票は再取得できない。
- 既存LAN版の端末IDはログイン認証ではない。本連携は配信者自身のTwitch認可でチャンネル所有を確認する。ゲーム全体の端末IDなりすまし対策を含むアカウントシステムとは別。

## 検証範囲

ローカル自動テストで、複数配信者の分離、他人の投票操作拒否、認可state/cookie、票変更と再配信の重複除去、無投票、ラウンド終了時キャンセル、ゲーム内効果を確認する。
Twitch APIの応答はテストでは模擬している。本物のアカウント認可と視聴者のチャットを使った確認は上の手順で別途行う必要がある。

公式仕様：
- https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
- https://dev.twitch.tv/docs/authentication/validate-tokens/
- https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
- https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage
