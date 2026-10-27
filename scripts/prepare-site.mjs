import { readFile, writeFile } from 'node:fs/promises';
import { CONFIG } from '../public/api-cost/config.js';
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
 configText=configText.replace(/csv:\s*\{[^}]*\}/,`csv: ${JSON.stringify(csv)}`);
} else if (process.env.CI) {
 throw Error('GitHub ActionsのRepository variable PUBLISHED_SHEETS_URL を設定してください');
}
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
