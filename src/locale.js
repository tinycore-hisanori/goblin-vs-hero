import {LANGUAGE_KEY,normalizeLanguage,translateText,formatMessage} from './i18n-core.js';
let language='en';try{language=normalizeLanguage(globalThis.localStorage?.getItem(LANGUAGE_KEY));}catch{}
const listeners=new Set();
export const getLanguage=()=>language;
export const t=source=>translateText(source,language);
export const tr=(key,values=[])=>formatMessage(key,values,language);
export function onLanguageChange(callback){listeners.add(callback);return()=>listeners.delete(callback);}
export function changeLocale(value){language=normalizeLanguage(value);try{globalThis.localStorage?.setItem(LANGUAGE_KEY,language);}catch{}for(const callback of listeners)callback(language);}
