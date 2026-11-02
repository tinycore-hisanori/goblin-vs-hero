// The OAuth callback is a standalone response, outside the client UI translator.
const errors={
 '認証の期限切れです。部屋から連携し直してください':'Authorization expired. Link Twitch again from your game room.',
 'Twitchの認可がキャンセルされました。このタブを閉じてゲームに戻れます':'Twitch authorization canceled. Close this tab to return to the game.',
 '部屋の管理役が変わりました':'The room host has changed. Return to the room and try again.',
 '部屋が変更されました':'The room has changed. Return to the room and try again.',
 'この部屋には別の配信者が連携しています。先に連携解除してください':'Another streamer is linked to this room. Unlink them first.',
 'サーバー管理者によるTwitchアプリ設定が必要です':'The server administrator must configure the Twitch app.',
 'Twitch連携に失敗しました。時間をおいて再度お試しください':'Could not link Twitch. Please try again later.',
};
export const callbackError=(message,language)=>language==='ja'?message:errors[message]||'Could not link Twitch. Return to your game room and try again.';
