const EVENTS = new Set(['select_provider','select_model','change_param','open_advanced','view_estimate','generate_code','switch_lang','copy_snippet','share_estimate','open_shared']);
const FIELDS = new Set(['dataset_version','provider','model','param','value','monthly_usd','mode','lang','system','cache','search','source','with_prompt','restored_count','ignored_count']);
let config, consent = { analytics:false }, analyticsLoaded = false;
export function cleanLocation(href) {
  try {
    const u = new URL(href);
    // Only known non-text estimate parameters are eligible for analytics.
    const allowed = new Set(['m','out','rpd','effort','ctx','cache','ws','batch','v','utm_source','utm_medium','debug']);
    for (const key of [...u.searchParams.keys()]) if (!allowed.has(key)) u.searchParams.delete(key);
    u.hash = ''; return u.href;
  } catch { return ''; }
}
export function eventPayload(params, href, referrer = '') {
  const payload = Object.fromEntries(Object.entries(params).filter(([key]) => FIELDS.has(key)));
  if (payload.param && ['prompt','system'].includes(payload.param)) delete payload.value;
  return { ...payload, page_location:cleanLocation(href), page_referrer:cleanLocation(referrer) };
}
function debug() { return new URLSearchParams(location.search).get('debug') === '1'; }
export function sendEvent(name, params) {
  if (!EVENTS.has(name)) return;
  const payload = eventPayload(params, location.href, document.referrer);
  if (analyticsLoaded && consent.analytics) window.gtag('event',name,{...payload,...(debug() ? {debug_mode:true} : {})});
  const panel = document.getElementById('debugLog'), log = document.getElementById('log');
  if (!debug() || !panel || !log) return;
  panel.hidden = false;
  if (!sendEvent.started) { log.textContent=''; sendEvent.started=true; }
  const row = document.createElement('div'); row.textContent = new Date().toLocaleTimeString('ja-JP') + ' ' + name + ' ' + JSON.stringify(payload);
  log.prepend(row); while (log.children.length > 100) log.lastChild.remove();
}
function script(src) { const node = document.createElement('script'); node.async=true; node.src=src; node.referrerPolicy='no-referrer'; document.head.append(node); }
function applyConsent() {
  window.gtag('consent','update',{
    analytics_storage:consent.analytics ? 'granted' : 'denied',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied',
  });
  if (/^G-[A-Z0-9]+$/.test(config.ga4MeasurementId)) {
    window['ga-disable-' + config.ga4MeasurementId] = !consent.analytics;
    if (consent.analytics && !analyticsLoaded) {
      analyticsLoaded=true;
      window.gtag('js',new Date());
      window.gtag('config',config.ga4MeasurementId,{ send_page_view:false, page_location:cleanLocation(location.href),page_referrer:cleanLocation(document.referrer),allow_google_signals:false,allow_ad_personalization_signals:false });
      window.gtag('event','page_view',{page_location:cleanLocation(location.href),page_referrer:cleanLocation(document.referrer),...(debug()?{debug_mode:true}:{})});
      script('https://www.googletagmanager.com/gtag/js?id=' + config.ga4MeasurementId);
    }
  }
}
export function initTelemetry(settings) {
  config=settings;
  // Restore shared input before calling this function. Remove sensitive query text before any third-party script loads.
  const url = new URL(location.href); url.searchParams.delete('p'); url.searchParams.delete('sys'); url.hash='';
  history.replaceState(null,'',url);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  let saved;
  try { saved=JSON.parse(localStorage.getItem('api-meter-consent-v1')); } catch {}
  if (saved?.version === 1) consent={analytics:saved.analytics===true};
  applyConsent();
  if (debug() && document.getElementById('debugLog')) document.getElementById('debugLog').hidden=false;
  const dialog=document.createElement('dialog'); dialog.className='consent';
  dialog.innerHTML='<form method="dialog"><h2>計測の設定</h2><p>料金計算はそのまま利用できます。選択はこのブラウザに保存され、いつでも変更できます。</p><label><input type="checkbox" name="analytics"> 利用状況の分析（Google Analytics）</label><p><a href="../privacy/">送信される情報と利用目的</a></p><div class="consent-actions"><button type="button" class="btn tinted" id="consentDecline">分析を拒否</button><button type="submit" class="btn tinted">選択を保存</button></div></form>';
  document.body.append(dialog);
  const form=dialog.querySelector('form');
  const open=()=>{
    form.elements.analytics.checked=consent.analytics;
    form.elements.analytics.disabled=!config.ga4MeasurementId;
    if (!dialog.open) dialog.showModal();
  };
  const save=(next)=>{
    consent=next;
    try { localStorage.setItem('api-meter-consent-v1',JSON.stringify({version:1,...consent})); } catch {}
    applyConsent(); dialog.close();
  };
  form.addEventListener('submit',event=>{event.preventDefault();save({analytics:form.elements.analytics.checked});});
  dialog.querySelector('#consentDecline').addEventListener('click',()=>save({analytics:false}));
  document.getElementById('privacySettings')?.addEventListener('click',open);
  if (!saved && config.ga4MeasurementId) open();
}
