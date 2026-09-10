"use strict";


/* =================================
   ELEMENTS
================================= */

const canvas =
  document.getElementById("gameCanvas");

const ctx =
  canvas.getContext("2d");

const scoreEl =
  document.getElementById("score");

const hiScoreEl =
  document.getElementById("hiScore");

const gameOverEl =
  document.getElementById("gameOver");

const finalScoreEl =
  document.getElementById("finalScore");

const restartBtn =
  document.getElementById("restartBtn");

const startHint =
  document.getElementById("startHint");


/* =================================
   GAME SIZE
================================= */

const W = 900;
const H = 320;

const GROUND_Y = 258;


/* =================================
   PHYSICS
================================= */

const GRAVITY = 2600;

const JUMP_VELOCITY = -900;


/* =================================
   GAME STATE
================================= */

let running = false;
let dead = false;
let started = false;

let lastTime = 0;

let score = 0;

let highScore =
  Number(
    localStorage.getItem("dinoHighScore") || 0
  );

let speed = 360;

let spawnDistance = 480;

let groundOffset = 0;

let cloudOffset = 0;

let nightBlend = 0;

let obstacles = [];

let particles = [];


/* =================================
   DINO
================================= */

const dino = {

  x: 92,

  y:
    GROUND_Y - 54,

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

  {
    x: 80,
    y: 62,
    s: 1
  },

  {
    x: 380,
    y: 92,
    s: 0.72
  },

  {
    x: 700,
    y: 48,
    s: 0.85
  }

];


/* =================================
   CANVAS RESIZE
================================= */

function resizeCanvas() {

  const rect =
    canvas.getBoundingClientRect();

  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  canvas.width =
    Math.round(rect.width * dpr);

  canvas.height =
    Math.round(rect.height * dpr);


  ctx.setTransform(

    dpr * rect.width / W,

    0,

    0,

    dpr * rect.height / H,

    0,

    0

  );

}


window.addEventListener(
  "resize",
  resizeCanvas
);

resizeCanvas();


/* =================================
   SCORE
================================= */

function updateScore() {

  scoreEl.textContent =
    String(
      Math.floor(score)
    ).padStart(5, "0");


  hiScoreEl.textContent =
    String(
      Math.floor(highScore)
    ).padStart(5, "0");

}


/* =================================
   RESET
================================= */

function reset() {

  score = 0;

  speed = 360;

  spawnDistance = 480;

  groundOffset = 0;

  cloudOffset = 0;

  obstacles = [];

  particles = [];

  dead = false;

  started = true;

  running = true;

  nightBlend = 0;


  dino.y =
    GROUND_Y - dino.h;

  dino.vy = 0;

  dino.duck = false;


  gameOverEl.classList.add(
    "hidden"
  );

  startHint.classList.add(
    "hidden"
  );


  updateScore();


  lastTime =
    performance.now();


  requestAnimationFrame(loop);

}


/* =================================
   JUMP
================================= */

function jump() {

  /* Restart after death */

  if (dead) {

    reset();

    return;

  }


  /* Start */

  if (!started) {

    reset();

  }


  /* Only jump while touching ground */

  if (
    dino.y >=
    GROUND_Y - dino.h - 1
  ) {

    dino.vy =
      JUMP_VELOCITY;

    dino.duck = false;

  }

}


/* =================================
   DUCK
================================= */

function setDuck(value) {

  if (
    !running ||
    dead
  ) {

    return;

  }


  if (
    value &&
    dino.y >=
    GROUND_Y - dino.h - 1
  ) {

    dino.duck = true;

  } else {

    dino.duck = false;

  }

}


/* =================================
   CREATE OBSTACLE
================================= */

