import test from 'node:test';
import assert from 'node:assert/strict';
import {collectUIText} from './extract-ui-text.mjs';
import {messages,normalizeLanguage,translateText as t,formatMessage} from '../src/i18n-core.js';
import {changeLocale,getLanguage,onLanguageChange,t as localText} from '../src/locale.js';

test('English is the default, saved Japanese is supported, invalid values fall back to English',()=>{
 assert.equal(normalizeLanguage(null),'en');assert.equal(normalizeLanguage('fr'),'en');assert.equal(normalizeLanguage('ja'),'ja');
 assert.equal(getLanguage(),'en');const events=[],remove=onLanguageChange(value=>events.push(value));
 changeLocale('ja');assert.equal(localText('ゴブリン'),'ゴブリン');changeLocale('en');assert.equal(localText('ゴブリン'),'Goblin');remove();assert.deepEqual(events,['ja','en']);
});
test('all extracted UI messages are catalogued; English has no Japanese and preserves template arguments',()=>{
 const inventory=collectUIText();
 for(const source of inventory)assert.ok(messages[source],`Missing: ${source}`);
 for(const [source,english] of Object.entries(messages)){
  assert.ok(!/[ぁ-龠]/u.test(english),source);
  assert.deepEqual([...source.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort(),[...english.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort(),source);
  const expanded=source.replace(/\{\d+\}/g,'7');assert.ok(!/[ぁ-龠]/u.test(t(expanded)),`Dynamic: ${expanded} => ${t(expanded)}`);
  assert.equal(t(expanded,'ja'),expanded);
 }
});
test('dynamic counters and nested game labels translate, including whitespace and repeated frame updates',()=>{
 const samples=new Map([
 ['  短銃  6 / 6  · 予備 24  R：リロード · Q：剣','  Pistol 6 / 6 · Reserve 24 R: Reload · Q: Sword'],
 ['ポーションを食べた！ HP +3','Ate Potion! +3 HP'],
 ['残り 2 回 · 近くの敵を6秒足止め','2 uses left · Stuns nearby enemies for 6 seconds'],
 ['（あなた） · 勇者OK · 勇者0回 / 生還0回 · 管理役','(you) · Hero volunteer · Hero 0 / Escapes 0 · Host'],
 ['帰還報酬：+60金貨 / 月の古銭（宝物庫に追加！）','Escape reward: +60 coins / Ancient Moon Coin(added to the treasury!)'],
 ]);
 for(const [source,english]of samples){assert.equal(t(source),english);assert.equal(t(source),english);}
});
test('names are opaque in result templates and explicit UI formatting',()=>{
 assert.equal(t('勇者ゴブリンが宝を持ち帰りました！'),'勇者ゴブリン escaped with the treasure!');
 assert.equal(t('ゴブリンをゴブリンが阻止！'),'The goblins stopped ゴブリン!');
 assert.equal(formatMessage('勇者：{0} / 第{1}ラウンド{2}',['勇者ゴブリン',3,'']),'Hero: 勇者ゴブリン / Round 3');
 assert.equal(formatMessage('{0} / {1}',['ゴブリン','Hobgoblin']),'ゴブリン / Hobgoblin');
});
