/* =========================================================================
   DRIFT RUSH — corrida top-down com física de derrapagem
   Vanilla JS + Canvas. Otimizado para mobile (touch) e desktop (teclado).
   ========================================================================= */
(() => {
  "use strict";

  // ---------- Canvas / contexto ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let DPR = 1, VW = 0, VH = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    VW = window.innerWidth;
    VH = window.innerHeight;
    canvas.width = Math.floor(VW * DPR);
    canvas.height = Math.floor(VH * DPR);
    canvas.style.width = VW + "px";
    canvas.style.height = VH + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- Utilidades ----------
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- Definição da pista ----------
  // Pontos de controle do centro da pista (um circuito fechado).
  const CTRL = [
    { x: 0,    y: -520 },
    { x: 520,  y: -460 },
    { x: 760,  y: -120 },
    { x: 560,  y: 120  },
    { x: 740,  y: 420  },
    { x: 360,  y: 640  },
    { x: -80,  y: 520  },
    { x: -160, y: 200  },
    { x: -520, y: 240  },
    { x: -740, y: -80  },
    { x: -460, y: -360 },
    { x: -160, y: -300 },
  ];
  const ROAD_HALF = 95;        // metade da largura da pista
  const SPLINE_STEPS = 18;     // suavização por segmento

  // Catmull-Rom -> centerline densa e fechada
  function buildCenterline(pts, steps) {
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        out.push({
          x: 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
          y: 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
        });
      }
    }
    // tangentes + bordas
    for (let i = 0; i < out.length; i++) {
      const a = out[i];
      const b = out[(i + 1) % out.length];
      let dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      a.tx = dx; a.ty = dy;          // tangente
      a.nx = -dy; a.ny = dx;         // normal (esquerda)
    }
    return out;
  }
  const CENTER = buildCenterline(CTRL, SPLINE_STEPS);

  // Checkpoints igualmente espaçados ao longo da centerline (0 = largada/chegada)
  const NUM_CP = 8;
  const CHECKPOINTS = [];
  for (let i = 0; i < NUM_CP; i++) {
    const idx = Math.floor((i / NUM_CP) * CENTER.length);
    const c = CENTER[idx];
    CHECKPOINTS.push({ x: c.x, y: c.y, tx: c.tx, ty: c.ty, nx: c.nx, ny: c.ny });
  }

  // Distância (ao quadrado) do ponto ao centro mais próximo da pista
  function nearestCenter(px, py) {
    let best = Infinity, bi = 0;
    for (let i = 0; i < CENTER.length; i++) {
      const dx = px - CENTER[i].x, dy = py - CENTER[i].y;
      const d = dx * dx + dy * dy;
      if (d < best) { best = d; bi = i; }
    }
    return { dist: Math.sqrt(best), index: bi };
  }

  // ---------- Estado do carro ----------
  const car = {
    x: 0, y: 0, angle: 0,
    vx: 0, vy: 0,
    w: 26, h: 46,
  };

  // Parâmetros de física (arcade, sensação de drift)
  const PHYS = {
    engine: 900,        // aceleração do motor (px/s²)
    reverse: 420,
    brake: 1400,
    maxSpeed: 560,
    turnRate: 3.4,      // rad/s no auge
    gripNormal: 0.92,   // quanto da velocidade lateral é mantida por frame (menor = mais aderência)
    gripDrift: 0.985,   // com handbrake: quase nada de aderência -> desliza
    drag: 0.4,          // arrasto longitudinal (proporcional à velocidade)
    rollResist: 14,     // resistência ao rolamento (constante)
    grassFriction: 4.2, // multiplicador de atrito fora da pista
  };

  // ---------- Entradas ----------
  const input = { gas: false, brake: false, left: false, right: false };

  // Teclado (desktop)
  const keyMap = {
    ArrowUp: "gas", KeyW: "gas",
    ArrowDown: "brake", KeyS: "brake",
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    Space: "drift",
  };
  let handbrake = false;
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") handbrake = true;
    const a = keyMap[e.code];
    if (a && a !== "drift") { input[a] = true; e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") handbrake = false;
    const a = keyMap[e.code];
    if (a && a !== "drift") { input[a] = false; e.preventDefault(); }
  });

  // Touch (mobile) — botões com pointer events
  function bindHold(id, on, off) {
    const el = document.getElementById(id);
    if (!el) return;
    const press = (e) => { e.preventDefault(); el.classList.add("pressed"); on(); };
    const release = (e) => { if (e) e.preventDefault(); el.classList.remove("pressed"); off(); };
    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
    el.addEventListener("lostpointercapture", release);
  }
  bindHold("btn-gas",   () => input.gas = true,   () => input.gas = false);
  bindHold("btn-brake", () => { handbrake = true; }, () => { handbrake = false; });
  bindHold("btn-left",  () => input.left = true,  () => input.left = false);
  bindHold("btn-right", () => input.right = true, () => input.right = false);

  // ---------- Marcas de derrapagem (skid marks) ----------
  const skids = []; // {x,y,a} marcas no chão
  const MAX_SKIDS = 700;
  function addSkid(x, y, a) {
    skids.push({ x, y, a });
    if (skids.length > MAX_SKIDS) skids.shift();
  }

  // ---------- Estado de corrida ----------
  const race = {
    lap: 1, totalLaps: 3,
    nextCp: 1,
    lapTime: 0, lastLap: 0, best: loadBest(),
    started: false, finished: false,
    countdown: 0,
  };
  function loadBest() {
    const v = parseFloat(localStorage.getItem("driftrush_best"));
    return isFinite(v) ? v : 0;
  }
  function saveBest(t) {
    race.best = t;
    localStorage.setItem("driftrush_best", String(t));
  }

  function resetCarToStart() {
    const c = CHECKPOINTS[0];
    car.x = c.x; car.y = c.y;
    car.angle = Math.atan2(c.ty, c.tx);
    car.vx = 0; car.vy = 0;
    race.lap = 1; race.nextCp = 1; race.lapTime = 0;
    race.finished = false;
    skids.length = 0;
  }

  // ---------- HUD ----------
  const hud = {
    el: document.getElementById("hud"),
    lap: document.getElementById("hud-lap"),
    time: document.getElementById("hud-time"),
    best: document.getElementById("hud-best"),
    speed: document.getElementById("hud-speed"),
    drift: document.getElementById("hud-drift"),
  };
  function fmt(t) { return t.toFixed(2); }

  // ---------- Crossing de checkpoint ----------
  let prevCar = { x: 0, y: 0 };
  function checkCheckpoints() {
    for (let i = 0; i < CHECKPOINTS.length; i++) {
      const cp = CHECKPOINTS[i];
      // só interessa o próximo checkpoint (ou a chegada=0 quando nextCp deu a volta)
      const isFinish = i === 0;
      const expected = race.nextCp;
      if (i !== expected && !(isFinish && expected === 0)) continue;

      // posição relativa à linha do checkpoint (tangente = direção da pista)
      const s0 = (prevCar.x - cp.x) * cp.tx + (prevCar.y - cp.y) * cp.ty;
      const s1 = (car.x - cp.x) * cp.tx + (car.y - cp.y) * cp.ty;
      const lateral = Math.abs((car.x - cp.x) * cp.nx + (car.y - cp.y) * cp.ny);
      if (s0 <= 0 && s1 > 0 && lateral < ROAD_HALF * 1.3) {
        if (isFinish && expected === 0) {
          // completou uma volta
          race.lastLap = race.lapTime;
          if (!race.best || race.lastLap < race.best) saveBest(race.lastLap);
          flashLap();
          race.lapTime = 0;
          race.lap++;
          if (race.lap > race.totalLaps) {
            finishRace();
          } else {
            race.nextCp = 1;
          }
        } else {
          race.nextCp = (race.nextCp + 1) % CHECKPOINTS.length;
        }
      }
    }
  }

  let lapFlash = 0;
  function flashLap() { lapFlash = 1.2; }

  function finishRace() {
    race.finished = true;
    race.started = false;
    const best = race.best ? fmt(race.best) : "--";
    document.getElementById("overlay-msg").innerHTML =
      `🏁 <b>Corrida concluída!</b><br/>Sua melhor volta: <b>${best}s</b><br/>Pronto para bater o recorde?`;
    document.getElementById("btn-play").textContent = "CORRER DE NOVO";
    showOverlay(true);
  }

  // ---------- Loop principal ----------
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // evita saltos grandes
    if (race.started) update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function update(dt) {
    prevCar.x = car.x; prevCar.y = car.y;

    // contagem regressiva no início
    if (race.countdown > 0) {
      race.countdown -= dt;
      // permite virar mas trava aceleração até o GO
    } else {
      race.lapTime += dt;
    }
    const canDrive = race.countdown <= 0;

    // direção do carro
    const fx = Math.cos(car.angle), fy = Math.sin(car.angle); // frente
    const rx = -fy, ry = fx;                                   // direita

    // velocidade nos eixos local
    let forwardSpd = car.vx * fx + car.vy * fy;
    let lateralSpd = car.vx * rx + car.vy * ry;
    const speed = Math.hypot(car.vx, car.vy);

    // off-road?
    const near = nearestCenter(car.x, car.y);
    const offRoad = near.dist > ROAD_HALF;

    // ----- DIREÇÃO -----
    let steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    // a curva é mais eficaz em velocidade média; some quase parado
    const speedFactor = clamp(speed / 120, 0, 1);
    const dir = forwardSpd >= 0 ? 1 : -1;
    car.angle += steer * PHYS.turnRate * dt * speedFactor * dir;

    // ----- MOTOR / FREIO -----
    if (canDrive && input.gas) {
      forwardSpd += PHYS.engine * dt;
    }
    if (input.brake) {
      if (forwardSpd > 0) forwardSpd = Math.max(0, forwardSpd - PHYS.brake * dt);
      else forwardSpd -= PHYS.reverse * dt; // ré
    }
    // limites
    forwardSpd = clamp(forwardSpd, -PHYS.maxSpeed * 0.4, PHYS.maxSpeed);

    // ----- ADERÊNCIA LATERAL (a alma do drift) -----
    let grip = handbrake ? PHYS.gripDrift : PHYS.gripNormal;
    if (offRoad) grip = Math.min(grip + 0.04, 0.995); // grama escorrega mais
    // grip menor = perde velocidade lateral rápido = agarra; maior = desliza
    lateralSpd *= grip;

    // ----- ATRITO LONGITUDINAL -----
    forwardSpd -= forwardSpd * PHYS.drag * dt;
    if (forwardSpd > 0) forwardSpd = Math.max(0, forwardSpd - PHYS.rollResist * dt);
    else if (forwardSpd < 0) forwardSpd = Math.min(0, forwardSpd + PHYS.rollResist * dt);
    if (offRoad) {
      forwardSpd -= forwardSpd * PHYS.grassFriction * dt; // grama segura o carro
    }

    // recompõe velocidade no mundo
    car.vx = fx * forwardSpd + rx * lateralSpd;
    car.vy = fy * forwardSpd + ry * lateralSpd;

    // integra posição
    car.x += car.vx * dt;
    car.y += car.vy * dt;

    // ----- DETECÇÃO DE DRIFT + skid marks -----
    const drifting = Math.abs(lateralSpd) > 55 && speed > 90;
    if (drifting) {
      // marcas nas duas rodas traseiras
      const bx = car.x - fx * 16, by = car.y - fy * 16;
      addSkid(bx + rx * 9, by + ry * 9, car.angle);
      addSkid(bx - rx * 9, by - ry * 9, car.angle);
    }

    checkCheckpoints();

    // ----- HUD -----
    hud.speed.textContent = Math.round(Math.abs(forwardSpd) * 0.45); // px/s -> "km/h"
    hud.lap.textContent = `${Math.min(race.lap, race.totalLaps)}/${race.totalLaps}`;
    hud.time.textContent = fmt(race.lapTime);
    hud.best.textContent = race.best ? fmt(race.best) : "--.--";
    hud.drift.classList.toggle("on", drifting);
    if (lapFlash > 0) lapFlash -= dt;
  }

  // ---------- Render ----------
  function render() {
    ctx.clearRect(0, 0, VW, VH);

    // fundo (grama)
    ctx.fillStyle = "#1f3a24";
    ctx.fillRect(0, 0, VW, VH);

    // câmera: centraliza no carro com leve look-ahead
    const camX = car.x + car.vx * 0.18;
    const camY = car.y + car.vy * 0.18;
    ctx.save();
    ctx.translate(VW / 2, VH / 2);
    ctx.translate(-camX, -camY);

    drawTrack();
    drawCheckpoints();
    drawSkids();
    drawCar();

    ctx.restore();

    drawCountdown();
    drawLapFlash();
  }

  function drawTrack() {
    // asfalto: traça polígono de borda externa e interna
    const n = CENTER.length;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const c = CENTER[i % n];
      const x = c.x + c.nx * ROAD_HALF, y = c.y + c.ny * ROAD_HALF;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let i = n; i >= 0; i--) {
      const c = CENTER[i % n];
      const x = c.x - c.nx * ROAD_HALF, y = c.y - c.ny * ROAD_HALF;
      ctx.lineTo(x, y);
    }
    ctx.fillStyle = "#2b3038";
    ctx.fill("evenodd");

    // bordas (zebra externa/interna)
    drawEdge(ROAD_HALF);
    drawEdge(-ROAD_HALF);

    // linha central tracejada
    ctx.save();
    ctx.setLineDash([22, 26]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const c = CENTER[i % n];
      i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y);
    }
    ctx.stroke();
    ctx.restore();

    // linha de largada/chegada (xadrez)
    drawStartLine();
  }

  function drawEdge(off) {
    const n = CENTER.length;
    ctx.lineWidth = 8;
    for (let i = 0; i < n; i++) {
      const c = CENTER[i];
      const c2 = CENTER[(i + 1) % n];
      ctx.beginPath();
      ctx.moveTo(c.x + c.nx * off, c.y + c.ny * off);
      ctx.lineTo(c2.x + c2.nx * off, c2.y + c2.ny * off);
      ctx.strokeStyle = (i % 2 === 0) ? "#e23b3b" : "#f5f5f5";
      ctx.stroke();
    }
  }

  function drawStartLine() {
    const cp = CHECKPOINTS[0];
    const cols = 6, cell = (ROAD_HALF * 2) / cols;
    ctx.save();
    ctx.translate(cp.x, cp.y);
    ctx.rotate(Math.atan2(cp.ty, cp.tx));
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#fff" : "#111";
        ctx.fillRect(r * 10 - 10, -ROAD_HALF + c * cell, 10, cell);
      }
    }
    ctx.restore();
  }

  function drawCheckpoints() {
    const cp = CHECKPOINTS[race.nextCp];
    if (!cp || race.nextCp === 0) return;
    ctx.save();
    ctx.strokeStyle = "rgba(0,229,255,0.55)";
    ctx.lineWidth = 6;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(cp.x + cp.nx * ROAD_HALF, cp.y + cp.ny * ROAD_HALF);
    ctx.lineTo(cp.x - cp.nx * ROAD_HALF, cp.y - cp.ny * ROAD_HALF);
    ctx.stroke();
    ctx.restore();
  }

  function drawSkids() {
    ctx.fillStyle = "rgba(15,15,18,0.5)";
    for (let i = 0; i < skids.length; i++) {
      const s = skids[i];
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a);
      ctx.fillRect(-3, -2.5, 6, 5);
      ctx.restore();
    }
  }

  function drawCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle + Math.PI / 2); // sprite aponta p/ cima
    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(-car.w / 2 + 2, -car.h / 2 + 3, car.w, car.h, 6);
    ctx.fill();
    // corpo
    const g = ctx.createLinearGradient(0, -car.h / 2, 0, car.h / 2);
    g.addColorStop(0, "#ff7043");
    g.addColorStop(1, "#e64a19");
    ctx.fillStyle = g;
    roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 6);
    ctx.fill();
    // teto / cockpit
    ctx.fillStyle = "#1b1b1f";
    roundRect(-car.w / 2 + 4, -6, car.w - 8, 18, 4);
    ctx.fill();
    // para-brisa
    ctx.fillStyle = "#9fd3ff";
    roundRect(-car.w / 2 + 5, -car.h / 2 + 5, car.w - 10, 8, 3);
    ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCountdown() {
    if (!race.started) return;
    if (race.countdown > 0) {
      bigText(String(Math.ceil(race.countdown)), "#fff", 1);
    } else if (race.countdown > -0.7) {
      // mostra "GO!" desvanecendo
      bigText("GO!", "#00e676", clamp(race.countdown / -0.7, 0, 1) * -1 + 1);
    }
  }

  function bigText(txt, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = "900 110px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 20;
    ctx.fillText(txt, VW / 2, VH / 2);
    ctx.restore();
  }

  function drawLapFlash() {
    if (lapFlash <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(lapFlash, 0, 1) * 0.9;
    ctx.fillStyle = "#00e5ff";
    ctx.font = "900 48px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`VOLTA ${Math.min(race.lap, race.totalLaps)}  ·  ${fmt(race.lastLap)}s`, VW / 2, 120);
    ctx.restore();
  }

  // ---------- Telas ----------
  const overlay = document.getElementById("overlay");
  function showOverlay(show) {
    overlay.classList.toggle("hidden", !show);
    hud.el.classList.toggle("hidden", show);
    document.getElementById("touch-controls").classList.toggle("hidden", show);
  }

  document.getElementById("btn-play").addEventListener("click", () => {
    resetCarToStart();
    race.started = true;
    race.finished = false;
    race.countdown = 3.2;
    showOverlay(false);
  });

  // inicia loop
  resetCarToStart();
  requestAnimationFrame(frame);
})();
