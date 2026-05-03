const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const screens = {
  menu: document.getElementById("menuScreen"),
  characters: document.getElementById("characterScreen"),
  paused: document.getElementById("pausedScreen"),
  gameOver: document.getElementById("gameOverScreen"),
  quit: document.getElementById("quitScreen"),
};

const hud = document.getElementById("hud");
const scoreBadge = document.getElementById("scoreBadge");
const hudBestScore = document.getElementById("hudBestScore");
const menuBestScore = document.getElementById("menuBestScore");
const finalScore = document.getElementById("finalScore");
const bestScore = document.getElementById("bestScore");
const gameOverLine = document.getElementById("gameOverLine");
const menuBirdPreview = document.getElementById("menuBirdPreview");
const menuBirdCtx = menuBirdPreview.getContext("2d");
const characterGrid = document.getElementById("characterGrid");

const assetPath = "assets/Gufiao_CuteFlappy_Free/";
const birdFrames = Array.from({ length: 6 }, (_, index) => loadImage(`${assetPath}flappy0${index}.png`));
const assets = {
  birds: birdFrames,
  ground: loadImage(`${assetPath}ground.png`),
  mountains: loadImage(`${assetPath}mounts.png`),
  pipe: loadImage(`${assetPath}pipe.png`),
};

// Add or adjust these entries to change the selectable bird colors.
const colorVariants = [
  { name: "Original", color: null, sparkle: "#fff2a8" },
  { name: "Rose", color: "#ff65a3", sparkle: "#ff9ec4" },
  { name: "Mint", color: "#41d7a7", sparkle: "#9af1d1" },
  { name: "Sky", color: "#4cbcff", sparkle: "#b7e9ff" },
  { name: "Sunny", color: "#ffc83d", sparkle: "#fff0a3" },
  { name: "Lilac", color: "#a378ff", sparkle: "#d6c7ff" },
];

const game = {
  state: "menu",
  selectedColor: Number(localStorage.getItem("cuteFlappyColor") || 0),
  bird: { x: 0, y: 0, size: 58, velocity: 0, rotation: 0 },
  pipes: [],
  particles: [],
  score: 0,
  best: Number(localStorage.getItem("cuteFlappyBest") || 0),
  frame: 0,
  elapsed: 0,
  pipeTimer: 0,
  groundOffset: 0,
  mountainOffset: 0,
  shake: 0,
};

// Main gameplay tuning: lift controls jump force, gravity controls falling,
// and the pipe settings control how quickly the game becomes difficult.
const world = {
  gravity: 0.42,
  lift: -7.45,
  pipeSpeed: 2.85,
  maxPipeSpeed: 4.1,
  pipeGap: 178,
  pipeWidth: 78,
  groundHeight: 92,
  startPipeInterval: 2150,
  minPipeInterval: 830,
  easyGap: 236,
  hardGap: 154,
  challengeDelay: 9,
  rampDuration: 34,
};

const tintedCache = new Map();
let audio;
let lastTime = 0;

function loadImage(src) {
  const img = new Image();
  img.src = src;
  img.addEventListener("load", () => {
    updateCharacterPreviews();
    drawMenuBirdPreview();
  });
  return img;
}

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  // Keep game sizes responsive so the code works on both desktop and phones.
  canvas.logicalWidth = window.innerWidth;
  canvas.logicalHeight = window.innerHeight;

  world.groundHeight = clamp(canvas.logicalHeight * 0.13, 72, 118);
  world.pipeWidth = clamp(canvas.logicalWidth * 0.11, 64, 96);
  world.easyGap = clamp(canvas.logicalHeight * 0.32, 204, 260);
  world.hardGap = clamp(canvas.logicalHeight * 0.2, 142, 174);
  world.pipeGap = world.easyGap;
  game.bird.size = clamp(Math.min(canvas.logicalWidth, canvas.logicalHeight) * 0.085, 44, 68);
  game.bird.x = canvas.logicalWidth * 0.24;
  if (!game.bird.y) game.bird.y = canvas.logicalHeight * 0.42;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  if (screens[name]) screens[name].classList.add("active");
  hud.classList.toggle("visible", game.state === "playing" || game.state === "ready" || game.state === "gameOver");
  updateScoreDisplays();
}

