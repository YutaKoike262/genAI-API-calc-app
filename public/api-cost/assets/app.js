import { loadData } from './data.js';
import { createEngine } from './core.js';
import { initTelemetry, sendEvent } from './telemetry.js';
import { CONFIG } from '../config.js';
import { setupTheme } from './theme.js';
setupTheme();
const $ = id => document.getElementById(id);
async function main() {
const { data: DATA, fallback } = await loadData(CONFIG);
const {limits,normalizeValues,rowsFor,effortRow,defaults,estTokens,num,usd,yen,maxOut,calc,buildRequest,genCode,shareUrl,parseShare} = createEngine(DATA);
const modelById = id => DATA.models.find(m => m.id === id);
const state = {model:modelById(DATA.default_model),vals:{},lang:'python',generated:null,withPrompt:false};
const track = (name, params) => sendEvent(name, {dataset_version:DATA.meta.dataset_version,...params});
$('dataStatus').textContent = (fallback ? '公開CSVを読み込めないため、予備データを表示しています。' : '公開CSVから料金データを読み込みました。') + (DATA.meta.data_note || '');
$('dataStatus').className = fallback ? 'note warn' : 'note info';

/* ======================================================================
   7. 描画
   ====================================================================== */
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "on") Object.entries(v).forEach(([ev, fn]) => e.addEventListener(ev, fn)); else if (v !== null && v !== undefined) e.setAttribute(k, v); });
  kids.forEach(k => e.append(k));
  return e;
}
function fieldFor(p) { // params の ui_type から入力部品を作る
  const id = "p-" + p.id, v = state.vals[p.id], bounds = limits(state.model, p);
  if (p.ui === "number") {
    const input = el("input", { id, type: "number", min: bounds.min, max: bounds.max, step: 1, inputmode: "numeric" });
    input.value = v;
    input.addEventListener("input", () => { state.vals = normalizeValues(state.model, {...state.vals, [p.id]: input.value}); update(); });
    input.addEventListener("change", () => { input.value = state.vals[p.id]; track("change_param", { param: p.id, value: state.vals[p.id] }); });
    return el("div", { class: "row" }, el("label", { for: id }, p.label), input, el("span", { class: "unit" }, p.unit || ""));
  }
  if (p.ui === "select") {
    const er = rowsFor(state.model).find(r => r.param === p.id), sel = el("select", { id });
    er.values.split("|").forEach(x => { const o = el("option", { value: x }, x + (x === er.def ? "（初期値）" : "")); sel.append(o); });
    sel.value = v;
    sel.addEventListener("change", () => { state.vals[p.id] = sel.value; update(); track("change_param", { param: p.id, value: sel.value }); });
    return el("div", { class: "row" }, el("label", { for: id }, p.label), sel);
  }
  if (p.ui === "textarea" || p.ui === "text") {
    const ta = el(p.ui === "text" ? "input" : "textarea", { id, placeholder: p.placeholder || "" }); ta.value = v || "";
    ta.addEventListener("input", () => { state.vals[p.id] = ta.value; update(); });
    ta.addEventListener("change", () => track("change_param", {param:p.id}));
    return el("div", { class: "area" }, el("label", { class: "lbl", for: id }, p.label), ta);
  }
  if (p.ui === "toggle") {
    const sw = el("button", { type: "button", class: "sw", role: "switch", "aria-checked": String(!!v), "aria-labelledby": "l-" + p.id });
    if (p.id === "batch" && !state.model.batch_tiers.length) { sw.disabled = true; sw.title = "このモデルのバッチ料金は未登録です"; }
    sw.addEventListener("click", () => { state.vals[p.id] = !state.vals[p.id]; sw.setAttribute("aria-checked", String(state.vals[p.id])); update(); track("change_param", { param: p.id, value: state.vals[p.id] }); });
    return el("div", { class: "row" }, el("span", { class: "lbl", id: "l-" + p.id }, p.label), sw);
  }
}
function renderForm() {
  const prov = $("providers"); prov.textContent = "";
  Object.entries(DATA.providers).filter(([k]) => DATA.models.some(m => m.p === k)).forEach(([k, pv]) => {
    const b = el("button", { type: "button", role: "tab", "aria-selected": String(state.model.p === k) }, pv.name);
    b.addEventListener("click", () => { selectModel(DATA.models.find(m => m.p === k)); track("select_provider", { provider: k }); });
    prov.append(b);
  });
  const sel = $("model"); sel.textContent = "";
  DATA.models.filter(m => m.p === state.model.p).forEach(m => sel.append(el("option", { value: m.id }, `${m.label}${m.needs_review ? "（要確認）" : ""}　$${m.tiers[0].input} / $${m.tiers[0].output}`)));
  sel.value = state.model.id;
  const m = state.model;
  $("modelFtr").textContent = m.id + "・単価は入力 / 出力、USD / 100万トークン" + (m.tiers.length > 1 ? "・入力 " + m.tiers[0].upTo.toLocaleString() + " トークン超は高料金" : "") + (m.future ? "・" + m.future.from + " から料金変更予定" : "");
  $("p-prompt").value = state.vals.prompt;
  const basic = $("basic"); basic.textContent = "";
  DATA.params.filter(p => p.group === "basic").forEach(p => basic.append(fieldFor(p), ...(p.help ? [el("div",{class:"ftr"},p.help)] : [])));
  const adv = $("advBody"); adv.textContent = "";
  DATA.params.filter(p => p.group === "advanced").forEach(p => adv.append(fieldFor(p), ...(p.help ? [el("div",{class:"ftr"},p.help)] : [])));
}
function selectModel(m) {
  state.vals = normalizeValues(m, state.vals);
  state.model = m; renderForm(); update();
}