function addObstacle() {

  const roll =
    Math.random();


  /* Flying bird */

  if (
    score > 180 &&
    roll < 0.18
  ) {

    obstacles.push({

      type: "bird",

      x: W + 20,

      y:
        GROUND_Y -
        (
          70 +
          Math.floor(
            Math.random() * 30
          )
        ),

      w: 46,

      h: 26,

      frame: 0

    });

    return;

  }


  /* Cactus */

  const tall =
    Math.random() < 0.38;


  const count =
    Math.random() < 0.22
      ? 2
      : 1;


  obstacles.push({

    type: "cactus",

    x: W + 20,

    y:
      GROUND_Y -
      (
        tall
          ? 62
          : 45
      ),

    w:
      tall
        ? 24
        : 20,

    h:
      tall
        ? 62
        : 45,

    count

  });

}


/* =================================
   COLLISION
================================= */

function rectHit(a, b) {

  return (

    a.x <
      b.x + b.w &&

    a.x + a.w >
      b.x &&

    a.y <
      b.y + b.h &&

    a.y + a.h >
      b.y

  );

}


/* =================================
   GAME OVER
================================= */

function die() {

  if (dead) {
    return;
  }


  dead = true;

  running = false;


  dino.duck = false;


  highScore =
    Math.max(
      highScore,
      Math.floor(score)
    );


  localStorage.setItem(
    "dinoHighScore",
    highScore
  );


  finalScoreEl.textContent =
    String(
      Math.floor(score)
    ).padStart(5, "0");


  hiScoreEl.textContent =
    String(
      highScore
    ).padStart(5, "0");


  gameOverEl.classList.remove(
    "hidden"
  );


  /* Small impact particles */

  for (
    let i = 0;
    i < 10;
    i++
  ) {

    particles.push({

      x:
        dino.x +
        dino.w / 2,

      y:
        dino.y +
        dino.h / 2,

      vx:
        (
          Math.random() -
          0.5
        ) * 180,

      vy:
        (
          Math.random() -
          0.5
        ) * 180,

      life: 0.5

    });

  }

}


/* =================================
   UPDATE
================================= */

function update(dt) {

  /*
    Prevent huge physics jumps
    if browser freezes briefly.
  */

  const time =
    Math.min(
      dt,
      0.032
    );


  /* SCORE */

  score +=
    time * 10;


  /* SPEED */

  speed =
    Math.min(
      760,

      360 +
      score * 1.05

    );


  /* GROUND */

  groundOffset =
    (
      groundOffset +
      speed * time
    ) % 40;


  /* CLOUDS */

  cloudOffset =
    (
      cloudOffset +
      speed *
      time *
      0.12
    ) % (W + 200);


  /* DAY / NIGHT */

  const shouldNight =
    Math.floor(
      score / 700
    ) % 2 === 1;


  nightBlend +=
    (
      (
        shouldNight
          ? 1
          : 0
      ) -
      nightBlend
    ) *
    Math.min(
      1,
      time * 3
    );


  /* =================================
     DINO PHYSICS
  ================================= */

  dino.vy +=
    GRAVITY * time;


  dino.y +=
    dino.vy * time;


  const groundDinoY =
    GROUND_Y -
    dino.h;


  /* LAND */

  if (
    dino.y >=
    groundDinoY
  ) {

    dino.y =
      groundDinoY;

    dino.vy = 0;

  }


  /* Running animation */

  dino.frame +=
    time *
    (speed / 45);


  /* =================================
     SPAWN
  ================================= */

  spawnDistance -=
    speed * time;


  if (
    spawnDistance <= 0
  ) {

    addObstacle();


    const gap =
      Math.max(
        290,
        560 -
        score * 0.18
      ) +
      Math.random() * 220;


    spawnDistance =
      gap;

  }


  /* =================================
     MOVE OBSTACLES
  ================================= */

  for (
    let i =
      obstacles.length - 1;

    i >= 0;

    i--

  ) {

    const obstacle =
      obstacles[i];


    obstacle.x -=
      speed * time;


    obstacle.frame =
      (
        obstacle.frame || 0
      ) +
      time * 8;


    /* Remove */

    if (
      obstacle.x +
      obstacle.w <
      -30
    ) {

      obstacles.splice(
        i,
        1
      );

      continue;

    }

  }


  /* =================================
     COLLISION
  ================================= */

  const dinoBox = {

    x:
      dino.x + 7,

    y:
      dino.duck
        ? dino.y + 18
        : dino.y + 5,

    w:
      dino.duck
        ? 38
        : 34,

    h:
      dino.duck
        ? 36
        : 48

  };


  for (
    const obstacle
    of obstacles
  ) {

    let obstacleBox;


    if (
      obstacle.type ===
      "bird"
    ) {

      obstacleBox = {

        x:
          obstacle.x + 7,

        y:
          obstacle.y + 5,

        w:
          obstacle.w - 14,

        h:
          obstacle.h - 9

      };

    } else {

      obstacleBox = {

        x:
          obstacle.x + 3,

        y:
          obstacle.y + 3,

        w:
          obstacle.w -
          6 +
          (
            obstacle.count -
            1
          ) * 13,

        h:
          obstacle.h - 4

      };

    }


    if (
      rectHit(
        dinoBox,
        obstacleBox
      )
    ) {

      die();

      break;

    }

  }


  /* =================================
     PARTICLES
  ================================= */

  for (
    let i =
      particles.length - 1;

    i >= 0;

    i--

  ) {

    const p =
      particles[i];


    p.x +=
      p.vx * time;


    p.y +=
      p.vy * time;


    p.vy +=
      500 * time;


    p.life -=
      time;


    if (
      p.life <= 0
    ) {

      particles.splice(
        i,
        1
      );

    }

  }


  updateScore();

}


