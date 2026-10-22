const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const coinCountEl = document.getElementById('coin-count');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayCopy = document.getElementById('overlay-copy');
const restartButton = document.getElementById('restart');

const W = canvas.width;
const H = canvas.height;
const groundY = 330;
const colors = { ink: '#10202e', ice: '#8ee8ed', snow: '#f2fcff', deepIce: '#3c8fa4', shadow: '#276276' };
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
const coinImage = new Image();
const coinSound = new Audio('比比拉布.mp3');
const coinCanvas = document.createElement('canvas');
const coinContext = coinCanvas.getContext('2d', { willReadFrequently: true });
coinCanvas.width = 56;
coinCanvas.height = 64;
let coinImageReady = false;
let coinGifFrames = [];
let currentCoinFrame = -1;
let coinsCollected = 0;
let coinSpawnTimer = 1100;
let coins = [];

coinSound.preload = 'auto';
coinImage.onload = () => {
  prepareCoinFrame(coinImage);
  coinImageReady = true;
};
coinImage.onerror = () => console.error('無法載入金幣 GIF：6767.gif');
coinImage.src = '6767.gif';
decodeCoinGifFrames();

function resetGame() {
  score = 0;
  speed = 6;
  distance = 0;
  runAnimationTime = 0;
  spawnTimer = 700;
  coinSpawnTimer = 1100;
  coinsCollected = 0;
  coins = [];
  stripeOffset = 0;
  obstacles = [];
  player.y = groundY - player.h;
  player.vy = 0;
  player.jumping = false;
  running = false;
  gameOver = false;
  overlayTitle.textContent = '穿越極地！';
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
  coinCountEl.textContent = String(coinsCollected).padStart(2, '0');
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#101a3a');
  sky.addColorStop(.58, '#174b67');
  sky.addColorStop(1, '#84c9d0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  drawAurora();
  drawStars();
  drawMountains();
  drawSnowfield();
  drawSnowfall();
}

function drawAurora() {
  const drift = running ? stripeOffset * .18 : 0;
  const bands = [
    { y: 78, color: 'rgba(107, 255, 195, .30)', width: 34 },
    { y: 106, color: 'rgba(93, 230, 210, .25)', width: 24 },
    { y: 132, color: 'rgba(151, 160, 255, .20)', width: 19 }
  ];

  bands.forEach((band, index) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-80, band.y + 42);
    ctx.bezierCurveTo(135, band.y - 30, 260, band.y + 65, 475, band.y + 18);
    ctx.bezierCurveTo(675, band.y - 28, 800, band.y + 46, 1040, band.y - 8);
    ctx.lineTo(1040, band.y + 30);
    ctx.bezierCurveTo(800, band.y + 84, 670, band.y + 10, 475, band.y + 57);
    ctx.bezierCurveTo(250, band.y + 104, 135, band.y + 9, -80, band.y + 80);
    ctx.closePath();
    ctx.translate((index % 2 ? -drift : drift), 0);
    ctx.fillStyle = band.color;
    ctx.shadowColor = band.color;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.restore();
  });
}

