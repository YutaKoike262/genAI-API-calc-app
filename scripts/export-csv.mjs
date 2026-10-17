import { readFile,mkdir,writeFile } from 'node:fs/promises';
const tables=JSON.parse(await readFile('public/data/fallback.json','utf8'));
await mkdir('docs/sheets',{recursive:true});
const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
for(const [name,rows] of Object.entries(tables)) {
 const columns=Object.keys(rows[0]);
 await writeFile('docs/sheets/'+name+'.csv',[columns,...rows.map(r=>columns.map(c=>r[c]))].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n');
}
console.log('7シート分のインポート用CSVをdocs/sheetsに書き出しました。');