function updateScoreDisplays() {
  // High score stays in localStorage, so it stays after refreshing the page.
  scoreBadge.textContent = String(game.score);
  hudBestScore.textContent = String(game.best);
  menuBestScore.textContent = String(game.best);
  bestScore.textContent = String(game.best);
}

function createCharacterButtons() {
  colorVariants.forEach((variant, index) => {
    const button = document.createElement("button");
    const preview = document.createElement("canvas");
    preview.width = 90;
    preview.height = 70;
    button.className = "character-choice";
    button.type = "button";
    button.setAttribute("aria-label", `Choose ${variant.name} bird`);
    button.appendChild(preview);
    button.addEventListener("click", () => {
      game.selectedColor = index;
      localStorage.setItem("cuteFlappyColor", String(index));
      updateCharacterSelection();
      drawMenuBirdPreview();
      sound("select");
    });
    characterGrid.appendChild(button);
  });
  updateCharacterSelection();
  updateCharacterPreviews();
}

function updateCharacterSelection() {
  [...characterGrid.children].forEach((button, index) => {
    button.classList.toggle("selected", index === game.selectedColor);
    button.setAttribute("aria-pressed", String(index === game.selectedColor));
  });
}

function updateCharacterPreviews() {
  if (!assets.birds[0].complete) return;
  [...characterGrid.children].forEach((button, index) => {
    const preview = button.querySelector("canvas");
    const previewCtx = preview.getContext("2d");
    previewCtx.clearRect(0, 0, preview.width, preview.height);
    drawTintedImage(previewCtx, assets.birds[0], 6, 7, 78, 56, colorVariants[index].color, 0.52);
  });
}

function resetGame() {
  game.state = "ready";
  game.bird = {
    x: canvas.logicalWidth * 0.24,
    y: canvas.logicalHeight * 0.42,
    size: game.bird.size,
    velocity: 0,
    rotation: 0,
  };
  game.pipes = [];
  game.particles = [];
  game.score = 0;
  game.elapsed = 0;
  game.pipeTimer = world.startPipeInterval * 0.2;
  game.frame = 0;
  game.shake = 0;
  updateScoreDisplays();
  showScreen("paused");
}

function startGame() {
  unlockAudio();
  resetGame();
  sound("start");
}

function beginFlight() {
  if (game.state !== "ready") return;
  game.state = "playing";
  showScreen(null);
  flap();
  startMusic();
}

function flap() {
  if (game.state === "ready") {
    beginFlight();
    return;
  }
  if (game.state !== "playing") return;
  game.bird.velocity = world.lift;
  const variant = colorVariants[game.selectedColor];
  burst(game.bird.x - 12, game.bird.y + 22, variant.sparkle, 6);
  sound("flap");
}

function currentPipeInterval() {
  // Pipe spawn time starts calm, then ramps down after challengeDelay.
  const progress = difficultyProgress();
  return world.startPipeInterval - (world.startPipeInterval - world.minPipeInterval) * easeInOut(progress);
}

function currentPipeGap() {
  // The opening between pipes shrinks as difficulty rises, pulse adds slight variety.
  const progress = difficultyProgress();
  const pulse = Math.sin(game.elapsed * 1.35) * 10 * progress;
  return world.easyGap - (world.easyGap - world.hardGap) * easeInOut(progress) + pulse;
}

function currentPipeSpeed() {
  const progress = difficultyProgress();
  return world.pipeSpeed + (world.maxPipeSpeed - world.pipeSpeed) * easeInOut(progress);
}

function difficultyProgress() {
  return clamp((game.elapsed - world.challengeDelay) / world.rampDuration, 0, 1);
}

function easeInOut(value) {
  return value * value * (3 - 2 * value);
}

