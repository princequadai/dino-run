"use strict";

/* =================================
   ELEMENTS
================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameShell = document.getElementById("gameShell");

const scoreEl = document.getElementById("score");
const hiScoreEl = document.getElementById("hiScore");
const gameOverEl = document.getElementById("gameOver");
const restartBtn = document.getElementById("restartBtn");
const startHint = document.getElementById("startHint");

const touchLeft = document.getElementById("touchLeft");
const touchRight = document.getElementById("touchRight");

const gameOverSound = new Audio("audio/game-over.mp3");
gameOverSound.volume = 0.7;
gameOverSound.loop = false;


/* =================================
   AUDIO SYNTHESIZER & HAPTICS
================================= */

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playJumpSound() {
  initAudio();
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(480, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {}
}

function playDuckSound() {
  initAudio();
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (e) {}
}

function playMilestoneSound() {
  initAudio();
  if (!audioCtx) return;

  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {}
}

function playGameOverSound() {
  initAudio();
  try {
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch(() => {});
  } catch (e) {}

  if (audioCtx) {
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }
}

function vibrate(ms = 15) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch (e) {}
  }
}


/* =================================
   GAME SIZE & CANVAS
================================= */

const W = 900;
const H = 320;
const GROUND_Y = 258;

function resizeCanvas() {
  if (!canvas || !gameShell) return;

  const rect = gameShell.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  const scaleX = (dpr * rect.width) / W;
  const scaleY = (dpr * rect.height) / H;

  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 100));
resizeCanvas();


/* =================================
   PHYSICS & GAME STATE
================================= */

const GRAVITY = 2600;
const JUMP_VELOCITY = -900;

let running = false;
let dead = false;
let started = false;

let lastTime = 0;
let score = 0;
let lastMilestone = 0;

let highScore = Number(localStorage.getItem("dinoHighScore") || 0);

let speed = 360;
let spawnDistance = 480;
let groundOffset = 0;
let cloudOffset = 0;

let obstacles = [];


/* =================================
   DINO
================================= */

const dino = {
  x: 92,
  y: GROUND_Y - 54,
  w: 44,
  h: 54,
  vy: 0,
  duck: false,
  frame: 0
};


/* =================================
   CLOUDS
================================= */

const clouds = [
  { x: 80, y: 62, s: 1 },
  { x: 380, y: 92, s: 0.72 },
  { x: 700, y: 48, s: 0.85 }
];


/* =================================
   SCORE
================================= */

function updateScore() {
  scoreEl.textContent = String(Math.floor(score)).padStart(5, "0");
  hiScoreEl.textContent = String(Math.floor(highScore)).padStart(5, "0");
}


/* =================================
   RESET
================================= */

function reset() {
  initAudio();
  gameOverSound.pause();
  gameOverSound.currentTime = 0;

  score = 0;
  lastMilestone = 0;
  speed = 360;
  spawnDistance = 480;
  groundOffset = 0;
  cloudOffset = 0;
  obstacles = [];
  dead = false;
  started = true;
  running = true;

  dino.y = GROUND_Y - dino.h;
  dino.vy = 0;
  dino.duck = false;

  if (restartBtn) restartBtn.removeAttribute("style");
  gameOverEl.classList.add("hidden");
  startHint.classList.add("hidden");

  updateScore();

  lastTime = performance.now();
  requestAnimationFrame(loop);
}


/* =================================
   JUMP & DUCK
================================= */

function jump() {
  initAudio();

  if (dead) {
    reset();
    return;
  }

  if (!started) {
    reset();
    return;
  }

  if (dino.y >= GROUND_Y - dino.h - 2) {
    dino.vy = JUMP_VELOCITY;
    dino.duck = false;
    playJumpSound();
    vibrate(12);
  }
}

function setDuck(value) {
  initAudio();

  if (!running || dead) return;

  if (value) {
    dino.duck = true;

    if (dino.y < GROUND_Y - dino.h - 2) {
      dino.vy = Math.max(dino.vy, 750);
    } else {
      playDuckSound();
    }
  } else {
    dino.duck = false;
  }
}


/* =================================
   OBSTACLES
================================= */

function addObstacle() {
  const roll = Math.random();

  if (score > 180 && roll < 0.22) {
    obstacles.push({
      type: "bird",
      x: W + 20,
      y: GROUND_Y - (70 + Math.floor(Math.random() * 32)),
      w: 46,
      h: 26,
      frame: 0
    });
    return;
  }

  const tall = Math.random() < 0.4;
  const count = Math.random() < 0.25 ? 2 : 1;

  obstacles.push({
    type: "cactus",
    x: W + 20,
    y: GROUND_Y - (tall ? 62 : 45),
    w: tall ? 24 : 20,
    h: tall ? 62 : 45,
    count
  });
}