/* =================================
   PIXEL RECT
================================= */

function pixelRect(
  x,
  y,
  w,
  h,
  fill = "#222"
) {

  ctx.fillStyle =
    fill;

  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    w,
    h
  );

}


/* =================================
   DRAW DINO
================================= */

function drawDino() {

  const x =
    dino.x;

  const y =
    dino.y;


  /* DUCKING */

  if (dino.duck) {

    pixelRect(
      x + 4,
      y + 19,
      42,
      22
    );

    pixelRect(
      x + 35,
      y + 10,
      20,
      20
    );

    pixelRect(
      x + 50,
      y + 18,
      8,
      7
    );

    pixelRect(
      x + 46,
      y + 13,
      4,
      4,
      "#fff"
    );

    pixelRect(
      x + 10,
      y + 39,
      8,
      5
    );

    pixelRect(
      x + 32,
      y + 39,
      8,
      5
    );

    return;

  }


  /* BODY */

  pixelRect(
    x + 13,
    y + 17,
    25,
    30
  );


  /* HEAD */

  pixelRect(
    x + 23,
    y + 7,
    23,
    23
  );


  /* SNOUT */

  pixelRect(
    x + 40,
    y + 14,
    12,
    7
  );


  /* TAIL */

  pixelRect(
    x + 4,
    y + 31,
    14,
    7
  );

  pixelRect(
    x + 8,
    y + 27,
    8,
    8
  );


  /* EYE */

  pixelRect(
    x + 26,
    y + 7,
    5,
    5,
    "#fff"
  );


  /* LEGS */

  const step =
    Math.floor(
      dino.frame
    ) % 2;


  if (step === 0) {

    pixelRect(
      x + 15,
      y + 45,
      7,
      13
    );

    pixelRect(
      x + 31,
      y + 44,
      7,
      10
    );

  } else {

    pixelRect(
      x + 15,
      y + 44,
      7,
      10
    );

    pixelRect(
      x + 31,
      y + 45,
      7,
      13
    );

  }

}


/* =================================
   DRAW CACTUS
================================= */