function spawnPipe() {
  const margin = clamp(canvas.logicalHeight * 0.11, 62, 120);
  const gap = currentPipeGap();
  const available = canvas.logicalHeight - world.groundHeight - gap - margin * 2;
  const top = margin + Math.random() * Math.max(1, available);
  game.pipes.push({
    x: canvas.logicalWidth + world.pipeWidth,
    top,
    gap,
    passed: false,
    sparkle: Math.random() > 0.5 ? "#ff9ec4" : "#8de0c1",
  });
}

function update(delta) {
  // Delta keeps the game speed stable even if the browser frame rate changes.
  const step = delta / 16.67;
  game.frame += step;
  const pipeSpeed = game.state === "playing" ? currentPipeSpeed() : world.pipeSpeed;
  game.groundOffset = (game.groundOffset + pipeSpeed * step) % 100;
  game.mountainOffset = (game.mountainOffset + 0.32 * step) % 210;

  if (game.state === "menu" || game.state === "ready") {
    game.bird.y = canvas.logicalHeight * 0.42 + Math.sin(game.frame * 0.045) * 12;
    game.bird.rotation = Math.sin(game.frame * 0.035) * 0.12;
    updateParticles(step);
    return;
  }

  if (game.state !== "playing") {
    updateParticles(step);
    return;
  }

  game.elapsed += delta / 1000;
  game.pipeTimer += delta;
  if (game.pipeTimer >= currentPipeInterval()) {
    spawnPipe();
    game.pipeTimer = 0;
  }

  game.bird.velocity += world.gravity * step;
  game.bird.y += game.bird.velocity * step;
  game.bird.rotation = clamp(game.bird.velocity * 0.075, -0.55, 1.2);

  game.pipes.forEach((pipe) => {
    pipe.x -= pipeSpeed * step;
    if (!pipe.passed && pipe.x + world.pipeWidth < game.bird.x) {
      pipe.passed = true;
      game.score += 1;
      updateScoreDisplays();
      burst(game.bird.x + 6, game.bird.y, pipe.sparkle, 10);
      sound("score");
    }
  });

  game.pipes = game.pipes.filter((pipe) => pipe.x > -world.pipeWidth - 20);
  updateParticles(step);

  if (hasCollision()) endGame();
}

function hasCollision() {
  const radius = game.bird.size * 0.35;
  const bx = game.bird.x + game.bird.size * 0.56;
  const by = game.bird.y + game.bird.size * 0.5;

  if (by - radius < 0 || by + radius > canvas.logicalHeight - world.groundHeight + 8) return true;

  return game.pipes.some((pipe) => {
    const inPipeX = bx + radius > pipe.x && bx - radius < pipe.x + world.pipeWidth;
    const inPipeY = by - radius < pipe.top || by + radius > pipe.top + pipe.gap;
    return inPipeX && inPipeY;
  });
}

function endGame() {
  game.state = "gameOver";
  game.shake = 18;
  stopMusic();
  sound("hit");
  burst(game.bird.x + 25, game.bird.y + 25, "#ff6f9f", 18);

  game.best = Math.max(game.best, game.score);
  localStorage.setItem("cuteFlappyBest", String(game.best));
  finalScore.textContent = String(game.score);
  updateScoreDisplays();
  gameOverLine.textContent = getGameOverLine(game.score);
  showScreen("gameOver");
}

