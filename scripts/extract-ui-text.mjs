import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {parseAst} from 'rollup/parseAst';
export function collectUIText(){
const texts=new Set(),jp=/[\u3040-\u30ff\u3400-\u9fff]/;
function add(s){if(!jp.test(s))return;if(s.includes('<')&&s.includes('>')){for(const m of ('>'+s+'<').matchAll(/>([^<>]+)</g))add(m[1]);for(const m of s.matchAll(/(?:title|aria-label|alt|placeholder)=["']([^"']+)["']/g))add(m[1]);return;}s=s.trim().replace(/\s+/g,' ');if(s&&jp.test(s))texts.add(s);}
function walk(n){if(!n||typeof n!=='object')return;if(n.type==='Literal'&&typeof n.value==='string')add(n.value);if(n.type==='TemplateLiteral')add(n.quasis.map((q,i)=>q.value.cooked+(i<n.expressions.length?`{${i}}`:'')).join(''));for(const [k,v]of Object.entries(n))if(k!=='parent'){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}
for(const dir of ['src','server'])for(const file of readdirSync(dir)){if(!file.endsWith('.js')||file.includes('backup')||file.startsWith('i18n'))continue;walk(parseAst(readFileSync(`${dir}/${file}`,'utf8')));}
for(const file of ['index.html','party.html','goblin.html','character-preview.html','nest-preview.html']){const s=readFileSync(file,'utf8');for(const m of s.matchAll(/<script type="module">([\s\S]*?)<\/script>/g))walk(parseAst(m[1]));add('>'+s.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'')+'<');}
return [...texts].sort();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const list=collectUIText();writeFileSync('output/ui-text-inventory.json',JSON.stringify(list,null,2));console.log(list.map((s,i)=>`${i}\t${s}`).join('\n'));
}