function drawCactus(o) {

  const x =
    o.x;

  const y =
    o.y;


  pixelRect(
    x + 7,
    y,
    9,
    o.h,
    "#2f6b3f"
  );


  /* LEFT ARM */

  pixelRect(
    x + 2,
    y + 15,
    8,
    7,
    "#2f6b3f"
  );

  pixelRect(
    x - 1,
    y + 12,
    7,
    16,
    "#2f6b3f"
  );


  /* RIGHT ARM */

  if (
    o.h > 50
  ) {

    pixelRect(
      x + 16,
      y + 24,
      8,
      7,
      "#2f6b3f"
    );

    pixelRect(
      x + 18,
      y + 20,
      7,
      18,
      "#2f6b3f"
    );

  }


  /* DOUBLE CACTUS */

  if (
    o.count === 2
  ) {

    pixelRect(
      x + 28,
      y + 13,
      9,
      o.h - 13,
      "#2f6b3f"
    );

    pixelRect(
      x + 35,
      y + 29,
      8,
      7,
      "#2f6b3f"
    );

  }

}


/* =================================
   DRAW BIRD
================================= */

function drawBird(o) {

  const flap =
    Math.floor(
      o.frame
    ) % 2;


  /* BODY */

  pixelRect(
    o.x + 13,
    o.y + 9,
    24,
    10,
    "#555"
  );


  /* HEAD */

  pixelRect(
    o.x + 35,
    o.y + 7,
    8,
    8,
    "#555"
  );


  /* BEAK */

  pixelRect(
    o.x + 42,
    o.y + 10,
    6,
    3,
    "#555"
  );


  /* WING */

  if (flap) {

    pixelRect(
      o.x + 5,
      o.y + 3,
      16,
      6,
      "#555"
    );

    pixelRect(
      o.x + 9,
      o.y - 1,
      8,
      5,
      "#555"
    );

  } else {

    pixelRect(
      o.x + 5,
      o.y + 15,
      16,
      6,
      "#555"
    );

  }

}


/* =================================
   DRAW CLOUD
================================= */

function drawCloud(c) {

  let x =
    c.x -
    cloudOffset;


  if (
    x < -120
  ) {

    x +=
      W + 200;

  }


  ctx.fillStyle =
    "#d9d9d9";


  ctx.fillRect(
    x,
    c.y + 10,
    64 * c.s,
    12 * c.s
  );


  ctx.beginPath();


  ctx.arc(
    x + 20 * c.s,
    c.y + 10,
    15 * c.s,
    Math.PI,
    0
  );


  ctx.arc(
    x + 38 * c.s,
    c.y + 7,
    19 * c.s,
    Math.PI,
    0
  );


  ctx.fill();

}


/* =================================
   BACKGROUND
================================= */