function update() {
  const m = state.model, v = state.vals, pv = DATA.providers[m.p], r = calc(m, v, m.tiers);
  $("mLabel").textContent = m.label;
  $("monthly").textContent = $("barMonthly").textContent = usd(r.monthly);
  $("monthlyJpy").textContent = yen(r.monthly);
  $("perReq").textContent = usd(r.perReq); $("perReqJpy").textContent = '約' + Math.round(r.perReq * DATA.meta.fx_usdjpy).toLocaleString('ja-JP') + '円 / 回';
  $("requestCount").textContent = r.monthReq.toLocaleString('ja-JP') + ' 回'; $("perK").textContent = usd(r.perReq * 1000);
  const rows = [["入力", `$${r.t.input} / 100万`, r.cIn], ["キャッシュ読み出し", `$${r.t.cache} / 100万`, r.cCache], ["出力（思考込み）", `$${r.t.output} / 100万`, r.cOut],
    ["Web検索", `$${pv.web_search_per_1k} / 1,000回` + (pv.web_search_free ? `・月${pv.web_search_free.toLocaleString()}回無料` : ""), r.cSearch]];
  $("breakdown").replaceChildren(...rows.map(([k, rate, val]) => el("div", {}, el("span", {}, k + " ", el("small", {}, rate)), el("span", {}, usd(val)))));
  const showFuture = m.future && (!v.batch || m.future.batch_tiers.length);
  $("future").hidden = !showFuture;
  if (showFuture) { const r2 = calc(m, v, m.future.tiers, m.future.batch_tiers); $("future").textContent = `${m.future.from} 以降の公表価格では月額 ${usd(r2.monthly)}（${yen(r2.monthly)}）`; }
  $("longNote").hidden = !r.long;
  if (r.long) $("longNote").textContent = `入力が ${m.tiers[0].upTo.toLocaleString()} トークンを超えるため、長い入力向けの料金で計算しています。`;
  const source = el('a',{href:r.t.source_url || pv.pricing_url,target:'_blank',rel:'noopener noreferrer'},pv.vendor + ' 公式料金ページ');
  $('source').replaceChildren('出典: ', source, `（${m.checked_at || '確認日未登録'} 確認）` + (m.needs_review ? '・要確認（30日以上経過または確認日未登録）' : '') + (v.batch ? '・バッチ料金適用' : ''));
  $("tokFtr").textContent = `入力トークン概算 / 回: プロンプト ${estTokens(v.prompt).toLocaleString()} + システム ${estTokens(v.system).toLocaleString()} + その他 ${num(v.extra_input).toLocaleString()} = ${r.inTok.toLocaleString()}（目安）`;
  const bits = [v.effort]; if (String(v.system || "").trim()) bits.push("システム"); if (num(v.cache)) bits.push(`キャッシュ ${v.cache}%`); if (num(v.web_search)) bits.push(`検索 ×${Math.floor(num(v.web_search))}`); if (v.batch) bits.push("バッチ");
  $("advSum").textContent = bits.join("・");
  $("shareUrl").textContent = shareUrl(m, v, state.withPrompt);
  $("shareNote").textContent = state.withPrompt ? "プロンプトもURLに入ります。社内情報や個人情報が含まれていないか確認してください。" : "URLには設定値だけが入ります。金額は開いた時点の料金で計算し直されます。";
  const shared = new URL($('shareUrl').textContent);
  const fields = DATA.params.filter(p => p.share_key && shared.searchParams.has(p.share_key)).map(p => p.label);
  $('shareFields').textContent = '共有する項目: モデル・料金データの版' + (fields.length ? '・' + fields.join('・') : '') + '（省略した設定は初期値）';
  const omitted = DATA.params.filter(p => p.share_optin && Array.from(state.vals[p.id] || '').length > 1000);
  if (state.withPrompt && omitted.length) $('shareNote').textContent += ' 1,000文字を超える ' + omitted.map(p => p.label).join('・') + ' は含めません。';
  const g = state.generated;
  $('stale').hidden = !g || g.snap === snapshot();
  update.monthly = r.monthly;
  clearTimeout(update.t); update.t = setTimeout(() => track("view_estimate", { model: m.id, monthly_usd: Math.round(r.monthly * 100) / 100, mode: v.batch ? "batch" : "standard" }), 1200);
}
const snapshot = () => JSON.stringify({ m: state.model.id, v: state.vals });

