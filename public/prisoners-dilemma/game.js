const strategies = {
  'tit-for-tat': { description: '初回は協力し、次からあなたの前回の行動をまねます。', choose: history => history.length ? history.at(-1).player : 'cooperate' },
  cooperate: { description: '毎回、協力を選びます。', choose: () => 'cooperate' },
  defect: { description: '毎回、裏切りを選びます。', choose: () => 'defect' },
  forgiving: { description: '初回は協力。あなたの前回の裏切りを30%の確率で許します。', choose: history => !history.length || history.at(-1).player === 'cooperate' || Math.random() < 0.3 ? 'cooperate' : 'defect' },
  random: { description: '毎回、協力と裏切りを50%ずつの確率で選びます。', choose: () => Math.random() < 0.5 ? 'cooperate' : 'defect' },
};
const scores = { cooperate: { cooperate: [3, 3], defect: [0, 5] }, defect: { cooperate: [5, 0], defect: [1, 1] } };
const labels = { cooperate: '協力', defect: '裏切り' };
const $ = id => document.getElementById(id);
const history = [];
let playerScore = 0;
let opponentScore = 0;
function setHelp() { $('strategy-help').textContent = strategies[$('strategy').value].description; }
function maybeFlip(choice, probability) { return Math.random() < probability ? (choice === 'cooperate' ? 'defect' : 'cooperate') : choice; }
function play(selection) {
  if (history.length >= 10) return;
  const strategy = strategies[$('strategy').value];
  const opponentSelection = strategy.choose(history);
  const probability = Number($('noise').value);
  const player = maybeFlip(selection, probability);
  const opponent = maybeFlip(opponentSelection, probability);
  const [mine, theirs] = scores[player][opponent];
  playerScore += mine; opponentScore += theirs;
  history.push({ player, opponent });
  $('strategy').disabled = true; $('noise').disabled = true;
  $('my-score').textContent = playerScore; $('their-score').textContent = opponentScore;
  $('round').textContent = history.length === 10 ? '10回終了' : `${history.length + 1} / 10 回目`;
  $('feedback').textContent = `あなたは${labels[player]}、相手は${labels[opponent]}。あなた +${mine}点、相手 +${theirs}点。` + (player !== selection || opponent !== opponentSelection ? ' 伝達ミスが発生しました。' : '') + (history.length === 10 ? ' 対戦終了。設定を変えてもう一度試せます。' : '');
  if (history.length === 1) $('history').replaceChildren();
  const row = document.createElement('tr');
  for (const value of [history.length, labels[player], labels[opponent], `${mine} / ${theirs}`]) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
  $('history').append(row);
  if (history.length === 10) { $('cooperate').disabled = true; $('defect').disabled = true; }
}
function reset() {
  history.length = 0; playerScore = 0; opponentScore = 0;
  $('my-score').textContent = '0'; $('their-score').textContent = '0'; $('round').textContent = '1 / 10 回目';
  $('feedback').textContent = '相手も同時に選びます。';
  $('history').innerHTML = '<tr><td colspan="4">選択すると結果が表示されます。</td></tr>';
  $('strategy').disabled = false; $('noise').disabled = false; $('cooperate').disabled = false; $('defect').disabled = false;
}
$('strategy').addEventListener('change', setHelp);
$('cooperate').addEventListener('click', () => play('cooperate'));
$('defect').addEventListener('click', () => play('defect'));
$('restart').addEventListener('click', reset);
setHelp();