function drawBackground() {

  const b =
    nightBlend;


  /* Background */

  ctx.fillStyle =
    `rgb(
      ${250 - b * 208},
      ${250 - b * 208},
      ${246 - b * 190}
    )`;


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  /* Clouds */

  clouds.forEach(
    drawCloud
  );


  /* Moon */

  if (
    nightBlend > 0.1
  ) {

    ctx.fillStyle =
      "#eee";


    ctx.beginPath();

    ctx.arc(
      760,
      62,
      18,
      0,
      Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle =
      `rgba(
        250,
        250,
        246,
        ${nightBlend}
      )`;


    ctx.beginPath();

    ctx.arc(
      768,
      56,
      17,
      0,
      Math.PI * 2
    );

    ctx.fill();

  }


  /* Ground line */

  ctx.strokeStyle =
    "#333";

  ctx.lineWidth = 2;


  ctx.beginPath();

  ctx.moveTo(
    0,
    GROUND_Y
  );

  ctx.lineTo(
    W,
    GROUND_Y
  );

  ctx.stroke();


  /* Small ground marks */

  ctx.fillStyle =
    "#666";


  for (
    let x =
      -groundOffset;

    x < W;

    x += 40

  ) {

    ctx.fillRect(
      x,
      GROUND_Y + 16,
      2,
      2
    );

  }


  for (
    let x =
      20 -
      groundOffset * 0.7;

    x < W;

    x += 77

  ) {

    ctx.fillRect(
      x,
      GROUND_Y + 8,
      8,
      2
    );

  }

}


/* =================================
   DRAW
================================= */

function draw() {

  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  drawBackground();


  /* Obstacles */

  obstacles.forEach(
    obstacle => {

      if (
        obstacle.type ===
        "bird"
      ) {

        drawBird(
          obstacle
        );

      } else {

        drawCactus(
          obstacle
        );

      }

    }
  );


  /* Dino */

  drawDino();


  /* Particles */

  particles.forEach(
    p => {

      ctx.globalAlpha =
        Math.max(
          0,
          p.life * 2
        );


      pixelRect(
        p.x,
        p.y,
        3,
        3,
        "#555"
      );

    }
  );


  ctx.globalAlpha = 1;

}


/* =================================
   GAME LOOP
================================= */

function loop(now) {

  if (!running) {

    draw();

    return;

  }


  const dt =
    (now - lastTime) /
    1000;


  lastTime = now;


  update(dt);

  draw();


  if (running) {

    requestAnimationFrame(
      loop
    );

  }

}


/* =================================
   KEYBOARD CONTROLS
================================= */

window.addEventListener(
  "keydown",
  event => {

    /* Jump */

    if (
      event.code ===
        "Space" ||

      event.code ===
        "ArrowUp"
    ) {

      event.preventDefault();

      jump();

    }


    /* Duck */

    if (
      event.code ===
      "ArrowDown"
    ) {

      event.preventDefault();

      setDuck(true);

    }

  }
);


/* =================================
   KEY RELEASE
================================= */

window.addEventListener(
  "keyup",
  event => {

    if (
      event.code ===
      "ArrowDown"
    ) {

      setDuck(false);

    }

  }
);


// /* =================================
//    MOUSE / TOUCH
// ================================= */

// canvas.addEventListener(
//   "pointerdown",
//   event => {

//     event.preventDefault();

//     jump();

//   }
// );

```javascript
/* =================================
   MOUSE / TOUCH
================================= */

canvas.addEventListener(
  "pointerdown",
  event => {

    if (
      event.pointerType === "mouse" ||
      event.pointerType === "touch" ||
      event.pointerType === "pen"
    ) {

      event.preventDefault();

      jump();

    }

  }
);


function bindMobileButton(button, action) {

  if (!button) {
    return;
  }


  button.addEventListener(
    "pointerdown",
    event => {

      event.preventDefault();
      event.stopPropagation();

      if (button === mobileDuckBtn) {

        setDuck(true);

      } else {

        action();

      }


      try {

        button.setPointerCapture(
          event.pointerId
        );

      } catch (error) {}

    },
    {
      passive: false
    }
  );


  button.addEventListener(
    "pointerup",
    event => {

      event.preventDefault();
      event.stopPropagation();

      if (
        button === mobileDuckBtn
      ) {

        setDuck(false);

      }

    },
    {
      passive: false
    }
  );


  button.addEventListener(
    "pointercancel",
    event => {

      event.preventDefault();
      event.stopPropagation();

      if (
        button === mobileDuckBtn
      ) {

        setDuck(false);

      }

    },
    {
      passive: false
    }
  );


  button.addEventListener(
    "pointerleave",
    event => {

      if (
        button === mobileDuckBtn &&
        event.pointerType !== "mouse"
      ) {

        setDuck(false);

      }

    }
  );

}


bindMobileButton(
  mobileJumpBtn,
  jump
);


bindMobileButton(
  mobileDuckBtn,
  () => {}
);
```



/* =================================
   RESTART BUTTON
================================= */

restartBtn.addEventListener(
  "click",
  reset
);


/* =================================
   INITIALIZE
================================= */

hiScoreEl.textContent =
  String(
    highScore
  ).padStart(
    5,
    "0"
  );

updateScore();

draw();