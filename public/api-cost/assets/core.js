export function createEngine(DATA) {
const modelById = id => DATA.models.find(m => m.id === id);
function rowsFor(m) { // param_map をモデル向けに解決
  const out = [], idx = {};
  DATA.param_map.forEach(r => { if (r.scope === "provider:" + m.p) { idx[r.param] = out.length; out.push(r); } });
  DATA.param_map.forEach(r => { if (r.scope === "model:" + m.id) { if (idx[r.param] != null) out[idx[r.param]] = r; else out.push(r); } });
  return out;
}
const effortRow = m => rowsFor(m).find(r => r.param === "effort");
function limits(m, p) {
  const r = rowsFor(m).find(r => r.param === p.id);
  return { min: Math.max(p.min ?? 0, r?.min ?? 0), max: Math.min(p.max ?? 1000000, r?.max ?? Infinity, p.id === 'max_output' ? m.max_output : Infinity) };
}
function defaults(m) {
  const v = {};
  DATA.params.forEach(p => {
    const r = rowsFor(m).find(r => r.param === p.id);
    let value = r?.def ?? p.def;
    if (p.ui === 'select') value = r?.values.split('|').includes(value) ? value : r?.values.split('|')[0];
    if (p.ui === 'number') { const {min,max} = limits(m,p); value = Math.max(min, Math.min(max, Number(value))); }
    if (p.ui === 'toggle') value = value === true || value === 'TRUE' || value === '1';
    v[p.id] = value;
  });
  v.prompt = DATA.default_prompt;
  return v;
}
function normalizeValues(m, values) {
  const result = defaults(m);
  for (const p of DATA.params) {
    const value = values[p.id], r = rowsFor(m).find(r => r.param === p.id);
    if (p.ui === 'number') { const { min, max } = limits(m, p); const n = Number(value); if (String(value).trim() !== '' && Number.isFinite(n)) result[p.id] = Math.max(min, Math.min(max, Math.floor(n))); }
    else if (p.ui === 'select') { if (r?.values.split('|').includes(value)) result[p.id] = value; }
    else if (p.ui === 'toggle') result[p.id] = value === true;
    else if (typeof value === 'string') result[p.id] = value;
  }
  if (!m.batch_tiers.length) result.batch = false;
  return result;
}
function estTokens(s) { let a = 0, o = 0; for (const ch of s || "") { if (ch.charCodeAt(0) < 128) a++; else o++; } return Math.round(a / 4 + o); }
const num = v => { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; };
const usd = v => v === 0 ? "$0" : v < 0.01 ? "$" + v.toPrecision(2) : v < 100 ? "$" + v.toFixed(2) : "$" + Math.round(v).toLocaleString("en-US");
const yen = v => "約" + Math.round(v * DATA.meta.fx_usdjpy).toLocaleString("ja-JP") + "円 / 月";
const maxOut = (m, v) => Math.min(Math.max(Math.ceil(num(v.max_output) / 256) * 256, 256), m.max_output);

/* ======================================================================
   4. 料金計算（設計書5章の式）
   ====================================================================== */
function calc(m, v, tiers = m.tiers, batchTiers = m.batch_tiers) {
  const pv = DATA.providers[m.p];
  const inTok = estTokens(v.prompt) + estTokens(v.system) + num(v.extra_input);
  const selected = v.batch ? batchTiers : tiers;
  if (!selected?.length) throw Error('この処理モードの料金がありません');
  const t = selected.find(x => inTok <= x.upTo) || selected.at(-1);
  const hit = Math.min(num(v.cache), 100) / 100, cached = inTok * hit;
  const monthReq = num(v.requests_per_day) * 30;
  const cIn = (inTok - cached) * t.input / 1e6 * monthReq;
  const cCache = cached * t.cache / 1e6 * monthReq;
  const cOut = num(v.max_output) * t.output / 1e6 * monthReq;
  const cSearch = Math.max(0, Math.floor(num(v.web_search)) * monthReq - pv.web_search_free) * pv.web_search_per_1k / 1000;
  const monthly = cIn + cCache + cOut + cSearch;
  return { inTok, t, cIn, cCache, cOut, cSearch, monthly, perReq: monthReq ? monthly / monthReq : 0, long: t.tier === 'long' };
}

/* ======================================================================
   5. コード生成（設計書4章）
   ====================================================================== */
function setPath(obj, path, val) {
  const arr = path.endsWith("[]"), keys = path.replace(/\[\]$/, "").split(".");
  if (keys.some(k => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) || ['__proto__','prototype','constructor'].includes(k))) throw Error('不正なJSONパスです');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys.at(i)] = o[keys.at(i)] || {};
  const k = keys.at(-1);
  if (arr) (o[k] = o[k] || []).push(val); else o[k] = val;
}
function buildRequest(m, v) {
  const body = { model: m.id }, notes = [];
  rowsFor(m).forEach(r => {
    let val = v[r.param];
    if (r.emit === "never") return;
    if (r.emit === "if_set" && !String(val || "").trim()) return;
    if (r.emit === "if_positive" && !(num(val) > 0)) return;
    const transforms = (r.transform || '').split(',');
    if (transforms.includes('round_up_256')) val = Math.max(256, Math.ceil(num(val) / 256) * 256);
    if (transforms.includes('cap_model_max')) val = Math.min(num(val), m.max_output);
    if (r.param === "web_search") val = Math.floor(num(val));
    if (r.param === "system") val = String(val).trim();
    if (r.note) notes.push(r.note);
    if (!r.path) return;
    setPath(body, r.path, r.template ? JSON.parse(r.template.replaceAll("{value}", JSON.stringify(val))) : val);
  });
  return { body, notes };
}
const J = x => JSON.stringify(x);
const sq = s => s.replace(/'/g, "'\\''");
function py(v, ind) {
  const pad = " ".repeat(ind);
  if (Array.isArray(v)) return "[\n" + v.map(x => pad + "    " + py(x, ind + 4)).join(",\n") + ",\n" + pad + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).map(k => J(k) + ": " + py(v[k], ind)).join(", ") + "}";
  if (v === true) return "True"; if (v === false) return "False"; if (v === null) return "None";
  return J(v);
}
function kw(obj, ind, style) {
  const pad = " ".repeat(ind);
  return Object.keys(obj).map(k => style === "py" ? `${pad}${k}=${py(obj[k], ind)},` : `${pad}${J(k)}: ${JSON.stringify(obj[k], null, 2).replace(/\n/g, "\n" + pad)},`).join("\n");
}
/* 外枠テンプレート: api_style × 通常/バッチ × 言語 */
function genTemplate(lang, m, v) {
  const { body: p, notes } = buildRequest(m, v), batch = !!v.batch, style = DATA.providers[m.p].api_style;
  const cm = lang === "js" ? "//" : "#";
  const c = notes.flatMap(n => n.split(/\r?\n/)).map(n => `${cm} ${n}\n`).join("");
  if (style === "messages") {
    if (!batch) {
      if (lang === "python") return `import anthropic\n\nclient = anthropic.Anthropic()  # 環境変数 ANTHROPIC_API_KEY\n${c}\nresponse = client.messages.create(\n${kw(p, 4, "py")}\n)\n\nfor block in response.content:\n    if block.type == "text":\n        print(block.text)\nprint(response.usage)`;
      if (lang === "curl") return `${c}curl https://api.anthropic.com/v1/messages \\\n  -H "x-api-key: $ANTHROPIC_API_KEY" \\\n  -H "anthropic-version: 2023-06-01" \\\n  -H "content-type: application/json" \\\n  -d '${sq(JSON.stringify(p, null, 2))}'`;
      return `import Anthropic from "@anthropic-ai/sdk";\n\nconst client = new Anthropic(); // 環境変数 ANTHROPIC_API_KEY\n${c}\nconst response = await client.messages.create({\n${kw(p, 2, "js")}\n});\n\nfor (const block of response.content) {\n  if (block.type === "text") console.log(block.text);\n}\nconsole.log(response.usage);`;
    }
    const req = { custom_id: "request-1", params: p };
    if (lang === "python") return `import anthropic\n\nclient = anthropic.Anthropic()  # 環境変数 ANTHROPIC_API_KEY\n${c}\n# バッチ: 料金は選択したバッチ単価を参照。結果は非同期で返ります\nbatch = client.messages.batches.create(\n    requests=[\n        {"custom_id": "request-1", "params": ${py(p, 8)}},\n    ],\n)\nprint(batch.id, batch.processing_status)`;
    if (lang === "curl") return `${c}curl https://api.anthropic.com/v1/messages/batches \\\n  -H "x-api-key: $ANTHROPIC_API_KEY" \\\n  -H "anthropic-version: 2023-06-01" \\\n  -H "content-type: application/json" \\\n  -d '${sq(JSON.stringify({ requests: [req] }, null, 2))}'`;
    return `import Anthropic from "@anthropic-ai/sdk";\n\nconst client = new Anthropic(); // 環境変数 ANTHROPIC_API_KEY\n${c}\n// バッチ: 料金は選択したバッチ単価を参照。結果は非同期で返ります\nconst batch = await client.messages.batches.create({\n  requests: ${JSON.stringify([req], null, 2).replace(/\n/g, "\n  ")},\n});\nconsole.log(batch.id, batch.processing_status);`;
  }
  if (style === "responses") {
    if (!batch) {
      if (lang === "python") return `from openai import OpenAI\n\nclient = OpenAI()  # 環境変数 OPENAI_API_KEY\n${c}\nresponse = client.responses.create(\n${kw(p, 4, "py")}\n)\n\nprint(response.output_text)\nprint(response.usage)`;
      if (lang === "curl") return `${c}curl https://api.openai.com/v1/responses \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${sq(JSON.stringify(p, null, 2))}'`;
      return `import OpenAI from "openai";\n\nconst client = new OpenAI(); // 環境変数 OPENAI_API_KEY\n${c}\nconst response = await client.responses.create({\n${kw(p, 2, "js")}\n});\n\nconsole.log(response.output_text);\nconsole.log(response.usage);`;
    }
    const line = { custom_id: "request-1", method: "POST", url: "/v1/responses", body: p };
    if (lang === "python") return `import json\nfrom openai import OpenAI\n\nclient = OpenAI()  # 環境変数 OPENAI_API_KEY\n${c}\n# 1. リクエストをJSONLに書き出す（1行1リクエスト）\nrequests = [\n    ${py(line, 4)},\n]\nwith open("batchinput.jsonl", "w") as f:\n    for r in requests:\n        f.write(json.dumps(r, ensure_ascii=False) + "\\n")\n\n# 2. アップロードしてバッチを作成（結果は非同期で返ります）\nbatch_file = client.files.create(file=open("batchinput.jsonl", "rb"), purpose="batch")\nbatch = client.batches.create(\n    input_file_id=batch_file.id,\n    endpoint="/v1/responses",\n    completion_window="24h",\n)\nprint(batch.id, batch.status)`;
    if (lang === "curl") return `${c}# 1. JSONLを作成（1行1リクエスト）\ncat > batchinput.jsonl <<'EOF'\n${JSON.stringify(line)}\nEOF\n\n# 2. ファイルをアップロード\ncurl https://api.openai.com/v1/files \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -F purpose="batch" \\\n  -F file="@batchinput.jsonl"\n\n# 3. 返ってきた file ID でバッチを作成（非同期処理）\ncurl https://api.openai.com/v1/batches \\\n  -H "Authorization: Bearer $OPENAI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"input_file_id": "file-XXXX", "endpoint": "/v1/responses", "completion_window": "24h"}'`;
    return `import fs from "fs";\nimport OpenAI from "openai";\n\nconst client = new OpenAI(); // 環境変数 OPENAI_API_KEY\n${c}\n// 1. JSONLを作成（1行1リクエスト）\nconst requests = [\n  ${JSON.stringify(line, null, 2).replace(/\n/g, "\n  ")},\n];\nfs.writeFileSync("batchinput.jsonl", requests.map((r) => JSON.stringify(r)).join("\\n") + "\\n");\n\n// 2. アップロードしてバッチを作成（結果は非同期で返ります）\nconst batchFile = await client.files.create({ file: fs.createReadStream("batchinput.jsonl"), purpose: "batch" });\nconst batch = await client.batches.create({\n  input_file_id: batchFile.id,\n  endpoint: "/v1/responses",\n  completion_window: "24h",\n});\nconsole.log(batch.id, batch.status);`;
  }
  /* interactions（Gemini） */
  if (!batch) {
    if (lang === "python") return `from google import genai\n\nclient = genai.Client()  # 環境変数 GEMINI_API_KEY\n${c}\ninteraction = client.interactions.create(\n${kw(p, 4, "py")}\n)\n\nprint(interaction)\nprint(interaction.usage)`;
    if (lang === "curl") return `${c}curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \\\n  -H "x-goog-api-key: $GEMINI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${sq(JSON.stringify(p, null, 2))}'`;
    return `import { GoogleGenAI } from "@google/genai";\n\nconst client = new GoogleGenAI({}); // 環境変数 GEMINI_API_KEY\n${c}\nconst interaction = await client.interactions.create({\n${kw(p, 2, "js")}\n});\n\nconsole.log(interaction);\nconsole.log(interaction.usage);`;
  }
  const request = geminiBatchRequest(p);
  const config = { ...request.generationConfig };
  if (request.systemInstruction) config.systemInstruction = request.systemInstruction;
  if (request.tools) config.tools = request.tools;
  const inline = [{ contents: request.contents, config }];
  if (lang === 'python') {
    const pyConfig = { max_output_tokens: p.generation_config?.max_output_tokens,
      thinking_config: { thinking_level: p.generation_config?.thinking_level } };
    if (p.system_instruction) pyConfig.system_instruction = p.system_instruction;
    if (request.tools) pyConfig.tools = [{ google_search: {} }];
    const requests = [{ contents: request.contents, config: pyConfig }];
    return `from google import genai\n\nclient = genai.Client()  # 環境変数 GEMINI_API_KEY\n${c}\njob = client.batches.create(\n    model=${J(m.id)},\n    src=${py(requests, 4)},\n    config={"display_name": "api-meter-batch"},\n)\nprint(job.name)`;
  }
  if (lang === 'js') return `import { GoogleGenAI } from "@google/genai";\n\nconst client = new GoogleGenAI({}); // 環境変数 GEMINI_API_KEY\n${c}\nconst job = await client.batches.create({\n  model: ${J(m.id)},\n  src: ${JSON.stringify(inline, null, 2)},\n  config: { displayName: "api-meter-batch" },\n});\nconsole.log(job.name);`;
  const payload = { batch: { display_name: 'api-meter-batch', input_config: { requests: { requests: [{ request, metadata: { key: 'request-1' } }] } } } };
  return curlRequest(DATA.providers[m.p], payload, true, m.id, c);

}

