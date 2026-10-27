import { readFile, access, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { normalizeTables } from '../public/api-cost/assets/data.js';
import { CONFIG } from '../public/api-cost/config.js';
import { SHEETS } from '../public/api-cost/assets/data.js';
const pages=['index.html','api-cost/index.html','api-cost/privacy.html','api-cost/about.html','api-cost/guide.html'];
for(const file of pages) {
 const html=await readFile('public/'+file,'utf8');
 for(const tag of [/<title>.+<\/title>/,/<meta name="description"/,/<meta property="og:image"/]) if(!tag.test(html))throw Error(file+' metadata missing');
 if((html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-8910196652932479/g)||[]).length!==1)throw Error(file+' AdSense script missing or duplicated');
 for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
  const ref=match[1];if(/^(https?:|mailto:)/.test(ref))continue;
  await access(new URL(ref,'file://' + process.cwd() + '/public/' + file).pathname);
 }
}
for(const file of ['api-cost/config.js',...(await readdir('public/api-cost/assets')).filter(x=>x.endsWith('.js')).map(x=>'api-cost/assets/'+x)]) {
 const result=spawnSync(process.execPath,['--check','public/'+file],{encoding:'utf8'});if(result.status)throw Error(result.stderr);
}
normalizeTables(JSON.parse(await readFile('public/api-cost/data/fallback.json','utf8')));
if(process.argv.includes('--production')) {
 if(!CONFIG.siteUrl.startsWith('https://'))throw Error('本番siteUrl未設定');
 for(const name of SHEETS) {
  if(CONFIG.csv[name] !== `data/live/${name}.csv`)throw Error(name+' の公開CSVが未設定');
  await access(`public/api-cost/${CONFIG.csv[name]}`);
 }
 if(!(await readFile('public/sitemap.xml','utf8')).includes('<loc>'))throw Error('npm run prepare:site が必要です');
}
console.log('静的ファイル・内部リンク・JavaScript構文・予備データ: OK');