function drawStars() {
  for (let i = 0; i < 42; i += 1) {
    const x = (i * 173 + 37) % W;
    const y = 18 + (i * 47) % 150;
    ctx.globalAlpha = .35 + (i % 4) * .14;
    ctx.fillStyle = '#e6ffff';
    ctx.fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(235, 253, 255, .9)';
  ctx.beginPath();
  ctx.arc(810, 65, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#183858';
  ctx.beginPath();
  ctx.arc(820, 57, 22, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountains() {
  ctx.fillStyle = '#496f8d';
  ctx.beginPath();
  ctx.moveTo(0, 250);
  ctx.lineTo(100, 166); ctx.lineTo(171, 235); ctx.lineTo(281, 145);
  ctx.lineTo(395, 245); ctx.lineTo(512, 174); ctx.lineTo(645, 252);
  ctx.lineTo(772, 157); ctx.lineTo(910, 244); ctx.lineTo(960, 211);
  ctx.lineTo(960, groundY); ctx.lineTo(0, groundY); ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d9f5f5';
  [[100, 166, 37], [281, 145, 43], [512, 174, 31], [772, 157, 42]].forEach(([x, y, width]) => {
    ctx.beginPath();
    ctx.moveTo(x - width, y + 28);
    ctx.lineTo(x, y);
    ctx.lineTo(x + width, y + 29);
    ctx.lineTo(x + 14, y + 18);
    ctx.lineTo(x, y + 27);
    ctx.lineTo(x - 12, y + 17);
    ctx.closePath();
    ctx.fill();
  });
}

function drawSnowfield() {
  const ground = ctx.createLinearGradient(0, groundY, 0, H);
  ground.addColorStop(0, '#eefcff');
  ground.addColorStop(1, '#b7e2eb');
  ctx.fillStyle = ground;
  ctx.fillRect(0, groundY, W, H - groundY);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, groundY + 11);
  for (let x = 0; x <= W; x += 80) {
    ctx.quadraticCurveTo(x + 40, groundY - 3 + Math.sin(x) * 3, x + 80, groundY + 11);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(91, 164, 184, .34)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const x = (i * 137 - stripeOffset * .8 % 137 + W) % W;
    const y = 365 + (i * 23) % 44;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 19, y + 2);
    ctx.lineTo(x + 31, y - 1);
    ctx.stroke();
  }
}

function drawSnowfall() {
  for (let i = 0; i < 28; i += 1) {
    const x = (i * 191 - stripeOffset * (i % 3 + 1) + W * 3) % W;
    const y = (i * 67 + 35) % 300;
    ctx.globalAlpha = .35 + (i % 4) * .12;
    ctx.fillStyle = '#e8ffff';
    ctx.fillRect(x, y, i % 6 === 0 ? 3 : 2, i % 6 === 0 ? 3 : 2);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  if (!playerImage.complete || !playerImage.naturalWidth || !playerImage.naturalHeight) return;

  if (gifFrames.length && playerImageCanvas.width > 0 && playerImageCanvas.height > 0) {
    const frameIndex = running ? getGifFrameIndex(runAnimationTime) : 0;
    if (frameIndex !== currentGifFrame) {
      playerImageContext.putImageData(gifFrames[frameIndex].image, 0, 0);
      currentGifFrame = frameIndex;
    }
  } else {
    playerImageContext.clearRect(0, 0, playerImageCanvas.width, playerImageCanvas.height);
    playerImageContext.drawImage(playerImage, 0, 0);
    playerImageContext.putImageData(removeGreenScreen(
      playerImageContext.getImageData(0, 0, playerImageCanvas.width, playerImageCanvas.height)
    ), 0, 0);
  }

  const image = playerImageCanvas;
  const imageWidth = playerImageCanvas.width;
  const imageHeight = playerImageCanvas.height;
  const size = 100;
  const croppedHeight = imageHeight - 18;
  const drawHeight = size * croppedHeight / imageHeight;
  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h - drawHeight / 2);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0, imageWidth, croppedHeight, -size / 2, -drawHeight / 2, size, drawHeight);
  ctx.restore();
}

function drawCoins() {
  if (!coins.length) return;

  if (coinGifFrames.length) {
    const frameIndex = getCoinGifFrameIndex(runAnimationTime);
    if (frameIndex !== currentCoinFrame) {
      coinContext.putImageData(coinGifFrames[frameIndex].image, 0, 0);
      currentCoinFrame = frameIndex;
    }
  }

  coins.forEach(coin => {
    const pulse = 1 + Math.sin(runAnimationTime / 180 + coin.x) * .08;
    const radius = 31 * pulse;
    const centerX = coin.x + coin.w / 2;
    const centerY = coin.y + coin.h / 2;
    ctx.save();
    ctx.shadowColor = '#ffd54f';
    ctx.shadowBlur = 18;
    const coinFill = ctx.createRadialGradient(centerX - 8, centerY - 10, 2, centerX, centerY, radius);
    coinFill.addColorStop(0, '#fff4a8');
    coinFill.addColorStop(.55, '#ffd54f');
    coinFill.addColorStop(1, '#e99a16');
    ctx.fillStyle = coinFill;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff0a3';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    if (coinImageReady) {
      ctx.drawImage(coinCanvas, coin.x + 5, coin.y + 3, coin.w - 10, coin.h - 6);
    } else {
      ctx.fillStyle = '#8a5a0a';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('秦', centerX, centerY);
    }
  });
}

