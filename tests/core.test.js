import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { normalizeTables, parseCSV, loadData, SHEETS, todayJST } from '../public/api-cost/assets/data.js';
import { createEngine } from '../public/api-cost/assets/core.js';
import { cleanLocation, eventPayload } from '../public/api-cost/assets/telemetry.js';
const raw=JSON.parse(readFileSync(new URL('../public/api-cost/data/fallback.json',import.meta.url)));
const make=(tables=structuredClone(raw),day='2026-10-17')=>normalizeTables(tables,{day,siteUrl:'https://meter.example/'});
const data=make(), engine=createEngine(data), model=data.models.find(m=>m.id===data.default_model);
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const csv=rows=>{const headers=Object.keys(rows[0]);const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';return [headers,...rows.map(r=>headers.map(k=>r[k]))].map(r=>r.map(cell).join(',')).join('\r\n');};

test('CSV: BOM, CRLF, escaped quotes, comma and multiline field',()=>{
 assert.deepEqual(parseCSV('\uFEFFid,note\r\nx,"a,b\n""quoted"""\r\n'),[{id:'x',note:'a,b\n"quoted"'}]);
 for(const text of ['x,x\n1,2','x,y\n1','x\n"unclosed','__proto__\nhello'])assert.throws(()=>parseCSV(text));
});
test('JST date boundary',()=>assert.equal(todayJST(new Date('2026-11-30T15:00:00Z')),'2026-12-01'));
test('Google Sheets locale dates normalize to ISO and reject impossible dates',()=>{
 const t=structuredClone(raw);t.image_prices[0].checked_at='10/28/2026';
 assert.equal(make(t,'2026-10-28').models.find(m=>m.id==='gemini-nano-banana-2.1').needs_review,false);
 t.image_prices[0].checked_at='2/30/2026';assert.throws(()=>make(t,'2026-10-28'));
});
test('one-request cost stays stable while monthly estimate follows daily request count',()=>{
 const base=engine.defaults(model), r=engine.calc(model,base), fewer=engine.calc(model,{...base,requests_per_day:250});
 assert.equal(base.extra_input,2000);assert.equal(base.requests_per_day,500);assert.equal(r.inTok,2020);approx(r.cIn,60.6);approx(r.cOut,120);approx(r.monthly,180.6);approx(r.perReq,.01204);
 approx(fewer.perReq,r.perReq);approx(fewer.monthly,r.monthly/2);assert.equal(r.monthReq,15000);
});
test('cache and search free allowance with zero requests',()=>{
 const m=data.models.find(m=>m.id==='gemini-4-argon');let v={...engine.defaults(m),prompt:'',extra_input:1000,cache:50,max_output:1000,requests_per_day:100,web_search:2};
 const r=engine.calc(m,v);approx(r.cIn,3);approx(r.cCache,.15);approx(r.cOut,30);approx(r.cSearch,14);approx(r.monthly,47.15);approx(r.perReq,.03905);
 assert.equal(engine.calc(m,{...v,requests_per_day:0}).monthly,0);
});
test('Nano Banana image pricing uses per-image size and batch rates',()=>{
 const m=data.models.find(m=>m.id==='gemini-nano-banana-2.1');
 const v={...engine.defaults(m),prompt:'',system:'',extra_input:0,max_output:0,requests_per_day:10,image_count:2,image_size:'1K'};
 const standard=engine.calc(m,v), batch=engine.calc(m,{...v,batch:true,image_size:'4K'});
 approx(standard.perReq,.0672);approx(standard.monthly,20.16);approx(standard.cImage,20.16);
 approx(batch.perReq,.1134);approx(batch.monthly,34.02);
 assert.equal(standard.imageRate.image_size,'1K');assert.equal(batch.imageRate.image_size,'4K');
});
test('long threshold is strictly greater and batch uses explicit rates',()=>{
 const tables=structuredClone(raw); const id='claude-haiku-5-5';
 const price=tables.prices.find(p=>p.model_id===id && p.tier==='base' && p.mode==='batch');price.input=7;price.output=11;price.cache_read=3;
 const d=make(tables),e=createEngine(d),m=d.models.find(m=>m.id===id),v={...e.defaults(m),prompt:'',extra_input:100000,requests_per_day:1,max_output:1000};
 assert.equal(e.calc(m,v).long,false);assert.equal(e.calc(m,{...v,extra_input:100001}).long,true);
 const r=e.calc(m,{...v,batch:true,cache:50});approx(r.monthly,(50000*7+50000*3+1000*11)*30/1e6);
});
test('future schedule switches on the start date and keeps other modes',()=>{
 const current=make(raw,'2026-11-30').models.find(m=>m.id==='gemini-4-argon');assert.equal(current.tiers[0].input,2);assert.equal(current.future.tiers[0].input,4);
 const next=make(raw,'2026-12-01').models.find(m=>m.id==='gemini-4-argon');assert.equal(next.tiers[0].input,4);assert.equal(next.batch_tiers[0].input,2);assert.equal(next.future,null);
});
test('batch unavailable, hidden model, stale data',()=>{
 const tables=structuredClone(raw);tables.models[0].status='hidden';tables.prices=tables.prices.filter(p=>!(p.model_id===model.id && p.mode==='batch'));
 const d=make(tables,'2026-11-18'),e=createEngine(d),m=d.models.find(m=>m.id===model.id);
 assert.ok(!d.models.some(m=>m.id===tables.models[0].model_id));assert.equal(m.needs_review,true);assert.equal(m.batch_tiers.length,0);
 assert.equal(e.parseShare(`?m=${m.id}&batch=1`).vals.batch,false);assert.throws(()=>e.calc(m,{...e.defaults(m),batch:true}));
});
test('invalid data fails atomically: duplicate prices, missing long, unsafe paths',()=>{
 let t=structuredClone(raw);t.prices.push({...t.prices[0]});assert.throws(()=>make(t));
 t=structuredClone(raw);t.prices=t.prices.filter(p=>!(p.model_id==='gpt-6-astra'&&p.tier==='long'));assert.throws(()=>make(t));
 t=structuredClone(raw);t.param_map[0].path='__proto__.polluted';assert.throws(()=>make(t));
 t=structuredClone(raw);t.meta.find(r=>r.key==='fx_usdjpy').value='NaN';assert.throws(()=>make(t));
});
test('model override, transformations, never, notes-only and templates',()=>{
 const m=data.models.find(m=>m.id==='gpt-6-luna');assert.equal(engine.effortRow(m).values,'none|low|medium|high|xhigh|max');
 const body=engine.buildRequest(model,{...engine.defaults(model),system:'assistant',cache:50,web_search:2}).body;
 assert.equal(body.max_tokens,1024);assert.equal(body.system,'assistant');assert.equal(body.tools[0].max_uses,2);assert.deepEqual(body.cache_control,{type:'ephemeral'});
 const t=structuredClone(raw);t.param_map.find(r=>r.param_id==='system'&&r.scope==='provider:anthropic').emit='never';
 const e=createEngine(make(t));assert.equal(e.buildRequest(model,{...e.defaults(model),system:'omit'}).body.system,undefined);
});
test('parameter bounds are applied to URL and UI normalization',()=>{
 const t=structuredClone(raw);t.param_map.push({scope:'model:'+model.id,param_id:'max_output',path:'max_tokens',emit:'always',min:100,max:200,default:150,transform:'cap_model_max'});
 const d=make(t),e=createEngine(d),m=d.models.find(m=>m.id===model.id);
 assert.equal(e.defaults(m).max_output,150);assert.equal(e.parseShare('?out=300').vals.max_output,150);assert.equal(e.normalizeValues(m,{max_output:999}).max_output,200);
});
test('share roundtrip, opt-in and empty prompt',()=>{
 const v={...engine.defaults(model),prompt:'日本語😀\n\"quote\"',system:'be precise',max_output:1536,requests_per_day:10,cache:55,batch:true};
 const url=engine.shareUrl(model,v,true),r=engine.parseShare(url);assert.deepEqual(r.vals,v);
 const no=engine.shareUrl(model,v,false);assert.ok(!new URL(no).searchParams.has('p'));assert.ok(!new URL(no).searchParams.has('sys'));
 assert.equal(engine.parseShare(engine.shareUrl(model,{...v,prompt:''},true)).vals.prompt,'');
 assert.ok(!new URL(engine.shareUrl(model,{...v,prompt:'あ'.repeat(1001)},true)).searchParams.has('p'));
 assert.ok(new URL(engine.shareUrl(model,{...v,prompt:'😀'.repeat(1000)},true)).searchParams.has('p'));
 assert.equal(engine.parseShare('?rpd=5').vals.requests_per_day,5);
});
test('invalid shared numeric/enum/base64 values restore defaults',()=>{
 const r=engine.parseShare('?m=bad&out=-1&rpd=NaN&cache=101&ws=2.4&batch=yes&effort=invalid&p=%%%&ctx=&v=old');
 assert.equal(r.bad,9);assert.equal(r.stale,true);assert.deepEqual(r.vals,engine.defaults(model));
 for(const value of ['Infinity','1e3','0x10','1.5',''])assert.equal(engine.parseShare('?out='+value).vals.max_output,800);
 assert.equal(engine.parseShare('?out=123&out=456').vals.max_output,800);
});
test('GA4 URLs and text events redact sensitive data',()=>{
 const url='https://meter.example/?m=test&p=secret&sys=secret2&custom=secret3#secret4';
 assert.equal(cleanLocation(url),'https://meter.example/?m=test');
 const payload=eventPayload({param:'prompt',value:'secret',prompt:'secret2',dataset_version:'v'},url,url);
 assert.ok(!JSON.stringify(payload).includes('secret'));assert.equal(payload.dataset_version,'v');
});
test('CSV reload reflects pricing and mapping changes',async()=>{
 const t=structuredClone(raw);t.prices.find(p=>p.model_id===model.id&&p.mode==='standard').input=9;
 t.param_map.find(r=>r.scope==='provider:anthropic'&&r.param_id==='effort').default='low';
 const config={csv:Object.fromEntries(SHEETS.map(s=>[s,'https://docs.google.com/'+s]))};
 const loaded=await loadData(config,{day:'2026-10-17',fetcher:async url=>new Response(csv(t[new URL(url).pathname.slice(1)]))});
 assert.equal(loaded.fallback,false);assert.equal(loaded.data.models.find(m=>m.id===model.id).tiers[0].input,9);
 const e=createEngine(loaded.data);assert.equal(e.defaults(loaded.data.models.find(m=>m.id===model.id)).effort,'low');
});
test('missing config, HTTP error and malformed CSV all fall back',async()=>{
 for(const scenario of ['unconfigured','http','invalid']) {
 const config={csv:scenario==='unconfigured'?{}:Object.fromEntries(SHEETS.map(s=>[s,'https://docs.google.com/'+s]))};
 const result=await loadData(config,{day:'2026-10-17',fetcher:async url=>url.endsWith('fallback.json')?new Response(JSON.stringify(raw)):scenario==='http'?new Response('',{status:500}):new Response('<html>bad</html>')});
 assert.equal(result.fallback,true);assert.equal(result.data.default_model,model.id);
 }
});
test('all 18 provider/mode/language outputs are complete and syntactically valid',()=>{
 const all=[];
 for(const provider of ['anthropic','openai','google'])for(const batch of [false,true])for(const lang of ['python','curl','js']) {
 const m=data.models.find(m=>m.p===provider),v={...engine.defaults(m),batch,prompt:'日本語\nEOF\n\' $HOME `echo bad` "quoted"',system:'system\nline',web_search:1,cache:30};
 const code=engine.genCode(lang,m,v);assert.ok(code.includes(m.id));assert.ok(!code.includes('生成していません'));assert.ok(code.includes('system'));
 if(lang==='curl') { const result=spawnSync('bash',['-n'],{input:code,encoding:'utf8'});assert.equal(result.status,0,result.stderr); }
 if(lang==='js') { const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:code,encoding:'utf8'});assert.equal(result.status,0,result.stderr); }
 if(lang==='python')all.push(code);
 if(provider==='google'&&batch) { assert.match(code,/max_output_tokens|maxOutputTokens/);assert.match(code,/thinking_level|thinkingLevel/);assert.match(code,/google_search|googleSearch/); }
 }
 const result=spawnSync('python3',['-c','import sys,json,ast\nfor code in json.load(sys.stdin): ast.parse(code)'],{input:JSON.stringify(all),encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
test('curl quoting preserves malicious-looking prompt as literal JSON',()=>{
 const prompt="quote'\n$(echo INJECTED) `echo INJECTED` $HOME";
 const code=engine.genCode('curl',model,{...engine.defaults(model),prompt});
 const result=spawnSync('bash',[],{input:'curl() { printf "%s\\n" "${@: -1}"; }\n'+code,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).messages[0].content,prompt);
});
