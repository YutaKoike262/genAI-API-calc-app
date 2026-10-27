export const SHEETS = ['providers', 'models', 'prices', 'features', 'params', 'param_map', 'meta'];
const BASE = {
  prompt: { def: null }, max_output: { def: 800, min: 1, max: 1000000 },
  requests_per_day: { def: 500, min: 0, max: 100000000 }, system: { def: '' },
  effort: { def: null }, extra_input: { def: 2000, min: 0, max: 2000000 },
  cache: { def: 0, min: 0, max: 100 }, web_search: { def: 0, min: 0, max: 100 }, batch: { def: false },
};
const safeKey = key => /^[a-zA-Z_][\w.-]*$/.test(key) && !['__proto__', 'constructor', 'prototype'].includes(key);
const required = (value, name) => { if (value === '' || value == null) throw Error(`${name} が必要です`); return String(value); };
const number = (value, name, fallback) => {
  if (value === '' || value == null) { if (fallback !== undefined) return fallback; throw Error(`${name} が必要です`); }
  const n = Number(value); if (!Number.isFinite(n) || n < 0) throw Error(`${name} が不正です`); return n;
};
const date = value => {
  if (!value) return '';
  const s = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0, 10) !== s) throw Error(`日付が不正です: ${s}`);
  return s;
};
export const todayJST = (now = new Date()) => new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
const active = (row, day) => (!row.effective_from || row.effective_from <= day) && (!row.effective_to || row.effective_to >= day);
function unique(rows, key) {
  const seen = new Set();
  for (const row of rows) { const id = required(row[key], key); if (!safeKey(id) || seen.has(id)) throw Error(`${key} が重複または不正です`); seen.add(id); }
}
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw Error('CSVの引用符が不正です'); quoted = true;
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(cell); cell = ''; closed = false;
      if (c !== ',') { if (row.some(v => v !== '')) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else { if (closed) throw Error('CSVの引用符の後に文字があります'); cell += c; }
  }
  if (quoted) throw Error('CSVの引用符が閉じていません');
  row.push(cell); if (row.some(v => v !== '')) rows.push(row);
  const headers = rows.shift()?.map(x => x.trim());
  if (!headers?.length || headers.some(x => !safeKey(x)) || new Set(headers).size !== headers.length) throw Error('CSVヘッダーが不正です');
  return rows.map(values => {
    if (values.length !== headers.length) throw Error('CSVの列数が一致しません');
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}
function validUrl(value) {
  if (!value) return '';
  const u = new URL(value.replace('{model}', 'model'));
  if (u.protocol !== 'https:') throw Error('URLにはHTTPSが必要です');
  return value;
}
export function normalizeTables(tables, { day = todayJST(), siteUrl = 'http://localhost/' } = {}) {
  for (const name of SHEETS) if (!Array.isArray(tables[name])) throw Error(`${name} シートがありません`);
  unique(tables.providers, 'provider_id'); unique(tables.models, 'model_id'); unique(tables.params, 'param_id'); unique(tables.meta, 'key');
  const meta = Object.fromEntries(tables.meta.map(r => [r.key, r.value]));
  required(meta.dataset_version, 'dataset_version'); date(required(meta.updated_at, 'updated_at'));
  meta.fx_usdjpy = number(meta.fx_usdjpy, 'fx_usdjpy'); if (!meta.fx_usdjpy) throw Error('為替は0より大きい値が必要です');
  meta.site = new URL(siteUrl).href.split(/[?#]/)[0];
  const providers = Object.fromEntries([...tables.providers].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0)).map(r => {
    if (!['messages', 'responses', 'interactions'].includes(r.api_style)) throw Error('api_style が不正です');
    return [r.provider_id, { ...r, name: required(r.name, 'provider.name'), vendor: required(r.vendor, 'vendor'), endpoint: validUrl(required(r.endpoint, 'endpoint')), batch_endpoint: validUrl(r.batch_endpoint), pricing_url: validUrl(r.pricing_url), web_search_per_1k: 0, web_search_free: 0, features: {} }];
  }));
  const scheduled = rows => rows.map(r => {
    const from = date(r.effective_from), to = date(r.effective_to); date(r.checked_at);
    if (from && to && from > to) throw Error('適用期間が不正です');
    return { ...r, effective_from: from, effective_to: to };
  });
  const features = scheduled(tables.features);
  for (const r of features.filter(r => active(r, day))) {
    const p = providers[r.provider_id]; if (!p || r.unit !== 'per_1k_calls') throw Error('features が不正です');
    if (p.features[r.feature]) throw Error('機能料金の適用期間が重複しています');
    p.features[r.feature] = { price: number(r.price, 'feature.price'), free: number(r.free_per_month, 'feature.free', 0) };
    if (r.feature === 'web_search') { p.web_search_per_1k = p.features[r.feature].price; p.web_search_free = p.features[r.feature].free; }
  }
  const prices = scheduled(tables.prices).map(r => {
    if (!tables.models.some(m => m.model_id === r.model_id) || !['base', 'long'].includes(r.tier) || !['standard', 'batch'].includes(r.mode)) throw Error('prices の参照または区分が不正です');
    return { ...r, input: number(r.input, 'input'), output: number(r.output, 'output'), cache: number(r.cache_read, 'cache_read'), source_url: validUrl(r.source_url) };
  });
  function tiersAt(m, mode, at) {
    const rows = prices.filter(r => r.model_id === m.model_id && r.mode === mode && active(r, at));
    if (!rows.length) return [];
    if (new Set(rows.map(r => r.tier)).size !== rows.length || !rows.some(r => r.tier === 'base')) throw Error('料金の適用期間が重複、またはbase料金がありません');
    const threshold = number(m.long_threshold, 'long_threshold', 0);
    if (threshold && !rows.some(r => r.tier === 'long')) throw Error('長文料金がありません');
    if (!threshold && rows.some(r => r.tier === 'long')) throw Error('long_threshold がありません');
    return rows.sort((a, b) => a.tier === b.tier ? 0 : a.tier === 'base' ? -1 : 1).map(r => ({ ...r, upTo: r.tier === 'base' && threshold ? threshold : Infinity }));
  }
  const models = [...tables.models].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0)).flatMap(m => {
    if (!providers[m.provider_id] || !['current', 'legacy', 'preview', 'hidden'].includes(m.status)) throw Error('models が不正です');
    if (m.status === 'hidden') return [];
    const tiers = tiersAt(m, 'standard', day); if (!tiers.length) return [];
    const batch_tiers = tiersAt(m, 'batch', day);
    const dates = [...new Set(prices.filter(r => r.model_id === m.model_id && r.effective_from > day).map(r => r.effective_from))].sort();
    const next = dates.find(at => tiersAt(m, 'standard', at).length);
    const checked = [...tiers, ...batch_tiers].map(t => t.checked_at || '').sort()[0];
    return [{ ...m, id: m.model_id, p: m.provider_id, label: required(m.label, 'label'), max_output: number(m.max_output, 'max_output'), tiers, batch_tiers,
      checked_at: checked, needs_review: !checked || Date.parse(day) - Date.parse(checked) >= 30 * 86400000,
      future: next ? { from: next, tiers: tiersAt(m, 'standard', next), batch_tiers: tiersAt(m, 'batch', next) } : null }];
  });
  if (!models.length || models.some(m => !m.max_output)) throw Error('有効なモデルがありません');
  const params = [...tables.params].sort((a,b) => Number(a.sort || 0) - Number(b.sort || 0)).map(r => {
    if (!['select','number','text','textarea','toggle'].includes(r.ui_type) || !['basic','advanced'].includes(r.group)) throw Error('params が不正です');
    if (r.share_key && !safeKey(r.share_key)) throw Error('share_key が不正です');
    const base = BASE[r.param_id] || {def: r.ui_type === 'toggle' ? false : r.ui_type === 'number' ? 0 : '', min:0, max:1000000};
    const p = { ...base, ...r, id:r.param_id, ui:r.ui_type, group:r.param_id === 'prompt' ? 'prompt' : r.group, share_optin:String(r.share_optin).toLowerCase() === 'true' };
    if (p.id === 'requests_per_day') Object.assign(p, { label:'1日のリクエスト数', unit:'回/日', help:'月額目安はこの回数を30日分として計算します。' , share_key:'rpd' });
    if (p.id === 'extra_input') Object.assign(p, { help:'プロンプト欄に含めていない会話履歴や追加テキストのトークン数です。初期値は2,000トークンで、料金計算に含まれます。' });
    return p;
  });
  for (const id of Object.keys(BASE)) if (!params.some(p => p.id === id)) throw Error(`${id} パラメーターがありません`);
  const keys = params.map(p => p.share_key).filter(Boolean);
  if (new Set(keys).size !== keys.length || keys.some(k => ['m','v','utm_source','utm_medium'].includes(k))) throw Error('share_key が重複しています');
  // Prompt text is always opt-in, even if the sheet is misconfigured.
  for (const p of params) if (['prompt','system'].includes(p.id)) { p.share_optin = true; if (p.share_key !== (p.id === 'prompt' ? 'p' : 'sys')) throw Error('プロンプトの共有キーが不正です'); }
  const seen = new Set();
  const param_map = tables.param_map.map(r => {
    const [scope, id] = r.scope.split(':');
    if (!(scope === 'provider' ? providers[id] : scope === 'model' && tables.models.some(m => m.model_id === id)) || !params.some(p => p.id === r.param_id)) throw Error('param_map の参照が不正です');
    const key = r.scope + ':' + r.param_id; if (seen.has(key)) throw Error('param_map が重複しています'); seen.add(key);
    if (!['always','if_set','if_positive','never'].includes(r.emit)) throw Error('emit が不正です');
    const path = r.path === '—' ? '' : r.path || '';
    if (path && path.replace(/\[\]$/, '').split('.').some(k => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) || !safeKey(k))) throw Error('path が不正です');
    const transform = (r.transform || 'none').split(/[,|\s]+/).filter(Boolean);
    if (transform.some(t => !['none','round_up_256','cap_model_max'].includes(t))) throw Error('transform が不正です');
    if (r.template) JSON.parse(r.template.replaceAll('{value}', '1'));
    const p = params.find(p => p.id === r.param_id);
    const min = number(r.min, 'min', p.min ?? 0), max = number(r.max, 'max', p.max ?? 1000000);
    if (min > max) throw Error('min/max が不正です');
    return { ...r, param:r.param_id, path, def:r.default === '' || r.default == null ? undefined : r.default, min, max, transform:transform.join(',') };
  });
  for (const m of models) {
    const relevant = param_map.filter(r => r.scope === 'provider:' + m.p || r.scope === 'model:' + m.id);
    for (const p of params.filter(p => p.ui === 'number')) {
      const r = relevant.findLast(r => r.param === p.id && r.scope.startsWith('model:')) || relevant.find(r => r.param === p.id);
      const min = Math.max(p.min ?? 0, r?.min ?? 0);
      const max = Math.min(p.max ?? 1000000, r?.max ?? Infinity, p.id === 'max_output' ? m.max_output : Infinity);
      if (min > max) throw Error('モデルに対する数値範囲が不正です');
    }
    for (const p of params.filter(p => p.ui === 'select')) {
      const r = relevant.findLast(r => r.param === p.id && r.scope.startsWith('model:')) || relevant.find(r => r.param === p.id);
      if (!r?.values || (r.def !== undefined && !r.values.split('|').includes(r.def))) throw Error('選択肢の初期値が不正です');
    }
    for (const id of ['prompt', 'max_output']) if (!relevant.some(r => r.param === id && r.path && r.emit !== 'never')) throw Error('コード生成に必要なマッピングがありません');
  }
  const default_model = models.some(m => m.id === meta.default_model) ? meta.default_model : models[0].id;
  return { meta, providers, models, params, param_map, default_model, default_prompt:meta.default_prompt || 'この商品レビューを3行で要約してください。' };
}
export async function loadData(config, { fetcher = fetch, day = todayJST(), baseUrl = globalThis.location?.href || 'http://localhost/' } = {}) {
  const siteUrl = config.siteUrl || new URL('./', baseUrl).href;
  const read = async (url, type) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.fetchTimeoutMs || 8000);
    try { const response = await fetcher(url, { cache:'no-store', referrerPolicy:'no-referrer', signal:controller.signal }); if (!response.ok) throw Error('HTTP ' + response.status); return type === 'json' ? await response.json() : await response.text(); }
    finally { clearTimeout(timer); }
  };
  try {
    if (SHEETS.some(key => !config.csv?.[key])) throw Error('公開CSVが未設定です');
    const rows = await Promise.all(SHEETS.map(async key => {
      const url = new URL(config.csv[key], baseUrl);
      if (url.origin !== new URL(baseUrl).origin && (url.protocol !== 'https:' || url.hostname !== 'docs.google.com')) throw Error('CSVはGoogle公開CSVまたは同一サイトに設定してください');
      return [key, parseCSV(await read(url.href, 'text'))];
    }));
    return { data:normalizeTables(Object.fromEntries(rows), {day, siteUrl}), fallback:false };
  } catch (error) {
    const tables = await read(new URL('data/fallback.json', new URL('./', baseUrl)).href, 'json');
    return { data:normalizeTables(tables, {day, siteUrl}), fallback:true, reason:error.message };
  }
}