function prepareCoinFrame(source) {
  coinContext.clearRect(0, 0, coinCanvas.width, coinCanvas.height);
  coinContext.drawImage(source, 96, 35, 185, 245, 0, 0, coinCanvas.width, coinCanvas.height);
  const image = coinContext.getImageData(0, 0, coinCanvas.width, coinCanvas.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const red = image.data[i];
    const green = image.data[i + 1];
    const blue = image.data[i + 2];
    const brightness = (red + green + blue) / 3;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    if (brightness > 205 && chroma < 35) {
      image.data[i + 3] = 0;
    } else if (brightness > 180 && chroma < 28) {
      image.data[i + 3] *= (205 - brightness) / 25;
    }
  }
  coinContext.putImageData(image, 0, 0);
  return image;
}

async function decodeCoinGifFrames() {
  let decoder;
  try {
    if (typeof ImageDecoder === 'undefined') {
      throw new Error('此瀏覽器不支援逐格 GIF 解碼。');
    }
    const response = await fetch(coinImage.src);
    if (!response.ok) throw new Error(`讀取金幣 GIF 失敗：HTTP ${response.status}`);
    decoder = new ImageDecoder({ data: await response.arrayBuffer(), type: 'image/gif' });
    await decoder.tracks.ready;

    const track = decoder.tracks.selectedTrack;
    if (!track || !track.frameCount) throw new Error('金幣 GIF 沒有可播放的影格。');
    for (let frameIndex = 0; frameIndex < track.frameCount; frameIndex += 1) {
      const decoded = await decoder.decode({ frameIndex, completeFramesOnly: true });
      const frame = decoded.image;
      const image = prepareCoinFrame(frame);
      const duration = Number.isFinite(frame.duration) && frame.duration > 0 ? frame.duration / 1000 : 50;
      coinGifFrames.push({ image, duration });
      frame.close();
    }

    coinContext.putImageData(coinGifFrames[0].image, 0, 0);
    coinImageReady = true;
    currentCoinFrame = 0;
  } catch (error) {
    console.error('無法逐格解碼金幣 GIF，將使用靜態影格。', error);
  } finally {
    if (decoder) decoder.close();
  }
}

function getCoinGifFrameIndex(time) {
  const totalDuration = coinGifFrames.reduce((total, frame) => total + frame.duration, 0);
  let frameTime = totalDuration ? time % totalDuration : 0;
  for (let i = 0; i < coinGifFrames.length; i += 1) {
    if (frameTime < coinGifFrames[i].duration) return i;
    frameTime -= coinGifFrames[i].duration;
  }
  return 0;
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
  if (roll < .38) obstacles.push({ type: 'ice', x: W + 20, y: groundY - 40, w: 48, h: 40 });
  else if (roll < .72) obstacles.push({ type: 'spikes', x: W + 20, y: groundY - 46, w: 54, h: 46 });
  else obstacles.push({ type: 'snowman', x: W + 20, y: groundY - 62, w: 42, h: 62 });
}

function spawnCoin() {
  const height = 105 + Math.random() * 65;
  coins.push({ x: W + 20, y: groundY - height, w: 56, h: 64 });
}