function renderLangs() {
  $("langs").replaceChildren(...[["python", "Python"], ["curl", "curl"], ["js", "JS"]].map(([k, n]) => {
    const b = el("button", { type: "button", role: "tab", "aria-selected": String(state.lang === k) }, n);
    b.addEventListener("click", () => { state.lang = k; renderLangs(); renderCode(); track("switch_lang", { lang: k, model: state.model.id }); });
    return b;
  }));
}
function renderCode() {
  const g = state.generated; if (!g) return;
  const m = modelById(g.m);
  $("code").textContent = genCode(state.lang, m, g.v);
  $("codeMeta").textContent = `${m.id}・${g.at} 生成`;
  const on = (b, t) => el("span", { class: b ? "chip on" : "chip" }, t);
  $("included").replaceChildren(on(true, "推論 " + g.v.effort), on(true, "上限 " + maxOut(m, g.v).toLocaleString() + " トークン"), on(!!String(g.v.system || "").trim(), "システムプロンプト"),
    on(num(g.v.cache) > 0, "キャッシュ"), on(num(g.v.web_search) > 0, "Web検索"), on(!!g.v.batch, "バッチ"));
  $("copyBtn").disabled = false;
}
function generate(source) {
  state.generated = { m: state.model.id, v: JSON.parse(JSON.stringify(state.vals)), at: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }), snap: snapshot() };
  renderCode(); update();
  const v = state.vals;
  track("generate_code", { provider: state.model.p, model: state.model.id, lang: state.lang, mode: v.batch ? "batch" : "standard", system: !!String(v.system || "").trim(), cache: num(v.cache) > 0, search: num(v.web_search) > 0, source });
  if (source === "bar") $("code").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
}
async function copyText(text, btn, done) {
  try { await navigator.clipboard.writeText(text); const o = btn.textContent; btn.textContent = done; setTimeout(() => btn.textContent = o, 1800); return true; } catch (e) { $("restoreNote").hidden=false; $("restoreNote").textContent="コピーできませんでした。表示されているテキストを選択してコピーしてください。"; return false; }
}
function applyShare(url, source) {
  const r = parseShare(url);
  if (!r) { $("restoreNote").hidden = false; $("restoreNote").textContent = "URLを読み取れませんでした。"; return; }
  state.model = r.m; state.vals = r.vals; renderForm(); update();
  $("restoreNote").hidden = false;
  $("restoreNote").textContent = `共有された見積もりを表示しています（復元 ${r.ok} 件` + (r.bad ? `、無効な値 ${r.bad} 件は初期値に戻しました` : "") + "）。" + (r.stale ? "料金データが更新されたため、共有時と金額が異なる場合があります。" : "");
  track("open_shared", { model: r.m.id, restored_count: r.ok, ignored_count: r.bad, source });
}

