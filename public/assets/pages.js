import { CONFIG } from '../config.js';
import { initTelemetry } from './telemetry.js';
initTelemetry(CONFIG);
const name = document.getElementById('operatorName'), contact = document.getElementById('operatorContact');
if (name) name.textContent=CONFIG.operator.name || '準備中（公開前に設定してください）';
if (contact && CONFIG.operator.contactUrl) {
  try {
    const url=new URL(CONFIG.operator.contactUrl);
    if (['https:','mailto:'].includes(url.protocol)) {
      const link=document.createElement('a');link.href=url.href;link.textContent='お問い合わせ';link.rel='noreferrer';contact.replaceChildren(link);
    }
  } catch {}
}