/* =================================
   COLLISION
================================= */

function rectHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}


/* =================================
   GAME OVER
================================= */

function die() {
  if (dead) return;

  dead = true;
  running = false;

  playGameOverSound();
  vibrate([50, 40, 50]);

  dino.duck = false;

  highScore = Math.max(highScore, Math.floor(score));
  localStorage.setItem("dinoHighScore", highScore);

  hiScoreEl.textContent = String(highScore).padStart(5, "0");

  if (restartBtn) restartBtn.removeAttribute("style");
  gameOverEl.classList.remove("hidden");
}


/* =================================
   UPDATE
================================= */

function update(dt) {
  const time = Math.min(dt, 0.032);

  score += time * 10;

  const milestone = Math.floor(score / 100);
  if (milestone > lastMilestone && milestone > 0) {
    lastMilestone = milestone;
    playMilestoneSound();
    vibrate([25, 40, 25]);
  }

  speed = Math.min(780, 360 + score * 1.05);

  groundOffset = (groundOffset + speed * time) % 40;
  cloudOffset = (cloudOffset + speed * time * 0.12) % (W + 200);

  const currentGravity = dino.duck ? GRAVITY * 2.2 : GRAVITY;
  dino.vy += currentGravity * time;
  dino.y += dino.vy * time;

  const groundDinoY = GROUND_Y - dino.h;
  if (dino.y >= groundDinoY) {
    dino.y = groundDinoY;
    dino.vy = 0;
  }

  dino.frame += time * (speed / 45);

  spawnDistance -= speed * time;
  if (spawnDistance <= 0) {
    addObstacle();
    const gap = Math.max(280, 560 - score * 0.18) + Math.random() * 220;
    spawnDistance = gap;
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    obstacle.x -= speed * time;
    obstacle.frame = (obstacle.frame || 0) + time * 8;

    if (obstacle.x + obstacle.w < -30) {
      obstacles.splice(i, 1);
    }
  }

  const dinoBox = {
    x: dino.x + 7,
    y: dino.duck ? dino.y + 18 : dino.y + 5,
    w: dino.duck ? 38 : 34,
    h: dino.duck ? 36 : 48
  };

  for (const obstacle of obstacles) {
    let obstacleBox;
    if (obstacle.type === "bird") {
      obstacleBox = {
        x: obstacle.x + 7,
        y: obstacle.y + 5,
        w: obstacle.w - 14,
        h: obstacle.h - 9
      };
    } else {
      obstacleBox = {
        x: obstacle.x + 3,
        y: obstacle.y + 3,
        w: obstacle.w - 6 + (obstacle.count - 1) * 13,
        h: obstacle.h - 4
      };
    }

    if (rectHit(dinoBox, obstacleBox)) {
      die();
      break;
    }
  }

  updateScore();
}


/* =================================
   DRAW HELPERS
================================= */

