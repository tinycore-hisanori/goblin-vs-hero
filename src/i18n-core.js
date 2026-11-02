import messages from './i18n-messages.json' with {type:'json'};

export const LANGUAGE_KEY='gg-language';
export const normalizeLanguage=value=>value==='ja'?'ja':'en';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const normalize=s=>s.replace(/\s+/g,' ').trim();
// Captures containing a player/channel name are opaque, even if the name is a UI word.
const opaque=new Map([
 ['{0}が宝を持ち帰りました！',[0]],['{0}をゴブリンが阻止！',[0]],
 ['{0}を選択。Fで同族殺しON／OFF',[0]],['勇者固定：{0}',[0]],
 ['勇者：{0} / 第{1}ラウンド{2}',[0]],
 ['{0} のチャットで投票。冒険中に配信者が投票を開始できます。',[0]],
]);
const templates=Object.entries(messages).filter(([key])=>/\{\d+\}/.test(key)&&! /\{\d+\}\{\d+\}/.test(key)).map(([key,value])=>{
 const indices=[];let pattern='',offset=0;
 for(const match of key.matchAll(/\{(\d+)\}/g)){const tail=key.slice(match.index+match[0].length);const numeric=/^\s*(?:秒|回|金貨|票|EXP|%|ラウンド|\/6人)/.test(tail);pattern+=escape(key.slice(offset,match.index))+(numeric?'([0-9]+(?:\\.[0-9]+)?)':'(.*?)');indices.push(+match[1]);offset=match.index+match[0].length;}
 return {key,value,indices,re:new RegExp('^'+pattern+escape(key.slice(offset))+'$','u'),weight:key.replace(/\{\d+\}/g,'').length};
}).sort((a,b)=>b.weight-a.weight);
const phrases=Object.keys(messages).filter(key=>!key.includes('{')).sort((a,b)=>b.length-a.length);
const phraseRE=new RegExp(phrases.map(escape).join('|'),'gu');
const cache=new Map();

/** Explicit formatting preserves all arguments. Translate system arguments separately. */
export function formatMessage(key,values=[],language='en'){
 return (language==='ja'?key:messages[key]??key).replace(/\{(\d+)\}/g,(all,index)=>String(values[index]??all));
}
/** Presentation only: never apply to arbitrary player names or free chat. */
export function translateText(value,language='en',depth=0){
 const source=String(value??'');if(language==='ja'||!/[\u3000-\u9fff]/u.test(source)||depth>8)return source;
 const text=normalize(source);const cached=cache.get(text);if(cached!==undefined)return source.match(/^\s*/)[0]+cached+source.match(/\s*$/)[0];
 let translated=messages[text];
 if(translated===undefined){
  for(const template of templates){const match=template.re.exec(text);if(!match)continue;
   const values=[];template.indices.forEach((index,i)=>{values[index]=(opaque.get(template.key)||[]).includes(index)?match[i+1]:translateText(match[i+1],language,depth+1);});
   translated=formatMessage(template.key,values,language);break;
  }
 }
 // Authored UI sometimes combines labels, numbers, and punctuation without a template.
 if(translated===undefined&&text.includes(' · '))translated=text.split(' · ').map(part=>translateText(part,language,depth+1)).join(' · ');
 if(translated===undefined)translated=text.replace(phraseRE,key=>messages[key]);
 if(cache.size>2000)cache.clear();cache.set(text,translated);
 const leading=source.match(/^\s*/)[0],trailing=source.match(/\s*$/)[0];return leading+translated+trailing;
}
export {messages};