/* ======================================================================
   8. イベント
   ====================================================================== */
$("checked").textContent = DATA.meta.updated_at;
$("fxText").textContent = DATA.meta.fx_usdjpy;
$("model").addEventListener("change", e => { selectModel(modelById(e.target.value)); track("select_model", { provider: state.model.p, model: state.model.id }); });
$("p-prompt").addEventListener("input", e => { state.vals.prompt = e.target.value; update(); });
$("p-prompt").addEventListener("change", () => track("change_param", {param:"prompt"}));
$("advBtn").addEventListener("click", () => {
  const open = $("advBtn").getAttribute("aria-expanded") !== "true";
  $("advBtn").setAttribute("aria-expanded", String(open)); $("advBody").hidden = !open;
  if (open) track("open_advanced", { model: state.model.id });
});
$("genBtn").addEventListener("click", () => generate("main"));
$("barGen").addEventListener("click", () => generate("bar"));
$("regen").addEventListener("click", () => generate("stale_banner"));
$("copyBtn").addEventListener("click", async () => {
  const g = state.generated; if (!g) return;
  if (!await copyText($("code").textContent, $("copyBtn"), "コピー済み")) return;
  track("copy_snippet", { provider: modelById(g.m).p, model: g.m, lang: state.lang, mode: g.v.batch ? "batch" : "standard" });
});
$("optin").addEventListener("click", () => { state.withPrompt = !state.withPrompt; $("optin").setAttribute("aria-checked", String(state.withPrompt)); update(); });
$("shareBtn").addEventListener("click", async () => {
  const url = shareUrl(state.model, state.vals, state.withPrompt);
  let shared = false;
  if (navigator.share && matchMedia("(max-width: 939px)").matches) { try { await navigator.share({ title: "API料金の見積もり", url }); shared = true; } catch (e) { if (e.name === "AbortError") return; } }
  if (!shared) shared = await copyText(url, $("shareBtn"), "コピーしました");
  if (!shared) return;
  track("share_estimate", { model: state.model.id, monthly_usd: Math.round(update.monthly * 100) / 100, with_prompt: state.withPrompt });
});
$("pasteBtn").addEventListener("click", () => applyShare($("pasteIn").value || shareUrl(state.model, state.vals, state.withPrompt), "paste"));

/* 初期化: URLに m= があれば共有された見積もりとして復元 */
const incomingUrl = location.href;
initTelemetry(CONFIG);
state.vals = defaults(state.model);
renderForm(); renderLangs(); update();
if (new URL(incomingUrl).searchParams.has("m")) applyShare(incomingUrl, "url");
$('genBtn').disabled = $('barGen').disabled = false;
}
main().catch(error => { console.error(error); $('dataStatus').textContent='料金データを読み込めませんでした。接続を確認してページを再読み込みしてください。'; $('dataStatus').className='note warn'; });
