import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { CONFIG } from '../public/api-cost/config.js';
import { SHEETS, normalizeTables, parseCSV, todayJST } from '../public/api-cost/assets/data.js';
import { csvUrlsFromPublishedSheetsUrl } from './published-sheets.js';
const arg = process.argv[2] || process.env.SITE_ROOT_URL || CONFIG.siteRootUrl;
if (!arg) { console.error('本番のsiteRootUrlを設定するか、npm run prepare:site -- https://your-domain/ を実行してください。'); process.exit(1); }
const base=new URL(arg);
if(base.protocol!=='https:' || base.search || base.hash || base.username || base.password) throw Error('本番URLはクエリや認証情報のないHTTPS URLにしてください');
if(!base.pathname.endsWith('/'))base.pathname+='/';
const appUrl=new URL('api-cost/',base).href;
const configPath='public/api-cost/config.js';
let configText=await readFile(configPath,'utf8');
configText=configText.replace(/(siteUrl:\s*')[^']*(')/,`$1${appUrl}$2`);
if (process.env.PUBLISHED_SHEETS_URL) {
 const csv = csvUrlsFromPublishedSheetsUrl(process.env.PUBLISHED_SHEETS_URL);
 const responses = await Promise.all(SHEETS.map(async key => {
  const response = await fetch(csv[key], { redirect:'follow', signal:AbortSignal.timeout(15000) });
  if (!response.ok) throw Error(`${key} CSVの取得に失敗しました: HTTP ${response.status}`);
  return [key, await response.text()];
 }));
 const tables = Object.fromEntries(responses.map(([key, body]) => [key, parseCSV(body)]));
 const normalized = normalizeTables(tables, { day:todayJST(), siteUrl:appUrl });
 if (!normalized.models.some(model => model.id === 'gemini-nano-banana-2.1')) throw Error('公開シートにNano Banana 2.1が見つかりません');
 const dataDir = 'public/api-cost/data/live';
 await mkdir(dataDir, { recursive:true });
 await Promise.all(responses.map(([key, body]) => writeFile(`${dataDir}/${key}.csv`, body)));
 const localCsv = Object.fromEntries(SHEETS.map(key => [key, `data/live/${key}.csv`]));
 configText=configText.replace(/csv:\s*\{[^}]*\}/,`csv: ${JSON.stringify(localCsv)}`);
} else if (process.env.CI) {
 throw Error('GitHub ActionsのRepository variable PUBLISHED_SHEETS_URL を設定してください');
}
const measurementId=process.env.GA4_MEASUREMENT_ID?.trim() || '';
if (measurementId && !/^G-[A-Z0-9]+$/.test(measurementId)) throw Error('GA4_MEASUREMENT_ID は G- で始まる測定IDにしてください');
configText=configText.replace(/(ga4MeasurementId:\s*)'[^']*'/,`$1${JSON.stringify(measurementId)}`);
await writeFile(configPath,configText);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const pages=[
 {file:'index.html',url:'./',image:'assets/tools-og.png'},
 {file:'api-cost/index.html',url:'api-cost/',image:'api-cost/assets/og.png'},
 ...['privacy.html','about.html','guide.html'].map(page=>({file:'api-cost/'+page,url:'api-cost/'+page,image:'api-cost/assets/og.png'})),
];
for(const page of pages) {
 const canonical=new URL(page.url,base).href;
 let html=await readFile('public/'+page.file,'utf8');
 html=html.replace(/\s*<link rel="canonical"[^>]*>/g,'').replace(/\s*<meta property="og:url"[^>]*>/g,'');
 html=html.replace(/<meta property="og:image"[^>]*>/,`<meta property="og:image" content="${escape(new URL(page.image,base).href)}">`);
 html=html.replace('</head>',`<link rel="canonical" href="${escape(canonical)}"><meta property="og:url" content="${escape(canonical)}"></head>`);
 await writeFile('public/'+page.file,html);
}
await writeFile('public/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml',base).href}\n`);
await writeFile('public/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(p=>`  <url><loc>${escape(new URL(p.url,base).href)}</loc></url>`).join('\n')+'\n</urlset>\n');
console.log('canonical・OGP・sitemap・robotsを更新しました: '+base.href);
