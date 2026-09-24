const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayCopy = document.getElementById('overlay-copy');
const restartButton = document.getElementById('restart');

const W = canvas.width;
const H = canvas.height;
const groundY = 330;
const colors = { ink: '#101820', red: '#e10600', yellow: '#ffd200', blue: '#0b3d91', white: '#fffdf6', gray: '#8ca0a5' };
const maxImage = new Image();
const f1Image = new Image();
let maxImageReady = false;
let f1ImageReady = false;

maxImage.onload = () => { maxImageReady = true; };
f1Image.onload = () => { f1ImageReady = true; };
maxImage.src = 'assets/assetsmax-verstappen.png';
f1Image.src = 'assets/images.png';

let best = Number(localStorage.getItem('verstappen-best') || 0);
let score = 0;
let speed = 6;
let distance = 0;
let running = false;
let gameOver = false;
let lastTime = 0;
let spawnTimer = 700;
let stripeOffset = 0;
let obstacles = [];

const player = { x: 130, y: groundY - 58, w: 100, h: 58, vy: 0, jumping: false };

function resetGame() {
  score = 0;
  speed = 6;
  distance = 0;
  spawnTimer = 700;
  stripeOffset = 0;
  obstacles = [];
  player.y = groundY - player.h;
  player.vy = 0;
  player.jumping = false;
  running = false;
  gameOver = false;
  overlayTitle.textContent = 'READY TO RACE?';
  overlayCopy.innerHTML = '按 <kbd>空白鍵</kbd> 或點擊畫面跳躍';
  overlay.classList.remove('hidden');
  updateHud();
  draw();
}

function startOrJump() {
  if (gameOver) { resetGame(); return; }
  if (!running) { running = true; overlay.classList.add('hidden'); }
  if (!player.jumping) {
    player.vy = -15;
    player.jumping = true;
  }
}

function updateHud() {
  scoreEl.textContent = String(score).padStart(5, '0');
  bestEl.textContent = String(best).padStart(5, '0');
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawBackground() {
  ctx.fillStyle = '#fbfaf4';
  ctx.fillRect(0, 0, W, H);
  rect(0, 0, W, 8, colors.yellow);
  rect(0, groundY, W, H - groundY, '#e5ece8');

  ctx.strokeStyle = '#b8c8c5';
  ctx.lineWidth = 2;
  for (let x = -stripeOffset % 48; x < W; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, groundY + 30); ctx.lineTo(x + 20, groundY + 30); ctx.stroke();
  }
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
  ctx.fillStyle = colors.red;
  for (let x = -stripeOffset % 42; x < W; x += 42) ctx.fillRect(x, groundY + 4, 21, 9);
  ctx.fillStyle = colors.white;
  for (let x = 21 - stripeOffset % 42; x < W; x += 42) ctx.fillRect(x, groundY + 4, 21, 9);

  drawCloud(160, 82, 1);
  drawCloud(650, 120, .75);
  drawCheckeredFlag(820, 52);
}

function drawCloud(x, y, scale) {
  ctx.fillStyle = '#d8e4e2';
  rect(x, y + 12 * scale, 72 * scale, 11 * scale, colors.white);
  rect(x + 13 * scale, y + 3 * scale, 23 * scale, 18 * scale, colors.white);
  rect(x + 35 * scale, y - 4 * scale, 20 * scale, 25 * scale, colors.white);
  rect(x + 55 * scale, y + 6 * scale, 18 * scale, 17 * scale, colors.white);
  ctx.strokeStyle = '#b8c8c5'; ctx.lineWidth = 2;
  ctx.strokeRect(x, y + 12 * scale, 72 * scale, 11 * scale);
}

function drawCheckeredFlag(x, y) {
  rect(x, y, 3, 65, colors.ink);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    rect(x + 3 + col * 9, y + row * 9, 9, 9, (row + col) % 2 ? colors.white : colors.ink);
  }
}

