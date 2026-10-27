const EVENTS = new Set(['select_provider','select_model','change_param','open_advanced','view_estimate','generate_code','switch_lang','copy_snippet','share_estimate','open_shared']);
const FIELDS = new Set(['dataset_version','provider','model','param','value','monthly_usd','mode','lang','system','cache','search','source','with_prompt','restored_count','ignored_count']);
let config, consent = { analytics:false, ads:false }, analyticsLoaded = false, adsLoaded = false;
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
    ad_storage:consent.ads ? 'granted' : 'denied',
    ad_user_data:consent.ads ? 'granted' : 'denied',
    ad_personalization:consent.ads ? 'granted' : 'denied',
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
  if (!adsLoaded && /^ca-pub-\d+$/.test(config.adsense?.client)) {
    const slots = [...document.querySelectorAll('[data-ad-slot]')].filter(box => /^\d+$/.test(config.adsense.slots[box.dataset.adSlot] || ''));
    if (!slots.length) return;
    adsLoaded=true;
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.requestNonPersonalizedAds = consent.ads ? 0 : 1;
    slots.forEach(box => {
      const ad = document.createElement('ins'); ad.className='adsbygoogle'; ad.style.display='block'; ad.style.width='100%';
      ad.dataset.adClient=config.adsense.client; ad.dataset.adSlot=config.adsense.slots[box.dataset.adSlot]; ad.dataset.adFormat='auto'; ad.dataset.fullWidthResponsive='true';
      box.replaceChildren(ad); window.adsbygoogle.push({});
    });
    script('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + config.adsense.client);
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
  if (saved?.version === 1) consent={analytics:saved.analytics===true,ads:saved.ads===true};
  applyConsent();
  if (debug() && document.getElementById('debugLog')) document.getElementById('debugLog').hidden=false;
  const dialog=document.createElement('dialog'); dialog.className='consent';
  dialog.innerHTML='<form method="dialog"><h2>計測と広告の設定</h2><p>料金計算はそのまま利用できます。広告枠が設定されている場合、広告は表示されます。選択はこのブラウザに保存され、いつでも変更できます。</p><label><input type="checkbox" name="analytics"> 利用状況の分析（Google Analytics）</label><label><input type="checkbox" name="ads"> パーソナライズ広告を許可（Google AdSense）</label><p><a href="privacy.html">送信される情報と利用目的</a></p><div class="consent-actions"><button type="button" class="btn tinted" id="consentDecline">分析・パーソナライズを拒否</button><button type="submit" class="btn tinted">選択を保存</button></div></form>';
  document.body.append(dialog);
  const form=dialog.querySelector('form');
  const open=()=>{
    form.elements.analytics.checked=consent.analytics; form.elements.ads.checked=consent.ads;
    form.elements.analytics.disabled=!config.ga4MeasurementId; form.elements.ads.disabled=!config.adsense?.client;
    if (!dialog.open) dialog.showModal();
  };
  const save=(next)=>{
    const reloadAds = adsLoaded && consent.ads !== next.ads;
    consent=next;
    try { localStorage.setItem('api-meter-consent-v1',JSON.stringify({version:1,...consent})); } catch {}
    applyConsent(); dialog.close();
    if (reloadAds) location.reload();
  };
  form.addEventListener('submit',event=>{event.preventDefault();save({analytics:form.elements.analytics.checked,ads:form.elements.ads.checked});});
  dialog.querySelector('#consentDecline').addEventListener('click',()=>save({analytics:false,ads:false}));
  document.getElementById('privacySettings')?.addEventListener('click',open);
  if (!saved && (config.ga4MeasurementId || config.adsense?.client)) open();
}