function getGameOverLine(score) {
  if (score >= 20) return "Legendary tiny-wing energy. The clouds are impressed.";
  if (score >= 10) return "That was a very serious cute commute.";
  if (score >= 5) return "Nice flutter. The mountains definitely noticed.";
  if (score > 0) return "A sweet little tumble. Try again.";
  return "First flap jitters. The sky still likes you.";
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    game.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 3.4,
      vy: (Math.random() - 0.9) * 3,
      life: 34 + Math.random() * 18,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

function updateParticles(step) {
  game.particles.forEach((particle) => {
    particle.x += particle.vx * step;
    particle.y += particle.vy * step;
    particle.vy += 0.05 * step;
    particle.life -= step;
  });
  game.particles = game.particles.filter((particle) => particle.life > 0);
}

function draw() {
  // Everything visual is redrawn each frame on the canvas.
  const shakeX = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  const shakeY = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  game.shake = Math.max(0, game.shake - 1.2);

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawSky();
  drawMountains();
  drawPipes();
  drawBird(ctx, game.bird.x, game.bird.y, game.bird.size, game.bird.rotation);
  drawParticles();
  drawGround();
  ctx.restore();
  drawMenuBirdPreview();
}

function drawSky() {
  const height = canvas.logicalHeight;
  const width = canvas.logicalWidth;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#86ddff");
  gradient.addColorStop(0.58, "#ffe2ef");
  gradient.addColorStop(1, "#fff1b8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawCloud(width * 0.13, height * 0.15, 1);
  drawCloud(width * 0.76, height * 0.25, 0.85);
  drawCloud(width * 0.48, height * 0.09, 0.62);

  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  for (let i = 0; i < 26; i += 1) {
    const x = (i * 83 + game.frame * 0.18) % (width + 40) - 20;
    const y = 38 + ((i * 59) % Math.max(280, height * 0.55));
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.beginPath();
  ctx.arc(0, 10, 18, 0, Math.PI * 2);
  ctx.arc(22, 0, 24, 0, Math.PI * 2);
  ctx.arc(50, 13, 19, 0, Math.PI * 2);
  ctx.rect(0, 10, 52, 22);
  ctx.fill();
  ctx.restore();
}

function drawMountains() {
  const img = assets.mountains;
  if (!img.complete) return;
  const scale = canvas.logicalHeight / img.height;
  const width = img.width * scale;
  for (let x = -game.mountainOffset * scale; x < canvas.logicalWidth + width; x += width) {
    ctx.globalAlpha = 0.72;
    ctx.drawImage(img, x, 0, width, canvas.logicalHeight);
    ctx.globalAlpha = 1;
  }
}

function drawPipes() {
  const img = assets.pipe;
  if (!img.complete) return;
  game.pipes.forEach((pipe) => {
    const bottomY = pipe.top + pipe.gap;
    drawPipeSegment(pipe.x, pipe.top, true);
    drawPipeSegment(pipe.x, canvas.logicalHeight - world.groundHeight - bottomY, false, bottomY);

    ctx.fillStyle = pipe.sparkle;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(pipe.x + world.pipeWidth * 0.5, pipe.top + pipe.gap * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  function drawPipeSegment(x, height, flip, y = 0) {
    ctx.save();
    if (flip) {
      ctx.translate(x + world.pipeWidth, height);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0, img.width, img.height, -world.pipeWidth, 0, world.pipeWidth, height);
    } else {
      ctx.drawImage(img, 0, 0, img.width, img.height, x, y, world.pipeWidth, height);
    }
    ctx.restore();
  }
}

function drawBird(targetCtx, x, y, size, rotation = 0) {
  // The six supplied bird images are animation frames for one character.
  const frameIndex = Math.floor(game.frame / 5) % assets.birds.length;
  const img = assets.birds[frameIndex];
  if (!img.complete) return;
  targetCtx.save();
  targetCtx.translate(x + size / 2, y + size / 2);
  targetCtx.rotate(rotation);
  drawTintedImage(targetCtx, img, -size / 2, -size / 2, size * 1.25, size, colorVariants[game.selectedColor].color, 0.5);
  targetCtx.restore();
}

function drawTintedImage(targetCtx, img, x, y, width, height, color, alpha) {
  if (!color) {
    targetCtx.drawImage(img, x, y, width, height);
    return;
  }

  const key = `${img.src}-${color}`;
  let tinted = tintedCache.get(key);
  if (!tinted) {
    // Use tinted versions once so color selection stays cheap while animating
    tinted = document.createElement("canvas");
    tinted.width = img.width;
    tinted.height = img.height;
    const tintCtx = tinted.getContext("2d");
    tintCtx.drawImage(img, 0, 0);
    tintCtx.globalCompositeOperation = "source-atop";
    tintCtx.globalAlpha = alpha;
    tintCtx.fillStyle = color;
    tintCtx.fillRect(0, 0, tinted.width, tinted.height);
    tintCtx.globalAlpha = 1;
    tintCtx.globalCompositeOperation = "source-over";
    tintedCache.set(key, tinted);
  }
  targetCtx.drawImage(tinted, x, y, width, height);
}

function drawParticles() {
  game.particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / 44);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawGround() {
  const img = assets.ground;
  if (!img.complete) return;
  const y = canvas.logicalHeight - world.groundHeight;
  for (let x = -game.groundOffset; x < canvas.logicalWidth + 100; x += 100) {
    ctx.drawImage(img, x, y, 100, world.groundHeight + 18);
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.fillRect(0, y, canvas.logicalWidth, 4);
}

function drawMenuBirdPreview() {
  const img = assets.birds[Math.floor(game.frame / 5) % assets.birds.length];
  if (!img.complete) return;
  menuBirdCtx.clearRect(0, 0, menuBirdPreview.width, menuBirdPreview.height);
  drawTintedImage(menuBirdCtx, img, 12, 14, 102, 74, colorVariants[game.selectedColor].color, 0.5);
}

function loop(time = 0) {
  const delta = lastTime ? Math.min(time - lastTime, 34) : 16.67;
  update(delta);
  draw();
  lastTime = time;
  requestAnimationFrame(loop);
}

function unlockAudio() {
  if (audio) {
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audio = {
    ctx: new AudioContext(),
    master: null,
    musicTimer: null,
    note: 0,
  };
  audio.master = audio.ctx.createGain();
  audio.master.gain.value = 0.2;
  audio.master.connect(audio.ctx.destination);
}

function sound(type) {
  if (!audio) return;
  const now = audio.ctx.currentTime;
  // Sound effects are generated here, so no separate audio files are needed
  const settings = {
    flap: [690, 0.06, "square", 0.09],
    score: [880, 0.13, "triangle", 0.12],
    hit: [130, 0.24, "sawtooth", 0.16],
    start: [520, 0.16, "sine", 0.1],
    select: [740, 0.08, "triangle", 0.08],
  }[type];
  if (!settings) return;

  const [frequency, duration, wave, volume] = settings;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, now);
  if (type === "hit") osc.frequency.exponentialRampToValueAtTime(65, now + duration);
  if (type === "score") osc.frequency.exponentialRampToValueAtTime(1180, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(now);
  osc.stop(now + duration);
}

function startMusic() {
  if (!audio || audio.musicTimer) return;
  const notes = [392, 494, 587, 659, 587, 494, 440, 523];
  audio.musicTimer = setInterval(() => {
    if (game.state !== "playing") return;
    const now = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = notes[audio.note % notes.length];
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(now);
    osc.stop(now + 0.3);
    audio.note += 1;
  }, 285);
}

function stopMusic() {
  if (!audio?.musicTimer) return;
  clearInterval(audio.musicTimer);
  audio.musicTimer = null;
}

document.getElementById("playButton").addEventListener("click", startGame);
document.getElementById("selectButton").addEventListener("click", () => {
  unlockAudio();
  sound("select");
  game.state = "menu";
  showScreen("characters");
});
document.getElementById("quitButton").addEventListener("click", () => {
  unlockAudio();
  sound("select");
  game.state = "quit";
  showScreen("quit");
});
document.getElementById("quitBackButton").addEventListener("click", () => {
  game.state = "menu";
  showScreen("menu");
});
document.getElementById("backButton").addEventListener("click", () => {
  sound("select");
  game.state = "menu";
  showScreen("menu");
});
document.getElementById("resumeButton").addEventListener("click", beginFlight);
document.getElementById("retryButton").addEventListener("click", startGame);
document.getElementById("menuButton").addEventListener("click", () => {
  game.state = "menu";
  showScreen("menu");
});

canvas.addEventListener("pointerdown", flap);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    flap();
  }
});
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
createCharacterButtons();
updateScoreDisplays();
showScreen("menu");
loop();
