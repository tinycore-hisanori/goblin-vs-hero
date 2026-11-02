import {LANGUAGE_KEY} from './i18n-core.js';
import {getLanguage,t,tr,changeLocale,onLanguageChange} from './locale.js';
export {getLanguage,t,tr,onLanguageChange} from './locale.js';
import './i18n.css';

const textRecords=new WeakMap(),attributeRecords=new WeakMap(),explicitRecords=new WeakMap();
const ignore='script,style,textarea,[data-i18n-ignore],#chat-log';
const attrs=['title','aria-label','placeholder','alt'];
function textNode(node){if(node.parentElement?.closest(ignore))return;
 const current=node.nodeValue,previous=textRecords.get(node),source=previous&&previous.output===current?previous.source:current,output=t(source);
 textRecords.set(node,{source,output});if(current!==output)node.nodeValue=output;
}
function element(node){
 const record=explicitRecords.get(node);if(record){const result=tr(record.key,record.values.map(v=>v&&typeof v==='object'?t(v.key):v));if(node.textContent!==result)node.textContent=result;return;}
 if(node.closest(ignore))return;
 let records=attributeRecords.get(node);if(!records){records={};attributeRecords.set(node,records);}
 for(const attr of attrs){if(!node.hasAttribute(attr))continue;const current=node.getAttribute(attr),previous=records[attr],source=previous&&previous.output===current?previous.source:current,output=t(source);records[attr]={source,output};if(current!==output)node.setAttribute(attr,output);}
}
function walk(root){if(root.nodeType===3){textNode(root);return;}if(root.nodeType!==1&&root.nodeType!==9)return;if(root.nodeType===1){element(root);if(root.closest(ignore))return;}
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:node=>node.nodeType===1&&node.matches(ignore)?(element(node),NodeFilter.FILTER_REJECT):NodeFilter.FILTER_ACCEPT});let node;while((node=walker.nextNode()))node.nodeType===3?textNode(node):element(node);
}
/** For UI containing user-supplied arguments; these values are never translated. */
export function localizedText(node,key,values=[]){explicitRecords.set(node,{key,values});node.setAttribute('data-i18n-ignore','');element(node);return node;}
const selectors=new Set();
onLanguageChange(()=>{document.documentElement.lang=getLanguage();for(const selector of selectors)selector.value=getLanguage();walk(document);});
function notifyFrames(){for(const frame of document.querySelectorAll('iframe')){try{frame.contentWindow?.postMessage({type:'game-language',language:getLanguage()},location.origin);}catch{}}}
export function setLanguage(value,{broadcast=true}={}){
 changeLocale(value);
 if(broadcast){notifyFrames();if(window.parent!==window)window.parent.postMessage({type:'game-language',language:getLanguage()},location.origin);}
}
export function createLanguageControl(){
 const control=document.createElement('label');control.className='language-control';control.dataset.i18nIgnore='';control.innerHTML='<span aria-hidden="true">◎</span><select aria-label="Language / 言語"><option value="en">English</option><option value="ja">日本語</option></select>';const selector=control.querySelector('select');selectors.add(selector);selector.value=getLanguage();selector.addEventListener('change',()=>setLanguage(selector.value));
 return control;
}
function initialize(){
 document.documentElement.lang=getLanguage();
 const control=createLanguageControl();
 // The party shell owns the selector for its embedded game, avoiding duplicate HUD controls.
 if(window.parent===window){const host=document.querySelector('body > header')||document.body;host.append(control);if(host===document.body)control.classList.add('language-floating');}
 walk(document);
 const observer=new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')textNode(record.target);else if(record.type==='attributes')element(record.target);else for(const node of record.addedNodes)walk(node);}});
 observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrs});
 document.addEventListener('load',event=>{if(event.target.tagName==='IFRAME')notifyFrames();},true);
}
addEventListener('storage',event=>{if(event.key===LANGUAGE_KEY)setLanguage(event.newValue,{broadcast:false});});
addEventListener('message',event=>{if(event.origin!==location.origin||event.data?.type!=='game-language')return;const isParent=window.parent!==window&&event.source===window.parent,isChild=[...document.querySelectorAll('iframe')].some(frame=>frame.contentWindow===event.source);if(!isParent&&!isChild)return;if(event.data.language!==getLanguage())setLanguage(event.data.language);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