function drawCar(x, y, scale = 1, carried = false) {
  if (f1ImageReady) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(f1Image, x - 8 * scale, y - 4 * scale, 118 * scale, 68 * scale);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  rect(13, 25, 73, 12, colors.red);
  rect(26, 17, 38, 10, colors.blue);
  rect(34, 10, 18, 9, colors.blue);
  rect(13, 22, 11, 5, colors.yellow);
  rect(64, 28, 31, 4, colors.yellow);
  rect(5, 34, 100, 4, colors.ink);
  rect(22, 38, 13, 13, colors.ink);
  rect(72, 38, 13, 13, colors.ink);
  rect(25, 40, 7, 7, colors.gray);
  rect(75, 40, 7, 7, colors.gray);
  rect(0, 22, 16, 6, colors.ink);
  rect(86, 22, 20, 6, colors.ink);
  if (carried) { rect(47, 0, 5, 12, colors.ink); }
  ctx.restore();
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  if (!player.jumping) {
    drawCar(x, y + 8, 1);
    if (maxImageReady) {
      drawMax(x + 27, y - 15, .52);
    } else {
      rect(x + 39, y - 5, 20, 18, colors.red);
      rect(x + 43, y - 14, 14, 12, colors.blue);
      rect(x + 45, y - 13, 7, 5, colors.white);
      rect(x + 34, y + 13, 10, 5, colors.yellow);
    }
  } else {
    drawCar(x - 2, y - 36, .95, true);
    if (maxImageReady) {
      drawMax(x + 27, y - 1, .52);
    } else {
      rect(x + 39, y + 3, 18, 23, colors.red);
      rect(x + 43, y - 7, 14, 12, colors.blue);
      rect(x + 46, y - 6, 7, 5, colors.white);
      rect(x + 31, y - 1, 10, 5, colors.ink);
      rect(x + 55, y - 1, 10, 5, colors.ink);
      rect(x + 37, y + 26, 7, 20, colors.ink);
      rect(x + 56, y + 26, 7, 20, colors.ink);
      rect(x + 30, y + 43, 16, 5, colors.ink);
      rect(x + 55, y + 43, 16, 5, colors.ink);
    }
  }
}

function drawMax(x, y, scale) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(maxImage, x, y, 56 * scale, 84 * scale);
  ctx.restore();
}

function spawnObstacle() {
  const roll = Math.random();
  if (roll < .34) obstacles.push({ type: 'kerb', x: W + 20, y: groundY - 30, w: 52, h: 30 });
  else if (roll < .68) obstacles.push({ type: 'tires', x: W + 20, y: groundY - 48, w: 34, h: 48 });
  else obstacles.push({ type: 'toto', x: W + 20, y: groundY - 70, w: 46, h: 70 });
}

function drawObstacle(item) {
  const { x, y } = item;
  if (item.type === 'kerb') {
    for (let i = 0; i < 4; i++) rect(x + i * 13, y + 12, 13, 18, i % 2 ? colors.white : colors.red);
    rect(x, y + 10, 52, 3, colors.ink);
  } else if (item.type === 'tires') {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = colors.ink;
      ctx.beginPath(); ctx.arc(x + 17, y + 40 - i * 14, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colors.gray;
      ctx.beginPath(); ctx.arc(x + 17, y + 40 - i * 14, 6, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    rect(x + 20, y + 18, 7, 52, colors.ink);
    rect(x, y, 46, 27, colors.yellow);
    rect(x + 4, y + 5, 38, 4, colors.ink);
    rect(x + 7, y + 13, 32, 4, colors.red);
    rect(x + 10, y + 30, 27, 10, colors.ink);
    rect(x + 2, y + 40, 43, 5, colors.red);
  }
}

function collides(a, b) {
  return a.x + 22 < b.x + b.w - 4 && a.x + a.w - 20 > b.x + 4 && a.y + 8 < b.y + b.h && a.y + a.h > b.y + 5;
}

function update(dt) {
  if (!running || gameOver) return;
  distance += speed * dt / 16.67;
  score = Math.floor(distance / 8);
  speed = Math.min(12, 6 + score / 450);
  stripeOffset = (stripeOffset + speed * dt / 16.67) % 42;
  player.vy += .72 * dt / 16.67;
  player.y += player.vy * dt / 16.67;
  if (player.y >= groundY - player.h) {
    player.y = groundY - player.h;
    player.vy = 0;
    player.jumping = false;
  }
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = Math.max(580, 1250 - speed * 50 + Math.random() * 500);
  }
  obstacles.forEach(item => item.x -= speed * dt / 16.67);
  obstacles = obstacles.filter(item => item.x > -120);
  const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (obstacles.some(item => collides(playerBox, item))) endGame();
  updateHud();
}

function endGame() {
  running = false;
  gameOver = true;
  best = Math.max(best, score);
  localStorage.setItem('verstappen-best', best);
  overlayTitle.textContent = 'RACE OVER';
  overlayCopy.innerHTML = '按 <kbd>空白鍵</kbd> 或點擊畫面再跑一次';
  overlay.classList.remove('hidden');
  updateHud();
}

function draw() {
  drawBackground();
  obstacles.forEach(drawObstacle);
  drawPlayer();
  if (running) {
    ctx.fillStyle = colors.ink;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('LAP 01  //  PUSH', 22, 30);
  }
}

function loop(time) {
  const dt = Math.min(34, time - lastTime || 16.67);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', event => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    startOrJump();
  }
});
canvas.addEventListener('pointerdown', startOrJump);
restartButton.addEventListener('click', resetGame);
resetGame();
requestAnimationFrame(loop);
