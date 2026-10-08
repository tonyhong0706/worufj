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
const colors = { ink: '#101820', red: '#e10600', yellow: '#ffd200', white: '#fffdf6', gray: '#8ca0a5' };
const playerImage = new Image();
const playerImageCanvas = document.createElement('canvas');
const playerImageContext = playerImageCanvas.getContext('2d', { willReadFrequently: true });
let playerImageReady = false;
let gifFrames = [];
let currentGifFrame = -1;
let runAnimationTime = 0;

playerImage.onload = () => {
  if (playerImageReady) return;
  playerImageCanvas.width = playerImage.naturalWidth;
  playerImageCanvas.height = playerImage.naturalHeight;
  playerImageContext.drawImage(playerImage, 0, 0);
  playerImageContext.putImageData(removeGreenScreen(
    playerImageContext.getImageData(0, 0, playerImageCanvas.width, playerImageCanvas.height)
  ), 0, 0);
  playerImageReady = true;
};
playerImage.onerror = () => console.error('無法載入主角 GIF：assets/BAR.gif');
playerImage.src = 'assets/BAR.gif';
decodeGifFrames();

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

const player = { x: 130, y: groundY - 92, w: 100, h: 92, vy: 0, jumping: false };

function resetGame() {
  score = 0;
  speed = 6;
  distance = 0;
  runAnimationTime = 0;
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
  if (gameOver) resetGame();
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

function drawPlayer() {
  if (!playerImageReady || playerImageCanvas.width === 0 || playerImageCanvas.height === 0) return;

  if (gifFrames.length) {
    const frameIndex = running ? getGifFrameIndex(runAnimationTime) : 0;
    if (frameIndex !== currentGifFrame) {
      playerImageContext.putImageData(gifFrames[frameIndex].image, 0, 0);
      currentGifFrame = frameIndex;
    }
  }

  const imageWidth = playerImageCanvas.width;
  const imageHeight = playerImageCanvas.height;
  const size = 100;
  const croppedHeight = imageHeight - 18;
  const drawHeight = size * croppedHeight / imageHeight;
  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h - drawHeight / 2);
  ctx.scale(-1, 1);
  ctx.drawImage(playerImageCanvas, 0, 0, imageWidth, croppedHeight, -size / 2, -drawHeight / 2, size, drawHeight);
  ctx.restore();
}

function removeGreenScreen(image) {
  for (let i = 0; i < image.data.length; i += 4) {
    const red = image.data[i];
    const green = image.data[i + 1];
    const blue = image.data[i + 2];
    const greenStrength = green - Math.max(red, blue);
    if (green > 100 && greenStrength > 30) {
      image.data[i + 3] *= 1 - Math.min(1, greenStrength / 110);
      image.data[i + 1] = Math.min(green, Math.max(red, blue));
    }
  }
  return image;
}

async function decodeGifFrames() {
  let decoder;
  try {
    if (typeof ImageDecoder === 'undefined') {
      throw new Error('此瀏覽器不支援逐格 GIF 解碼。');
    }
    const response = await fetch(playerImage.src);
    if (!response.ok) throw new Error(`讀取 GIF 失敗：HTTP ${response.status}`);
    decoder = new ImageDecoder({ data: await response.arrayBuffer(), type: 'image/gif' });
    await decoder.tracks.ready;

    const track = decoder.tracks.selectedTrack;
    if (!track || !track.frameCount) throw new Error('GIF 沒有可播放的影格。');
    for (let frameIndex = 0; frameIndex < track.frameCount; frameIndex += 1) {
      const decoded = await decoder.decode({ frameIndex, completeFramesOnly: true });
      const frame = decoded.image;
      if (playerImageCanvas.width !== frame.codedWidth || playerImageCanvas.height !== frame.codedHeight) {
        playerImageCanvas.width = frame.codedWidth;
        playerImageCanvas.height = frame.codedHeight;
      }
      playerImageContext.clearRect(0, 0, playerImageCanvas.width, playerImageCanvas.height);
      playerImageContext.drawImage(frame, 0, 0);
      const image = removeGreenScreen(playerImageContext.getImageData(
        0, 0, playerImageCanvas.width, playerImageCanvas.height
      ));
      const duration = Number.isFinite(frame.duration) && frame.duration > 0 ? frame.duration / 1000 : 50;
      gifFrames.push({ image, duration });
      frame.close();
    }

    playerImageContext.putImageData(gifFrames[0].image, 0, 0);
    playerImageReady = true;
    currentGifFrame = 0;
  } catch (error) {
    console.error('無法逐格解碼主角 GIF，將使用靜態影格。', error);
  } finally {
    if (decoder) decoder.close();
  }
}

function getGifFrameIndex(time) {
  const totalDuration = gifFrames.reduce((total, frame) => total + frame.duration, 0);
  let frameTime = totalDuration ? time % totalDuration : 0;
  for (let i = 0; i < gifFrames.length; i += 1) {
    if (frameTime < gifFrames[i].duration) return i;
    frameTime -= gifFrames[i].duration;
  }
  return 0;
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
  if (running) runAnimationTime += dt;
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
restartButton.addEventListener('click', startOrJump);
resetGame();
requestAnimationFrame(loop);
