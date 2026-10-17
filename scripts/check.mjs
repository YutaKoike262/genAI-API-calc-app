import { readFile, access, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { normalizeTables } from '../public/assets/data.js';
import { CONFIG } from '../public/config.js';
const pages=['index.html','privacy.html','about.html','guide.html'];
for(const file of pages) {
 const html=await readFile('public/'+file,'utf8');
 for(const tag of [/<title>.+<\/title>/,/<meta name="description"/,/<meta property="og:image"/]) if(!tag.test(html))throw Error(file+' metadata missing');
 for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
  const ref=match[1];if(/^(https?:|mailto:)/.test(ref))continue;
  await access('public/'+ref);
 }
}
for(const file of ['config.js',...(await readdir('public/assets')).filter(x=>x.endsWith('.js')).map(x=>'assets/'+x)]) {
 const result=spawnSync(process.execPath,['--check','public/'+file],{encoding:'utf8'});if(result.status)throw Error(result.stderr);
}
normalizeTables(JSON.parse(await readFile('public/data/fallback.json','utf8')));
if(process.argv.includes('--production')) {
 if(!CONFIG.siteUrl.startsWith('https://'))throw Error('本番siteUrl未設定');
 if(!CONFIG.operator.name || !CONFIG.operator.contactUrl)throw Error('運営者情報未設定');
 if(Object.values(CONFIG.csv).some(v=>!v.startsWith('https://docs.google.com/')))throw Error('公開CSVが未設定');
 if(!(await readFile('public/sitemap.xml','utf8')).includes('<loc>'))throw Error('npm run prepare:site が必要です');
}
console.log('静的ファイル・内部リンク・JavaScript構文・予備データ: OK');
