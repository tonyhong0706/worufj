const diceStage = document.querySelector('#dice-stage');
const diceCount = document.querySelector('#dice-count');
const rollButton = document.querySelector('#roll-button');
const totalResult = document.querySelector('#total-result');
const rollCount = document.querySelector('#roll-count');
const historyList = document.querySelector('#history-list');
const clearHistoryButton = document.querySelector('#clear-history');

const pipLayouts = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

let rollNumber = 1;
let history = [];

function createDie(value, isRolling = false) {
  const die = document.createElement('div');
  die.className = `dice${isRolling ? ' is-rolling' : ''}`;
  die.setAttribute('aria-label', `${value} 點`);

  pipLayouts[value].forEach((position) => {
    const pip = document.createElement('span');
    pip.className = 'pip';
    pip.style.gridColumn = `${position % 3 + 1}`;
    pip.style.gridRow = `${Math.floor(position / 3) + 1}`;
    die.appendChild(pip);
  });

  return die;
}

function renderDice(values, isRolling = false) {
  diceStage.replaceChildren(...values.map((value) => createDie(value, isRolling)));
}

function addHistory(values, total) {
  const item = document.createElement('article');
  item.className = 'history-item';
  const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  item.innerHTML = `<span class="history-time">${time}</span><span class="history-dice">${values.map((value) => `骰子 ${value}`).join(' · ')}</span><strong class="history-total">${total} 點</strong>`;
  historyList.prepend(item);
  history = [{ values, total, time }, ...history].slice(0, 6);
}

function rollDice() {
  const count = Number(diceCount.value);
  const values = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
  const total = values.reduce((sum, value) => sum + value, 0);

  rollButton.disabled = true;
  renderDice(values, true);
  totalResult.textContent = '...';

  window.setTimeout(() => {
    renderDice(values);
    totalResult.textContent = total;
    rollCount.textContent = `第 ${rollNumber} 次`;
    rollNumber += 1;
    addHistory(values, total);
    rollButton.disabled = false;
  }, 520);
}

function clearHistory() {
  history = [];
  historyList.innerHTML = '<p class="empty-state">你的擲骰紀錄會顯示在這裡。</p>';
}

rollButton.addEventListener('click', rollDice);
clearHistoryButton.addEventListener('click', clearHistory);
