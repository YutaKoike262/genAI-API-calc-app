import { estTokens } from '../api-cost/assets/core.js';

const sample = document.getElementById('sample');
const counts = document.getElementById('counts');
function update() {
  const text = sample.value;
  const characters = Array.from(text).length;
  counts.textContent = characters.toLocaleString('ja-JP') + ' 文字 ／ 約 ' +
    estTokens(text).toLocaleString('ja-JP') + ' トークン';
}
sample.addEventListener('input', update);
window.addEventListener('pageshow', update);
update();