function pixelRect(x, y, w, h, fill = "#222") {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawDino() {
  const x = dino.x;
  const y = dino.y;

  if (dino.duck) {
    pixelRect(x + 4, y + 19, 42, 22);
    pixelRect(x + 35, y + 10, 20, 20);
    pixelRect(x + 50, y + 18, 8, 7);
    pixelRect(x + 46, y + 13, 4, 4, "#fff");
    pixelRect(x + 10, y + 39, 8, 5);
    pixelRect(x + 32, y + 39, 8, 5);
    return;
  }

  pixelRect(x + 13, y + 17, 25, 30);
  pixelRect(x + 23, y + 7, 23, 23);
  pixelRect(x + 40, y + 14, 12, 7);
  pixelRect(x + 4, y + 31, 14, 7);
  pixelRect(x + 8, y + 27, 8, 8);
  pixelRect(x + 26, y + 7, 5, 5, "#fff");

  const step = Math.floor(dino.frame) % 2;
  if (step === 0) {
    pixelRect(x + 15, y + 45, 7, 13);
    pixelRect(x + 31, y + 44, 7, 10);
  } else {
    pixelRect(x + 15, y + 44, 7, 10);
    pixelRect(x + 31, y + 45, 7, 13);
  }
}

function drawCactus(o) {
  const x = o.x;
  const y = o.y;

  pixelRect(x + 7, y, 9, o.h, "#2f6b3f");
  pixelRect(x + 2, y + 15, 8, 7, "#2f6b3f");
  pixelRect(x - 1, y + 12, 7, 16, "#2f6b3f");

  if (o.h > 50) {
    pixelRect(x + 16, y + 24, 8, 7, "#2f6b3f");
    pixelRect(x + 18, y + 20, 7, 18, "#2f6b3f");
  }

  if (o.count === 2) {
    pixelRect(x + 28, y + 13, 9, o.h - 13, "#2f6b3f");
    pixelRect(x + 35, y + 29, 8, 7, "#2f6b3f");
  }
}

function drawBird(o) {
  const flap = Math.floor(o.frame) % 2;

  pixelRect(o.x + 13, o.y + 9, 24, 10, "#555");
  pixelRect(o.x + 35, o.y + 7, 8, 8, "#555");
  pixelRect(o.x + 42, o.y + 10, 6, 3, "#555");

  if (flap) {
    pixelRect(o.x + 5, o.y + 3, 16, 6, "#555");
    pixelRect(o.x + 9, o.y - 1, 8, 5, "#555");
  } else {
    pixelRect(o.x + 5, o.y + 15, 16, 6, "#555");
  }
}

function drawCloud(c) {
  let x = c.x - cloudOffset;
  if (x < -120) x += W + 200;

  ctx.fillStyle = "#d9d9d9";
  ctx.fillRect(x, c.y + 10, 64 * c.s, 12 * c.s);

  ctx.beginPath();
  ctx.arc(x + 20 * c.s, c.y + 10, 15 * c.s, Math.PI, 0);
  ctx.arc(x + 38 * c.s, c.y + 7, 19 * c.s, Math.PI, 0);
  ctx.fill();
}

function drawBackground() {
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, W, H);

  clouds.forEach(drawCloud);

  ctx.strokeStyle = "#535353";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(W, GROUND_Y);
  ctx.stroke();

  ctx.fillStyle = "#666";
  for (let x = -groundOffset; x < W; x += 40) {
    ctx.fillRect(x, GROUND_Y + 16, 2, 2);
  }

  for (let x = 20 - groundOffset * 0.7; x < W; x += 77) {
    ctx.fillRect(x, GROUND_Y + 8, 8, 2);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  obstacles.forEach(o => (o.type === "bird" ? drawBird(o) : drawCactus(o)));
  drawDino();
}

function loop(now) {
  if (!running) {
    draw();
    return;
  }

  const dt = (now - lastTime) / 1000;
  lastTime = now;

  update(dt);
  draw();

  if (running) {
    requestAnimationFrame(loop);
  }
}


/* =================================
   INPUT CONTROLS
================================= */

/* Keyboard */
window.addEventListener("keydown", event => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    jump();
  }
  if (event.code === "ArrowDown") {
    event.preventDefault();
    setDuck(true);
  }
});

window.addEventListener("keyup", event => {
  if (event.code === "ArrowDown") {
    setDuck(false);
  }
});

/* Touch Zones: Left = Duck, Right = Jump */
function handleTouchZone(e, isLeft, isDown) {
  if (e.cancelable) e.preventDefault();
  e.stopPropagation();
  initAudio();

  if (isDown) {
    if (dead || !started) {
      reset();
      return;
    }

    if (isLeft) {
      setDuck(true);
    } else {
      jump();
    }
  } else {
    if (isLeft) {
      setDuck(false);
    }
  }
}

if (touchLeft) {
  touchLeft.addEventListener("touchstart", e => handleTouchZone(e, true, true), { passive: false });
  touchLeft.addEventListener("touchend", e => handleTouchZone(e, true, false), { passive: false });
  touchLeft.addEventListener("touchcancel", e => handleTouchZone(e, true, false), { passive: false });
  touchLeft.addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch") handleTouchZone(e, true, true);
  });
  touchLeft.addEventListener("pointerup", e => {
    if (e.pointerType !== "touch") handleTouchZone(e, true, false);
  });
}

if (touchRight) {
  touchRight.addEventListener("touchstart", e => handleTouchZone(e, false, true), { passive: false });
  touchRight.addEventListener("touchend", e => handleTouchZone(e, false, false), { passive: false });
  touchRight.addEventListener("touchcancel", e => handleTouchZone(e, false, false), { passive: false });
  touchRight.addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch") handleTouchZone(e, false, true);
  });
  touchRight.addEventListener("pointerup", e => {
    if (e.pointerType !== "touch") handleTouchZone(e, false, false);
  });
}

/* Static Restart Button & Game Over Tap */
if (gameOverEl) {
  gameOverEl.addEventListener("touchstart", e => {
    if (dead) {
      if (e.cancelable) e.preventDefault();
      reset();
    }
  }, { passive: false });
}

if (restartBtn) {
  restartBtn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    reset();
  });
}

/* Adjust hint text for touch screens */
const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
if (isTouchDevice && startHint) {
  startHint.textContent = "TAP RIGHT TO JUMP • LEFT TO DUCK";
}


/* =================================
   INITIAL SETUP
================================= */

hiScoreEl.textContent = String(highScore).padStart(5, "0");
updateScore();
draw();
setTimeout(resizeCanvas, 50);