/* ======================================================================
   6. 共有URL（設計書9章）
   ====================================================================== */
function b64e(s) {
  return btoa(Array.from(new TextEncoder().encode(s), n => String.fromCharCode(n)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/, '');
}
function b64d(s) {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length > 6000 || s.length % 4 === 1) throw Error('Invalid base64url');
  const text = atob(s.replaceAll('-','+').replaceAll('_','/'));
  return new TextDecoder('utf-8', {fatal:true}).decode(Uint8Array.from(text, ch => ch.charCodeAt(0)));
}
function shareUrl(m, v, withPrompt) {
  const d = defaults(m), q = new URLSearchParams({ m: m.id });
  DATA.params.forEach(p => {
    if (!p.share_key) return;
    const val = v[p.id];
    if (p.share_optin) {
      if (withPrompt && typeof val === 'string' && val !== d[p.id] && Array.from(val).length <= 1000) q.set(p.share_key, b64e(val));
      return;
    }
    if (p.ui === 'toggle') { if (!!val !== !!d[p.id]) q.set(p.share_key, val ? '1' : '0'); return; }
    if (String(val) !== String(d[p.id])) q.set(p.share_key, String(val));
  });
  q.set('v', DATA.meta.dataset_version); q.set('utm_source','share'); q.set('utm_medium','referral');
  const url = new URL(DATA.meta.site); url.search = q.toString(); url.hash = ''; return url.href;
}
function parseShare(url) {
  let sp; try { sp = new URL(url, DATA.meta.site).searchParams; } catch { return null; }
  let ok = 0, bad = 0;
  let m = sp.getAll('m').length === 1 ? modelById(sp.get('m')) : null;
  if (m) ok++; else { if (sp.has('m')) bad++; m = modelById(DATA.default_model); }
  const vals = defaults(m);
  DATA.params.forEach(p => {
    if (!p.share_key || !sp.has(p.share_key)) return;
    const raw = sp.get(p.share_key), r = rowsFor(m).find(r => r.param === p.id);
    let good = false, val;
    if (sp.getAll(p.share_key).length !== 1) { bad++; return; }
    if (p.share_optin) { try { val = b64d(raw); good = Array.from(val).length <= 1000; } catch {} }
    else if (p.ui === 'toggle') { good = raw === '1' || raw === '0'; val = raw === '1'; if (p.id === 'batch' && val && !m.batch_tiers.length) good = false; }
    else if (p.ui === 'select') { good = !!r?.values.split('|').includes(raw); val = raw; }
    else if (p.ui === 'number') { const {min,max} = limits(m,p); val = Number(raw); good = /^\d+$/.test(raw) && Number.isSafeInteger(val) && val >= min && val <= max; }
    else { val = raw; good = val.length <= 1000; }
    if (good) { vals[p.id] = val; ok++; } else bad++;
  });
  return { m, vals, ok, bad, stale:sp.has('v') && sp.get('v') !== DATA.meta.dataset_version };
}
function geminiBatchRequest(body) {
  const request = { contents:[{role:'user',parts:[{text:body.input}]}], generationConfig:{} };
  if (body.generation_config?.max_output_tokens != null) request.generationConfig.maxOutputTokens = body.generation_config.max_output_tokens;
  if (body.generation_config?.thinking_level) request.generationConfig.thinkingConfig = {thinkingLevel:body.generation_config.thinking_level};
  if (body.system_instruction) request.systemInstruction = {parts:[{text:body.system_instruction}]};
  if (body.tools?.some(t => t.type === 'google_search')) request.tools = [{googleSearch:{}}];
  return request;
}
function curlRequest(provider, body, batch, model, comment = '') {
  const url = (batch ? provider.batch_endpoint : provider.endpoint).replace('{model}', encodeURIComponent(model));
  const headers = [provider.auth_header, ...(provider.extra_headers || '').split(/\r?\n/), 'Content-Type: application/json'].filter(Boolean);
  const quoteHeader = h => {
    // Keep only environment variable references expandable; quote all literal text.
    return h.split(/(\$[A-Z_][A-Z0-9_]*)/).map(piece => /^\$[A-Z_][A-Z0-9_]*$/.test(piece) ? '"' + piece + '"' : "'" + sq(piece) + "'").join('');
  };
  return comment + "curl -X POST '" + sq(url) + "' " + String.fromCharCode(92,10) + headers.map(h => '  -H ' + quoteHeader(h) + ' ' + String.fromCharCode(92,10)).join('') + "  -d '" + sq(JSON.stringify(body, null, 2)) + "'";
}
function genCode(lang, m, v) {
  const pv = DATA.providers[m.p], {body, notes} = buildRequest(m,v);
  const prefix = notes.flatMap(n => n.split(/\r?\n/)).map(n => '# ' + n + '\n').join('');
  let code;
  if (lang === 'curl' && (!v.batch || pv.api_style === 'messages')) code = curlRequest(pv, v.batch ? {requests:[{custom_id:'request-1',params:body}]} : body, v.batch, m.id, prefix);
  else code = genTemplate(lang,m,v);
  const cm = lang === 'js' ? '//' : '#';
  return `${cm} 入力の追加コンテキストはコードに含まれません。必要に応じて追加してください。\n` + code;
}

return {limits,normalizeValues,rowsFor,effortRow,defaults,estTokens,num,usd,yen,maxOut,calc,buildRequest,genCode,shareUrl,parseShare};
}