function drawObstacle(item) {
  const { x, y } = item;
  if (item.type === 'ice') {
    ctx.fillStyle = '#6ec4d8';
    ctx.beginPath();
    ctx.moveTo(x + 5, y + item.h);
    ctx.lineTo(x + 2, y + 14);
    ctx.lineTo(x + 15, y + 19);
    ctx.lineTo(x + 25, y);
    ctx.lineTo(x + 35, y + 17);
    ctx.lineTo(x + 46, y + 10);
    ctx.lineTo(x + item.w - 2, y + item.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e7ffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 19);
    ctx.lineTo(x + 25, y + 5);
    ctx.lineTo(x + 33, y + 19);
    ctx.stroke();
  } else if (item.type === 'spikes') {
    ctx.fillStyle = '#83d8e8';
    ctx.beginPath();
    ctx.moveTo(x, y + item.h);
    ctx.lineTo(x + 9, y + 21);
    ctx.lineTo(x + 18, y + item.h);
    ctx.lineTo(x + 28, y + 5);
    ctx.lineTo(x + 39, y + item.h);
    ctx.lineTo(x + 48, y + 17);
    ctx.lineTo(x + item.w, y + item.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e9ffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillStyle = '#eafaff';
    ctx.beginPath(); ctx.arc(x + 21, y + 45, 17, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 21, y + 18, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#17445c';
    ctx.fillRect(x + 15, y + 14, 3, 3);
    ctx.fillRect(x + 24, y + 14, 3, 3);
    ctx.fillStyle = '#f28b63';
    ctx.beginPath();
    ctx.moveTo(x + 19, y + 19); ctx.lineTo(x + 30, y + 22); ctx.lineTo(x + 19, y + 24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3c8fa4';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 5, y + 35); ctx.lineTo(x + 37, y + 35); ctx.stroke();
    ctx.fillStyle = '#ef7b79';
    ctx.fillRect(x + 7, y + 32, 28, 5);
  }
}

function collides(a, b) {
  return a.x + 22 < b.x + b.w - 4 && a.x + a.w - 20 > b.x + 4 && a.y + 8 < b.y + b.h && a.y + a.h > b.y + 5;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function playCoinSound() {
  coinSound.currentTime = 0;
  const playback = coinSound.play();
  if (playback) {
    playback.catch(error => console.error('無法播放金幣音效：比比拉布.mp3', error));
  }
}

function update(dt) {
  if (!running || gameOver) return;
  distance += speed * dt / 16.67;
  speed = Math.min(12, 6 + Math.floor(distance / 8) / 450);
  stripeOffset = (stripeOffset + speed * dt / 16.67) % W;
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
  coinSpawnTimer -= dt;
  if (coinSpawnTimer <= 0) {
    spawnCoin();
    coinSpawnTimer = 1500 + Math.random() * 1100;
  }
  obstacles.forEach(item => item.x -= speed * dt / 16.67);
  obstacles = obstacles.filter(item => item.x > -120);
  const coinPlayerBox = { x: player.x + 22, y: player.y + 10, w: player.w - 42, h: player.h - 12 };
  coins = coins.filter(coin => {
    coin.x -= speed * dt / 16.67;
    if (overlaps(coinPlayerBox, coin)) {
      coinsCollected += 1;
      playCoinSound();
      return false;
    }
    return coin.x > -coin.w;
  });
  score = Math.floor(distance / 8) + coinsCollected * 50;
  const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (obstacles.some(item => collides(playerBox, item))) endGame();
  updateHud();
}

function endGame() {
  running = false;
  gameOver = true;
  best = Math.max(best, score);
  localStorage.setItem('verstappen-best', best);
  overlayTitle.textContent = '冰原之旅結束';
  overlayCopy.innerHTML = '按 <kbd>空白鍵</kbd> 或點擊畫面再跑一次';
  overlay.classList.remove('hidden');
  updateHud();
}

function draw() {
  drawBackground();
  obstacles.forEach(drawObstacle);
  drawCoins();
  drawPlayer();
  if (running) {
    ctx.fillStyle = '#edffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('極地遠征', 22, 30);
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
