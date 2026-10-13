// ===== Procedural art: background, turtles, zombies, effects =====

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// Deterministic pseudo random so static decorations don't flicker
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ---------- Background ----------
const bgCache = {};
const BEACH_PAL = {
  seaside: { sky: ['#7cc8f2', '#bfe6fb'], sea: ['#2d8fc4', '#52b6de'], bank: '#e9c98a', lanes: ['#f6dca6', '#eccf93'], nest: '#dcb877', nestHole: '#c49a5a', grain: ['rgba(160,120,60,0.18)', 'rgba(255,255,255,0.25)'] },
  night:   { sky: ['#070b24', '#1b2a5a'], sea: ['#0d2348', '#163a6a'], bank: '#8a7a5e', lanes: ['#a8956f', '#9d8b66'], nest: '#7d6b4f', nestHole: '#5e4f38', grain: ['rgba(40,30,20,0.25)', 'rgba(200,210,255,0.12)'] }
};
const SEA_PAL = {
  underwater: { grad: ['#1679a8', '#0d5684', '#073457'], lanes: ['#9fa98a', '#94a07f'], tint: ['rgba(20,90,150,0.35)', 'rgba(5,40,80,0.35)'], home: '#5a4a6e', corals: ['#ff6f91', '#ff9671', '#ffc75f', '#c34a8a', '#f9f871', '#7ee0c3'], glow: 0 },
  trench:     { grad: ['#0a2a40', '#061a2b', '#01070d'], lanes: ['#5a646b', '#525b62'], tint: ['rgba(10,30,60,0.45)', 'rgba(0,5,15,0.55)'], home: '#161a26', corals: ['#3ff5ff', '#ff4fd8', '#9dff5a', '#7a7bff'], glow: 12 }
};
const groundColor = env => ({ seaside: '#e5c27f', night: '#a8956f', underwater: '#b8c4a8', trench: '#6b747a' })[env] || '#e5c27f';

function getBackground(env) {
  if (bgCache[env]) return bgCache[env];
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const rnd = seeded(env.length * 7 + env.charCodeAt(0));
  if (!isWater(env)) {
    const P = BEACH_PAL[env];
    const night = env === 'night';
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, 50);
    sky.addColorStop(0, P.sky[0]); sky.addColorStop(1, P.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 50);
    if (night) {
      for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; ctx.fillRect(rnd() * W, rnd() * 42, 1.5, 1.5); }
      // moon with craters
      ctx.fillStyle = 'rgba(255,250,220,0.18)'; ell(ctx, 120, 22, 30, 30); ctx.fill();
      ctx.fillStyle = '#f7f1d4'; ell(ctx, 120, 22, 17, 17); ctx.fill();
      ctx.fillStyle = 'rgba(180,170,140,0.5)'; ell(ctx, 114, 18, 4, 4); ctx.fill(); ell(ctx, 125, 27, 3, 3); ctx.fill(); ell(ctx, 126, 15, 2, 2); ctx.fill();
    } else {
      ctx.fillStyle = '#ffe680'; ell(ctx, 120, 22, 18, 18); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,128,0.3)'; ell(ctx, 120, 22, 28, 28); ctx.fill();
    }
    // clouds
    ctx.fillStyle = night ? 'rgba(120,130,170,0.35)' : 'rgba(255,255,255,0.9)';
    for (const [cx, cy] of [[330, 20], [600, 14], [780, 26]]) {
      ell(ctx, cx, cy, 26, 9); ctx.fill(); ell(ctx, cx + 18, cy - 5, 16, 9); ctx.fill(); ell(ctx, cx - 16, cy - 2, 13, 7); ctx.fill();
    }
    // far sea strip
    const sea = ctx.createLinearGradient(0, 40, 0, GRID_Y);
    sea.addColorStop(0, P.sea[0]); sea.addColorStop(1, P.sea[1]);
    ctx.fillStyle = sea; ctx.fillRect(0, 42, W, GRID_Y - 42);
    if (night) { ctx.fillStyle = 'rgba(255,250,220,0.25)'; for (let i = 0; i < 6; i++) ctx.fillRect(100 + rnd() * 40, 46 + i * 4, 10 + rnd() * 30, 2); }
    // sand bank + lanes
    ctx.fillStyle = P.bank; ctx.fillRect(0, GRID_Y - 8, W, H - GRID_Y + 8);
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        ctx.fillStyle = P.lanes[(r + col) % 2];
        ctx.fillRect(GRID_X + col * CELL_W, GRID_Y + r * CELL_H, CELL_W, CELL_H);
      }
    }
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = rnd() < 0.5 ? P.grain[0] : P.grain[1];
      ctx.fillRect(rnd() * W, GRID_Y + rnd() * (H - GRID_Y), 2, 2);
    }
    // nest column
    ctx.fillStyle = P.nest; ctx.fillRect(0, GRID_Y, GRID_X - 4, ROWS * CELL_H);
    for (let r = 0; r < ROWS; r++) {
      const y = GRID_Y + r * CELL_H + CELL_H - 30;
      ctx.fillStyle = P.nestHole; ell(ctx, 26, y + 6, 22, 9); ctx.fill();
      for (let e = 0; e < 4; e++) {
        ctx.fillStyle = night ? '#e8e4d4' : '#fffaf0'; ell(ctx, 16 + e * 7, y + 1 - (e % 2) * 4, 6, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    for (let i = 0; i < 14; i++) {
      const x = GRID_X + rnd() * (CELL_W * COLS), y = GRID_Y + 10 + rnd() * (ROWS * CELL_H - 20);
      if (rnd() < 0.5) drawStarfish(ctx, x, y, 6 + rnd() * 3, rnd() < 0.5 ? '#f08a5d' : '#f6c453');
      else drawShell(ctx, x, y, 5 + rnd() * 3);
    }
    if (night) {
      // tiki torches along the top bank
      for (const x of [260, 520, 780]) {
        ctx.fillStyle = '#5a3d22'; ctx.fillRect(x - 2, GRID_Y - 30, 4, 26);
        ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 5, GRID_Y - 34, 10, 7);
      }
      // moonlight darkening
      ctx.fillStyle = 'rgba(10,20,60,0.25)'; ctx.fillRect(0, GRID_Y, W, H - GRID_Y);
    }
  } else {
    const P = SEA_PAL[env];
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.grad[0]); g.addColorStop(0.3, P.grad[1]); g.addColorStop(1, P.grad[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        ctx.fillStyle = P.lanes[(r + col) % 2];
        ctx.fillRect(GRID_X + col * CELL_W, GRID_Y + r * CELL_H, CELL_W, CELL_H);
      }
    }
    const tint = ctx.createLinearGradient(0, GRID_Y, 0, H);
    tint.addColorStop(0, P.tint[0]); tint.addColorStop(1, P.tint[1]);
    ctx.fillStyle = tint; ctx.fillRect(GRID_X, GRID_Y, CELL_W * COLS, ROWS * CELL_H);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,30,50,0.2)' : 'rgba(200,230,255,0.12)';
      ctx.fillRect(GRID_X + rnd() * CELL_W * COLS, GRID_Y + rnd() * ROWS * CELL_H, 2, 2);
    }
    // home column: coral reef (or glowing deep-sea coral in the trench)
    ctx.fillStyle = P.home; ctx.fillRect(0, GRID_Y, GRID_X - 4, ROWS * CELL_H);
    ctx.shadowBlur = P.glow;
    for (let i = 0; i < 26; i++) {
      const x = 6 + rnd() * (GRID_X - 16), y = GRID_Y + 10 + rnd() * (ROWS * CELL_H - 10);
      const col = P.corals[Math.floor(rnd() * P.corals.length)];
      ctx.shadowColor = col;
      drawCoral(ctx, x, y, 8 + rnd() * 10, col, rnd);
    }
    ctx.shadowBlur = 0;
    for (let i = 0; i < 10; i++) {
      const x = GRID_X + rnd() * (CELL_W * COLS), y = GRID_Y + 15 + rnd() * (ROWS * CELL_H - 25);
      if (rnd() < 0.5 || env === 'trench') {
        ctx.fillStyle = 'rgba(30,35,45,0.55)'; ell(ctx, x, y, 7 + rnd() * 6, 4 + rnd() * 3); ctx.fill();
      } else drawShell(ctx, x, y, 5);
    }
    ctx.fillStyle = env === 'trench' ? 'rgba(5,10,15,0.6)' : 'rgba(30,50,60,0.5)';
    ctx.fillRect(GRID_RIGHT, GRID_Y, W - GRID_RIGHT, ROWS * CELL_H);
    if (env === 'trench') {
      // hydrothermal vent chimneys on the right
      for (const [x, h] of [[GRID_RIGHT + 30, 180], [GRID_RIGHT + 80, 260], [GRID_RIGHT + 120, 140]]) {
        ctx.fillStyle = '#1c1f26';
        ctx.beginPath(); ctx.moveTo(x - 18, H); ctx.lineTo(x - 7, H - h); ctx.lineTo(x + 7, H - h); ctx.lineTo(x + 18, H); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,120,40,0.5)'; ell(ctx, x, H - h, 8, 3); ctx.fill();
      }
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(GRID_X, GRID_Y + r * CELL_H); ctx.lineTo(GRID_RIGHT, GRID_Y + r * CELL_H); ctx.stroke(); }
  bgCache[env] = c;
  return c;
}

function drawStarfish(ctx, x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
function drawShell(ctx, x, y, r) {
  ctx.fillStyle = '#fbe3d6'; ctx.beginPath();
  ctx.moveTo(x, y + r * 0.6);
  ctx.arc(x, y, r, Math.PI * 0.95, Math.PI * 2.05);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d7a99a'; ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x, y + r * 0.6); ctx.lineTo(x + i * r * 0.4, y - r * 0.8); ctx.stroke(); }
}
function drawCoral(ctx, x, y, s, color, rnd) {
  ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.35;
  const branch = (bx, by, len, ang, depth) => {
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
    if (depth > 0) { branch(ex, ey, len * 0.7, ang - 0.5 - rnd() * 0.2, depth - 1); branch(ex, ey, len * 0.7, ang + 0.5 + rnd() * 0.2, depth - 1); }
  };
  branch(x, y, s, -Math.PI / 2, 2);
}

function drawBackgroundAnimated(ctx, env, t) {
  if (!isWater(env)) {
    const night = env === 'night';
    // shoreline on the right: zombies come out of the sea
    const g = ctx.createLinearGradient(GRID_RIGHT, 0, W, 0);
    g.addColorStop(0, night ? '#1d4a7a' : '#5cc2e6'); g.addColorStop(1, night ? '#0b2244' : '#2a86bd');
    ctx.fillStyle = g;
    const edge = y => GRID_RIGHT + 18 + Math.sin(y * 0.05 + t * 1.6) * 7 + Math.sin(t * 0.7) * 6;
    ctx.beginPath();
    ctx.moveTo(W, GRID_Y - 30);
    for (let y = GRID_Y - 30; y <= H; y += 10) ctx.lineTo(edge(y), y);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // foam (glowing bioluminescent foam at night)
    ctx.save();
    if (night) { ctx.shadowBlur = 14; ctx.shadowColor = '#5ffff0'; }
    ctx.strokeStyle = night ? `rgba(110,255,235,${0.6 + Math.sin(t * 2) * 0.2})` : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let y = GRID_Y - 30; y <= H; y += 10) { if (y === GRID_Y - 30) ctx.moveTo(edge(y), y); else ctx.lineTo(edge(y), y); }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = night ? 'rgba(180,200,255,0.3)' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const x = ((i * 97 + t * 14) % (W + 40)) - 20, y = 50 + (i % 3) * 6;
      ctx.beginPath(); ctx.arc(x, y, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
    if (night) {
      // torch flames
      for (const x of [260, 520, 780]) {
        const f = Math.sin(t * 12 + x) * 2;
        ctx.fillStyle = 'rgba(255,160,40,0.25)'; ell(ctx, x, GRID_Y - 40, 16, 16); ctx.fill();
        ctx.fillStyle = '#ffb347'; ell(ctx, x, GRID_Y - 40 + f * 0.3, 5, 9 + f); ctx.fill();
        ctx.fillStyle = '#fff1a8'; ell(ctx, x, GRID_Y - 37, 2.5, 4); ctx.fill();
      }
      // fireflies / glowing plankton drifting over the sand
      for (let i = 0; i < 14; i++) {
        const x = (i * 131 + Math.sin(t * 0.4 + i) * 60 + t * 6) % W, y = GRID_Y + 40 + ((i * 73) % (ROWS * CELL_H - 60)) + Math.sin(t + i) * 12;
        ctx.fillStyle = `rgba(200,255,150,${0.3 + 0.3 * Math.sin(t * 3 + i * 2)})`; ell(ctx, x, y, 2, 2); ctx.fill();
      }
    }
  } else if (env === 'underwater') {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const x = 120 + i * 170 + Math.sin(t * 0.3 + i) * 30;
      ctx.fillStyle = `rgba(180,230,255,${0.05 + 0.03 * Math.sin(t * 0.8 + i * 2)})`;
      ctx.beginPath(); ctx.moveTo(x - 25, 0); ctx.lineTo(x + 25, 0); ctx.lineTo(x + 110, H); ctx.lineTo(x + 30, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(200,240,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, 8 + Math.sin(x * 0.04 + t * 2) * 4);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const bx = GRID_RIGHT + 14 + i * 19, by = H;
      ctx.strokeStyle = i % 2 ? '#2f7d4a' : '#3d9a5a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by);
      for (let s = 1; s <= 10; s++) ctx.lineTo(bx + Math.sin(t * 1.2 + s * 0.6 + i) * (4 + s * 1.3), by - s * (40 + (i % 3) * 8));
      ctx.stroke();
    }
  } else {
    // trench: vent plumes and drifting bioluminescent specks
    for (const [x, h] of [[GRID_RIGHT + 30, 180], [GRID_RIGHT + 80, 260], [GRID_RIGHT + 120, 140]]) {
      for (let k = 0; k < 6; k++) {
        const u = ((t * 0.35 + k / 6 + x * 0.01) % 1);
        ctx.fillStyle = `rgba(40,40,50,${0.5 * (1 - u)})`;
        ell(ctx, x + Math.sin(u * 6 + x) * 10 * u, H - h - u * 160, 8 + u * 22, 8 + u * 18); ctx.fill();
      }
      ctx.fillStyle = `rgba(255,140,50,${0.35 + 0.2 * Math.sin(t * 5 + x)})`; ell(ctx, x, H - h, 10, 4); ctx.fill();
    }
    for (let i = 0; i < 28; i++) {
      const x = (i * 211 + t * (4 + (i % 5))) % W, y = (i * 97 + Math.sin(t * 0.5 + i) * 30 + 600 - (t * 3 * (1 + (i % 3))) % 600) % H;
      const a = 0.35 + 0.35 * Math.sin(t * 2 + i);
      ctx.fillStyle = i % 3 ? `rgba(90,255,240,${a})` : `rgba(255,110,230,${a})`;
      ell(ctx, x, y, 1.8, 1.8); ctx.fill();
    }
    // anglerfish silhouette lights far away
    const ax = (t * 12) % (W + 200) - 100;
    ctx.fillStyle = `rgba(255,240,140,${0.4 + 0.3 * Math.sin(t * 4)})`; ell(ctx, W - ax, 36, 2.5, 2.5); ctx.fill();
  }
}

// ---------- Turtles (drawn in local space: feet at 0,0, facing right) ----------
const TURTLE_LOOK = {
  hawksbill:   { shell: '#b8682a', dark: '#5a2d0c', rim: '#e8c07a', skin: '#c9a36b', flippers: true, dome: 0.85, w: 54, pattern: 'hawks' },
  green:       { shell: '#3f9a4f', dark: '#1d5a2a', rim: '#c8e6a0', skin: '#8fcf7a', flippers: true, dome: 0.9, w: 54, pattern: 'hex' },
  galapagos:   { shell: '#6e655a', dark: '#38312a', rim: '#9a8d7a', skin: '#8f8472', flippers: false, dome: 1.35, w: 66, pattern: 'rings', headR: 12 },
  snapper:     { shell: '#55543a', dark: '#22221a', rim: '#7d7a55', skin: '#6e6b4a', flippers: false, dome: 0.85, w: 56, pattern: 'spiky', headR: 15 },
  loggerhead:  { shell: '#ac5a30', dark: '#5e2a12', rim: '#f0d2a8', skin: '#d9b48a', flippers: true, dome: 0.9, w: 56, pattern: 'hex', headR: 14 },
  leatherback: { shell: '#2e3848', dark: '#11161d', rim: '#5a6a80', skin: '#45546a', flippers: true, dome: 0.85, w: 62, pattern: 'ridge' },
  ridley:      { shell: '#7f8d3c', dark: '#454f1c', rim: '#d8dc9a', skin: '#a7b46a', flippers: true, dome: 0.85, w: 48, pattern: 'hex' },
  twinpearl:   { shell: '#d4a52a', dark: '#7a5a10', rim: '#fff0b0', skin: '#e0c890', flippers: true, dome: 0.9, w: 56, pattern: 'hawks' },
  star:        { shell: '#3a2a14', dark: '#1b1208', rim: '#c9a227', skin: '#b59a5a', flippers: false, dome: 1.0, w: 54, pattern: 'star' },
  flatback:    { shell: '#8c9466', dark: '#4d5530', rim: '#d8dcb0', skin: '#b9b48a', flippers: true, dome: 0.6, w: 62, pattern: 'hex' },
  matamata:    { shell: '#6b5a3a', dark: '#3a2e1a', rim: '#8a7a55', skin: '#8a7b52', flippers: false, dome: 0.75, w: 58, pattern: 'spiky', headR: 10 }
};

function drawTurtle(ctx, type, st, t) {
  st = st || {};
  if (type === 'softshell') return drawSoftshell(ctx, st, t);
  const o = TURTLE_LOOK[type];
  const w = o.w, h = 30 * o.dome, baseY = -14;
  const bob = Math.sin(t * 2.2 + (st.seed || 0)) * 1.2;
  ctx.save();
  if (type === 'ridley' && st.fuse != null) {
    const k = 1 + (1 - st.fuse / TURTLES.ridley.fuse) * 0.5;
    ctx.scale(k, k);
  }
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, 0, 0, w * 0.62, 7); ctx.fill();
  ctx.translate(0, bob);
  // back limb
  if (o.flippers) drawFlipper(ctx, -w * 0.32, baseY + 2, o, t, -1, 0.75);
  else drawLeg(ctx, -w * 0.3, baseY, o);
  // head + neck
  const recoil = (st.shoot || 0) * 4;
  let hx = w / 2 + 6 - recoil, hy = baseY - 10;
  if (type === 'galapagos') { hx = w / 2 + 10; hy = baseY - 22; }
  if (type === 'snapper') { hx = w / 2 + 8; hy = baseY - 6; }
  const hr = o.headR || 11;
  ctx.fillStyle = o.skin; ctx.strokeStyle = shade(o.skin, -40); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w * 0.28, baseY + 2); ctx.quadraticCurveTo(hx - 6, hy + 10, hx, hy + hr * 0.6);
  ctx.lineTo(hx - 2, hy - hr * 0.5); ctx.quadraticCurveTo(hx - 12, hy - 4, w * 0.25, baseY - 10); ctx.closePath(); ctx.fill();
  ell(ctx, hx, hy, hr * 1.1, hr); ctx.fill(); ctx.stroke();
  // skin scales
  ctx.fillStyle = shade(o.skin, -25);
  ell(ctx, hx - 3, hy - hr * 0.5, 3, 2); ctx.fill(); ell(ctx, hx + 3, hy - hr * 0.6, 2.5, 1.6); ctx.fill();
  drawHeadFeatures(ctx, type, hx, hy, hr, st, t);
  // shell
  const grad = ctx.createLinearGradient(0, baseY - h, 0, baseY);
  grad.addColorStop(0, shade(o.shell, 35)); grad.addColorStop(1, o.shell);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(0, baseY, w / 2, h, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  drawShellPattern(ctx, o, w, h, baseY);
  ctx.restore();
  ctx.strokeStyle = o.dark; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, baseY, w / 2, h, 0, Math.PI, 0); ctx.stroke();
  if (o.pattern === 'spiky') {
    ctx.fillStyle = o.dark;
    for (let i = -2; i <= 2; i++) {
      const a = Math.PI * 1.5 + i * 0.42, px = Math.cos(a) * w / 2, py = baseY + Math.sin(a) * h;
      ctx.beginPath(); ctx.moveTo(px - 5, py + 2); ctx.lineTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9); ctx.lineTo(px + 5, py + 2); ctx.closePath(); ctx.fill();
    }
  }
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ell(ctx, -w * 0.15, baseY - h * 0.7, w * 0.16, h * 0.15, -0.3); ctx.fill();
  // rim / plastron
  ctx.fillStyle = o.rim; rrect(ctx, -w / 2 - 2, baseY - 3, w + 4, 7, 3.5); ctx.fill();
  ctx.strokeStyle = o.dark; ctx.lineWidth = 1.5; ctx.stroke();
  // front limb
  if (o.flippers) drawFlipper(ctx, w * 0.22, baseY + 3, o, t, 1, 1);
  else drawLeg(ctx, w * 0.22, baseY, o);

  // type extras
  if (type === 'hawksbill') {
    const ready = st.ready || 0;
    const py = baseY - h - 7;
    ctx.globalAlpha = 0.35 + ready * 0.65;
    drawPearlShape(ctx, 0, py, 5 + ready * 4, t);
    ctx.globalAlpha = 1;
    if (ready > 0.85) sparkle(ctx, 8, py - 8, 4 + Math.sin(t * 8) * 2, '#fff');
  }
  if (type === 'galapagos' && st.hpRatio != null) {
    ctx.strokeStyle = 'rgba(30,20,10,0.8)'; ctx.lineWidth = 2;
    if (st.hpRatio < 0.67) { ctx.beginPath(); ctx.moveTo(-6, baseY - h); ctx.lineTo(-2, baseY - h * 0.7); ctx.lineTo(-8, baseY - h * 0.5); ctx.lineTo(-3, baseY - h * 0.25); ctx.stroke(); }
    if (st.hpRatio < 0.34) { ctx.beginPath(); ctx.moveTo(14, baseY - h * 0.9); ctx.lineTo(10, baseY - h * 0.6); ctx.lineTo(16, baseY - h * 0.4); ctx.lineTo(12, baseY - h * 0.1); ctx.stroke(); }
  }
  if (type === 'loggerhead') {
    for (let i = 0; i < 3; i++) {
      const a = t * 1.5 + i * Math.PI * 2 / 3;
      const cx = Math.cos(a) * (w * 0.55), cy = baseY - h * 0.5 + Math.sin(a) * 12;
      ctx.fillStyle = 'rgba(190,240,255,0.9)';
      ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx, cy + 5); ctx.lineTo(cx - 3, cy); ctx.closePath(); ctx.fill();
    }
  }
  if (type === 'ridley' && st.fuse != null) {
    const flash = Math.sin(t * 40) > 0;
    ctx.fillStyle = flash ? 'rgba(255,80,40,0.45)' : 'rgba(255,240,200,0.35)';
    ctx.beginPath(); ctx.ellipse(0, baseY, w / 2 + 4, h + 4, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  }
  if (type === 'twinpearl') {
    const ready = st.ready || 0;
    ctx.globalAlpha = 0.35 + ready * 0.65;
    drawPearlShape(ctx, -9, baseY - h - 5, 4 + ready * 4, t);
    drawPearlShape(ctx, 9, baseY - h - 5, 4 + ready * 4, t);
    ctx.globalAlpha = 1;
    if (ready > 0.85) sparkle(ctx, 0, baseY - h - 16, 4 + Math.sin(t * 8) * 2, '#fff');
    // little crown
    ctx.fillStyle = '#ffd700'; ctx.strokeStyle = '#a07800'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx - 7, hy - hr + 1); ctx.lineTo(hx - 7, hy - hr - 7); ctx.lineTo(hx - 3, hy - hr - 2); ctx.lineTo(hx, hy - hr - 9);
    ctx.lineTo(hx + 3, hy - hr - 2); ctx.lineTo(hx + 7, hy - hr - 7); ctx.lineTo(hx + 7, hy - hr + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (type === 'star') {
    // buried low in the ground with spikes poking out
    const ext = 7 + (st.shoot || 0) * 6;
    ctx.fillStyle = '#efe6cc';
    for (let i = -3; i <= 3; i++) {
      const a = Math.PI * 1.5 + i * 0.38, px = Math.cos(a) * w / 2, py = baseY + Math.sin(a) * h;
      ctx.beginPath(); ctx.moveTo(px - 3.5, py + 1); ctx.lineTo(px + Math.cos(a) * ext, py + Math.sin(a) * ext); ctx.lineTo(px + 3.5, py + 1); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = groundColor(st.env || 'seaside');
    ell(ctx, 0, baseY + 8, w * 0.75, 11); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ell(ctx, -10, baseY + 4, 14, 3); ctx.fill();
  }
  if (type === 'flatback' && !(st.shoot > 0.4)) drawUrchin(ctx, -4, baseY - h - 6, 7, t);
  if (type === 'matamata') {
    if (st.held === 'bucket') {
      ctx.fillStyle = '#2f7fd8';
      ctx.beginPath(); ctx.moveTo(-12, baseY - h + 4); ctx.lineTo(10, baseY - h + 4); ctx.lineTo(7, baseY - h - 14); ctx.lineTo(-9, baseY - h - 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(-11, baseY - h - 1, 21, 3);
    } else if (st.held === 'diver') {
      ctx.fillStyle = '#c8913a'; ell(ctx, 0, baseY - h - 6, 12, 12); ctx.fill();
      ctx.fillStyle = 'rgba(150,210,230,0.6)'; ell(ctx, -3, baseY - h - 6, 5, 5); ctx.fill();
    } else if (st.held === 'anchor') {
      ctx.strokeStyle = '#4a5560'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, baseY - h - 20); ctx.lineTo(0, baseY - h + 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, baseY - h - 6, 9, 0.3, Math.PI - 0.3); ctx.stroke();
    } else {
      // ready: magnetic pulses in front of the head
      for (let i = 0; i < 2; i++) {
        const k = (t * 1.2 + i * 0.5) % 1;
        ctx.strokeStyle = `rgba(${i ? '255,90,90' : '90,170,255'},${1 - k})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(hx + 8, hy, 8 + k * 18, -0.8, 0.8); ctx.stroke();
      }
    }
  }
  if (type === 'snapper' && st.chewing) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.globalAlpha = 0.7 + Math.sin(t * 6) * 0.3;
    ctx.fillText('munch', hx - 4, hy - hr - 8);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawHeadFeatures(ctx, type, hx, hy, hr, st, t) {
  const blink = ((t + (st.seed || 0)) % 4.3) < 0.12;
  const ex = hx + hr * 0.25, ey = hy - hr * 0.25;
  // eye
  if (type === 'snapper' && st.chewing) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex, ey + 1, 3.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else if (blink) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ex - 4, ey); ctx.lineTo(ex + 4, ey); ctx.stroke();
  } else {
    ctx.fillStyle = '#fff'; ell(ctx, ex, ey, 4.6, 5); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#111'; ell(ctx, ex + 1.5, ey + 0.5, 2.3, 2.8); ctx.fill();
    ctx.fillStyle = '#fff'; ell(ctx, ex + 2.2, ey - 0.8, 0.9, 0.9); ctx.fill();
  }
  if (type === 'galapagos' && st.hpRatio != null && st.hpRatio < 0.5) {
    ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ex - 5, ey - 8); ctx.lineTo(ex + 4, ey - 6); ctx.stroke();
  }
  const mx = hx + hr * 1.05, my = hy + hr * 0.25;
  if (type === 'green' || type === 'loggerhead' || type === 'leatherback') {
    // bubble-blowing snout
    const r = 5 + (st.shoot || 0) * 2.5;
    ctx.fillStyle = shade(TURTLE_LOOK[type].skin, -10); ell(ctx, mx + 2, my, r + 1.5, r + 2); ctx.fill();
    ctx.fillStyle = type === 'loggerhead' ? '#2a6f8a' : '#1d3b2a'; ell(ctx, mx + 3.5, my, r * 0.6, r * 0.75); ctx.fill();
    if (type === 'loggerhead') { ctx.fillStyle = 'rgba(200,245,255,0.8)'; ell(ctx, hx, hy - hr * 0.85, hr * 0.7, 3); ctx.fill(); }
  } else if (type === 'matamata') {
    ctx.fillStyle = TURTLE_LOOK.matamata.skin;
    ctx.beginPath(); ctx.moveTo(hx + hr * 0.7, hy - 4); ctx.lineTo(hx + hr * 2.0, hy - 1); ctx.lineTo(hx + hr * 0.7, hy + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(TURTLE_LOOK.matamata.skin, -30);
    for (let i = 0; i < 4; i++) { const fx = hx - 10 + i * 6; ctx.beginPath(); ctx.moveTo(fx, hy + hr * 0.6); ctx.lineTo(fx + 3, hy + hr * 0.6 + 6 + Math.sin(t * 4 + i) * 1.5); ctx.lineTo(fx + 6, hy + hr * 0.6); ctx.closePath(); ctx.fill(); }
  } else if (type === 'hawksbill' || type === 'twinpearl') {
    ctx.fillStyle = '#8a6a3a';
    ctx.beginPath(); ctx.moveTo(hx + hr * 0.8, hy - 2); ctx.lineTo(hx + hr * 1.55, hy + 3); ctx.lineTo(hx + hr * 0.8, hy + 6); ctx.closePath(); ctx.fill();
  } else if (type === 'snapper') {
    if (st.chewing) {
      const m = Math.sin(t * 10) * 2;
      ctx.fillStyle = shade(TURTLE_LOOK.snapper.skin, 15); ell(ctx, hx + 2, hy + hr * 0.4 + m * 0.3, hr * 0.8, hr * 0.55 + m * 0.4); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + hr * 0.3, my + 3); ctx.lineTo(hx + hr * 1.1, my + 1); ctx.stroke();
    } else {
      const open = 0.6 + Math.sin(t * 3) * 0.15;
      ctx.fillStyle = '#5a1020';
      ctx.beginPath(); ctx.moveTo(hx + hr * 0.2, my); ctx.lineTo(hx + hr * 1.4, my - 6 * open); ctx.lineTo(hx + hr * 1.4, my + 10 * open); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) { const tx = hx + hr * (0.6 + i * 0.28); ctx.beginPath(); ctx.moveTo(tx, my - 3 * open); ctx.lineTo(tx + 2, my + 1); ctx.lineTo(tx + 4, my - 3.5 * open); ctx.fill(); }
      // pink worm lure
      ctx.strokeStyle = '#ff7aa8'; ctx.lineWidth = 2.5; ctx.beginPath();
      ctx.moveTo(hx + hr * 0.7, my + 4); ctx.quadraticCurveTo(hx + hr * 1.0, my + Math.sin(t * 8) * 3, hx + hr * 1.2, my + 3); ctx.stroke();
      // hooked beak
      ctx.fillStyle = '#3a3826';
      ctx.beginPath(); ctx.moveTo(hx + hr * 0.6, hy - hr * 0.3); ctx.quadraticCurveTo(hx + hr * 1.6, hy - 4, hx + hr * 1.45, my - 6 * open + 3); ctx.lineTo(hx + hr * 1.1, my - 5 * open); ctx.closePath(); ctx.fill();
    }
  } else {
    ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(hx + hr * 0.55, hy + hr * 0.15, hr * 0.45, 0.2, 1.2); ctx.stroke();
  }
}

function drawShellPattern(ctx, o, w, h, baseY) {
  ctx.strokeStyle = o.dark; ctx.lineWidth = 2;
  if (o.pattern === 'ridge') {
    ctx.lineWidth = 2.5;
    for (const k of [0.75, 0.45, 0.15]) {
      ctx.beginPath(); ctx.ellipse(0, baseY, w / 2 * k + 6, h * (k * 0.5 + 0.5), 0, Math.PI, 0); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const rnd = seeded(3);
    for (let i = 0; i < 16; i++) { ell(ctx, (rnd() - 0.5) * w, baseY - rnd() * h, 1.4, 1.4); ctx.fill(); }
    return;
  }
  const hex = (cx, cy, r) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 0.85); }
    ctx.closePath();
  };
  const rs = h * 0.33;
  const cells = [[0, baseY - h * 0.62], [-w * 0.3, baseY - h * 0.42], [w * 0.3, baseY - h * 0.42], [-w * 0.15, baseY - h * 0.08], [w * 0.15, baseY - h * 0.08], [-w * 0.45, baseY - h * 0.05], [w * 0.45, baseY - h * 0.05]];
  for (const [cx, cy] of cells) {
    hex(cx, cy, rs);
    if (o.pattern === 'hawks') { ctx.fillStyle = 'rgba(240,190,100,0.5)'; ctx.fill(); }
    ctx.stroke();
    if (o.pattern === 'rings') { hex(cx, cy, rs * 0.55); ctx.stroke(); }
    if (o.pattern === 'star') {
      ctx.strokeStyle = '#e8c547'; ctx.lineWidth = 1.6;
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * rs * 0.85, cy + Math.sin(a) * rs * 0.7); ctx.stroke(); }
      ctx.fillStyle = '#e8c547'; ell(ctx, cx, cy, 2.5, 2.2); ctx.fill();
      ctx.strokeStyle = o.dark; ctx.lineWidth = 2;
    }
    if (o.pattern === 'hawks') {
      ctx.fillStyle = 'rgba(70,30,10,0.55)';
      ell(ctx, cx - 2, cy + 1, rs * 0.35, rs * 0.25, 0.6); ctx.fill();
    }
  }
}

function drawFlipper(ctx, x, y, o, t, dir, s) {
  ctx.save(); ctx.translate(x, y);
  ctx.rotate((dir > 0 ? 0.55 : 2.6) + Math.sin(t * 3 + dir) * 0.18);
  ctx.fillStyle = o.skin; ctx.strokeStyle = shade(o.skin, -40); ctx.lineWidth = 1.5;
  ell(ctx, 11 * s, 0, 14 * s, 5.5 * s); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(o.skin, -20);
  ell(ctx, 8 * s, -1, 3, 1.6); ctx.fill(); ell(ctx, 15 * s, 0, 2.5, 1.4); ctx.fill();
  ctx.restore();
}
function drawLeg(ctx, x, y, o) {
  ctx.fillStyle = o.skin; ctx.strokeStyle = shade(o.skin, -40); ctx.lineWidth = 1.5;
  rrect(ctx, x - 6, y - 4, 12, 18, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8e0c8';
  for (let i = 0; i < 3; i++) { ell(ctx, x - 4 + i * 4, y + 13, 1.6, 1.3); ctx.fill(); }
}

function drawSoftshell(ctx, st, t) {
  const armed = st.armed;
  // sand mound
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ell(ctx, 0, 0, 34, 7); ctx.fill();
  ctx.fillStyle = groundColor(st.env || 'seaside');
  ctx.beginPath(); ctx.ellipse(0, -2, 32, armed ? 12 : 9, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ell(ctx, -8, -8, 10, 3); ctx.fill();
  if (armed) {
    // flat leathery shell peeking out
    ctx.fillStyle = '#9a8a5a'; ctx.beginPath(); ctx.ellipse(-2, -9, 24, 8, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(60,50,30,0.4)';
    for (let i = 0; i < 5; i++) { ell(ctx, -16 + i * 7, -12 + (i % 2) * 2, 1.8, 1.8); ctx.fill(); }
    // snorkel-like snout and eyes
    const pop = Math.abs(Math.sin(t * 3)) * 2;
    ctx.fillStyle = '#b8a670'; ell(ctx, 20, -12 - pop, 8, 6); ctx.fill();
    ctx.fillStyle = '#b8a670'; rrect(ctx, 25, -15 - pop, 9, 4, 2); ctx.fill();
    ctx.fillStyle = '#fff'; ell(ctx, 19, -15 - pop, 2.8, 2.8); ctx.fill(); ell(ctx, 24, -16 - pop, 2.5, 2.5); ctx.fill();
    ctx.fillStyle = '#111'; ell(ctx, 19.8, -15 - pop, 1.3, 1.5); ctx.fill(); ell(ctx, 24.8, -16 - pop, 1.2, 1.4); ctx.fill();
    // ready light
    ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff3b3b' : '#ffb0b0';
    ell(ctx, 0, -24, 3.5, 3.5); ctx.fill();
  } else {
    // just the snout poking out, sleeping
    ctx.fillStyle = '#b8a670'; rrect(ctx, 16, -9, 9, 4, 2); ctx.fill();
    ctx.fillStyle = 'rgba(40,40,60,0.7)'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    const z = (t * 0.8) % 1;
    ctx.globalAlpha = 1 - z; ctx.fillText('z', 26 + z * 8, -14 - z * 14); ctx.globalAlpha = 1;
    if (st.armProgress != null) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; rrect(ctx, -20, 6, 40, 5, 2.5); ctx.fill();
      ctx.fillStyle = '#ffcf4a'; rrect(ctx, -20, 6, 40 * st.armProgress, 5, 2.5); ctx.fill();
    }
  }
}

function drawUrchin(ctx, x, y, r, t) {
  ctx.strokeStyle = '#3a1a4a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = i * Math.PI / 7 + t * 2;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6); ctx.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6); ctx.stroke();
  }
  ctx.fillStyle = '#6a2c82'; ell(ctx, x, y, r, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ell(ctx, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.25); ctx.fill();
}
function drawPearlShape(ctx, x, y, r, t) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#f6eef8'); g.addColorStop(1, '#d9b9e0');
  ctx.fillStyle = g; ell(ctx, x, y, r, r); ctx.fill();
  ctx.strokeStyle = 'rgba(150,100,170,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ell(ctx, x - r * 0.35, y - r * 0.35, r * 0.22, r * 0.16, -0.6); ctx.fill();
}
function sparkle(ctx, x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.25, y - r * 0.25); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.25, y + r * 0.25);
  ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.25, y + r * 0.25); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.25, y - r * 0.25);
  ctx.closePath(); ctx.fill();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ---------- Zombies (local space: feet at 0,0, facing left) ----------
const ZOMBIE_LOOK = {
  beach:    { shirt: '#f28c28', pants: '#3a7bd5' },
  lifebuoy: { shirt: '#e8e8e8', pants: '#d33' },
  bucket:   { shirt: '#6aa84f', pants: '#7a5a3a' },
  surfer:   { shirt: null, pants: '#1fb5a8' },
  pirate:   { shirt: '#b22222', pants: '#2b2b2b' },
  snorkel:  { shirt: '#2a9d8f', pants: '#264653' },
  diver:    { shirt: '#333c48', pants: '#333c48' },
  shark:    { shirt: '#4b5d73', pants: '#2c3e50' },
  anchor:   { shirt: '#5a6b7c', pants: '#3b3226' },
  volley:   { shirt: '#ffd23f', pants: '#1e88e5' },
  tiki:     { shirt: null, pants: '#8d6e3f' },
  angler:   { shirt: '#22303c', pants: '#1a242d' }
};

function drawZombie(ctx, z, t, env) {
  if (z.type === 'kraken') return drawKraken(ctx, z, t);
  const look = ZOMBIE_LOOK[z.type];
  const charred = z.dying && z.deathType === 'burn';
  let skin = isWater(env) ? '#86b3a0' : '#9cbf72';
  if (z.slow > 0) skin = '#a9d6e8';
  if (z.flash > 0) skin = '#e9ffd9';
  let shirt = look.shirt, pants = look.pants;
  if (charred) { skin = '#2b2b2b'; shirt = shirt && '#1d1d1d'; pants = '#1a1a1a'; }
  const skinDark = shade(skin, -40);
  const ph = z.walk;
  const eat = z.eating ? Math.sin(t * 14) : 0;
  const riding = z.type === 'shark' && z.armor > 0;
  const hasArmor = z.armor > 0 && !charred;

  ctx.save();
  ctx.scale(z.scale, z.scale);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, 0, 0, riding ? 46 : 22, 6); ctx.fill();

  if (riding) {
    ctx.translate(0, -26);
    drawShark(ctx, t, z, charred);
  }
  const lean = z.smashT > 0 ? 0 : -0.06;
  ctx.rotate(lean);

  // back leg
  if (!riding) drawZLeg(ctx, -Math.sin(ph) * 9, pants, skinDark, z, false);
  // back arm
  const armY = z.eating ? -60 + eat * 6 : -62 + Math.sin(ph * 0.5) * 3;
  const wieldsAnchor = z.type === 'anchor' && !z.disarmed;
  if (!wieldsAnchor) drawZArm(ctx, -2, -66, -32, armY - 2, skin, shirt);
  // body
  const bodyCol = shirt || skin;
  ctx.fillStyle = bodyCol; ctx.strokeStyle = shade(bodyCol, -45); ctx.lineWidth = 1.5;
  rrect(ctx, -13, -76, 27, 42, 7); ctx.fill(); ctx.stroke();
  if (!charred) drawShirtDetail(ctx, z.type, look, skin);
  // front leg
  if (!riding) drawZLeg(ctx, Math.sin(ph) * 9, pants, skinDark, z, true);
  if (riding) { ctx.fillStyle = pants; rrect(ctx, -12, -40, 22, 12, 5); ctx.fill(); }
  // head
  const hx = -5, hy = -91 + (z.eating ? eat * 1.5 : 0);
  ctx.fillStyle = skin; ctx.strokeStyle = skinDark; ctx.lineWidth = 2;
  ell(ctx, hx, hy, 15, 16); ctx.fill(); ctx.stroke();
  // jaw
  const jaw = z.eating ? 3 + eat * 3 : 2;
  ctx.fillStyle = '#3a1a1a'; ell(ctx, hx - 8, hy + 8, 6, jaw + 2); ctx.fill();
  ctx.fillStyle = '#f2f2d8'; ctx.fillRect(hx - 11, hy + 6 - jaw * 0.4, 3, 3); ctx.fillRect(hx - 6, hy + 6 - jaw * 0.4, 3, 3);
  // eyes
  if (!charred) {
    ctx.fillStyle = '#fff'; ell(ctx, hx - 9, hy - 4, 5, 5.5); ctx.fill(); ell(ctx, hx + 1, hy - 5, 4, 4.5); ctx.fill();
    ctx.fillStyle = '#c22'; ell(ctx, hx - 10.5, hy - 3, 1.8, 1.8); ctx.fill(); ell(ctx, hx - 0.5, hy - 4, 1.5, 1.5); ctx.fill();
  }
  // hair strands
  ctx.strokeStyle = skinDark; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hx + 2, hy - 15); ctx.lineTo(hx + 5, hy - 22); ctx.moveTo(hx + 6, hy - 14); ctx.lineTo(hx + 11, hy - 19); ctx.stroke();

  drawHeadGear(ctx, z, hx, hy, hasArmor, t, charred);

  // front arm
  if (wieldsAnchor) drawAnchorArm(ctx, z, skin, shirt, t);
  else {
    drawZArm(ctx, 4, -64, -28, armY + 4 - (z.eating ? eat * 4 : 0), skin, shirt);
    if (z.type === 'pirate' && !charred) { ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-34, armY + 2, 5, Math.PI * 0.2, Math.PI * 1.4); ctx.stroke(); }
  }
  if (z.type === 'surfer' && hasArmor) drawSurfboard(ctx, z);
  if (z.type === 'volley' && !z.vaulted && !charred) {
    const bx = -36, by = armY + 1;
    ctx.fillStyle = '#fff'; ell(ctx, bx, by, 7.5, 7.5); ctx.fill();
    ctx.strokeStyle = '#1e88e5'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bx + 4, by - 4, 7, 1.6, 3.4); ctx.stroke();
    ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(bx - 5, by + 3, 7, -1.2, 0.6); ctx.stroke();
  }
  if (z.type === 'tiki' && !charred) {
    const bx = -36, by = armY + 1;
    if (z.fuseT > 0) { ctx.fillStyle = `rgba(255,60,30,${0.3 + 0.3 * Math.sin(t * 30)})`; ell(ctx, bx, by, 13, 13); ctx.fill(); }
    ctx.fillStyle = '#6b4423'; ell(ctx, bx, by, 8, 8); ctx.fill();
    ctx.fillStyle = '#3a2412'; ell(ctx, bx - 2, by - 2, 1.4, 1.4); ctx.fill(); ell(ctx, bx + 2, by - 2, 1.4, 1.4); ctx.fill(); ell(ctx, bx, by + 1, 1.4, 1.4); ctx.fill();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 2, by - 7); ctx.quadraticCurveTo(bx + 4, by - 13, bx + 1, by - 15); ctx.stroke();
    sparkle(ctx, bx + 1, by - 16, 3 + Math.abs(Math.sin(t * (z.fuseT > 0 ? 40 : 15))) * 3, '#ffcf3a');
  }
  if (z.type === 'lifebuoy' && hasArmor) {
    const dmg = z.armor / z.maxArmor;
    ctx.lineWidth = 8; ctx.setLineDash([9, 9]);
    ctx.strokeStyle = '#ffffff'; ell(ctx, 0, -48, 22, 9); ctx.stroke();
    ctx.lineDashOffset = 9; ctx.strokeStyle = dmg < 0.5 ? '#a33' : '#e33'; ell(ctx, 0, -48, 22, 9); ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }
  ctx.restore();
}

function drawZLeg(ctx, fx, pants, skinDark, z, front) {
  ctx.strokeStyle = pants; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(front ? 4 : -4, -38); ctx.lineTo(fx, -4); ctx.stroke();
  if (z.type === 'pirate' && front) { ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(fx, -16); ctx.lineTo(fx, 0); ctx.stroke(); return; }
  if (z.type === 'snorkel') { ctx.fillStyle = '#f4c430'; ell(ctx, fx - 9, -1, 13, 3.5); ctx.fill(); return; }
  ctx.fillStyle = z.type === 'diver' ? '#222' : '#5a3d2a'; ell(ctx, fx - 4, -2, 8, 4); ctx.fill();
}
function drawZArm(ctx, sx, sy, hx, hy, skin, shirt) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = shirt || skin; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo((sx + hx) / 2, (sy + hy) / 2); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo((sx + hx) / 2, (sy + hy) / 2); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.fillStyle = skin; ell(ctx, hx - 2, hy, 4.5, 4); ctx.fill();
}
function drawShirtDetail(ctx, type, look, skin) {
  if (type === 'beach') {
    ctx.fillStyle = '#fff6';
    for (const [x, y] of [[-6, -66], [5, -58], [-3, -48], [8, -70]]) drawStarfish(ctx, x, y, 3.5, '#ffe9a8');
  } else if (type === 'surfer') {
    ctx.strokeStyle = shade(skin, -35); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(-2, -64, 4, 0, Math.PI); ctx.arc(7, -64, 4, 0, Math.PI); ctx.stroke();
  } else if (type === 'pirate') {
    ctx.fillStyle = '#e8c45a'; for (let i = 0; i < 3; i++) { ell(ctx, 6, -68 + i * 10, 1.8, 1.8); ctx.fill(); }
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-13, -46, 27, 5);
  } else if (type === 'lifebuoy' || type === 'bucket') {
    ctx.strokeStyle = '#0003'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -76); ctx.lineTo(0, -36); ctx.stroke();
  } else if (type === 'diver' || type === 'snorkel' || type === 'shark') {
    ctx.fillStyle = '#ffffff22'; ctx.fillRect(-13, -62, 27, 4);
  } else if (type === 'volley') {
    ctx.fillStyle = '#1e88e5'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('7', 1, -50);
  } else if (type === 'tiki') {
    // flower lei and grass skirt
    const cols = ['#ff5fa2', '#ffd23f', '#ff8a3d', '#c86bff'];
    for (let i = 0; i < 7; i++) { ctx.fillStyle = cols[i % 4]; ell(ctx, -11 + i * 3.8, -72 + Math.sin(i / 6 * Math.PI) * 6, 2.6, 2.6); ctx.fill(); }
    ctx.strokeStyle = '#8bb04a'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-13 + i * 3.7, -40); ctx.lineTo(-14 + i * 3.9, -22); ctx.stroke(); }
  } else if (type === 'angler') {
    ctx.fillStyle = 'rgba(90,255,240,0.8)';
    for (const [x, y] of [[-6, -66], [5, -58], [-2, -48], [8, -70]]) { ell(ctx, x, y, 1.6, 1.6); ctx.fill(); }
  } else if (type === 'anchor') {
    ctx.strokeStyle = '#2a3440'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -70); ctx.lineTo(-2, -60); ctx.lineTo(-8, -50); ctx.stroke();
  }
}
function drawHeadGear(ctx, z, hx, hy, hasArmor, t, charred) {
  const dmg = z.maxArmor ? z.armor / z.maxArmor : 1;
  switch (z.type) {
    case 'beach':
      ctx.fillStyle = '#222'; rrect(ctx, hx - 14, hy - 14, 22, 5, 2); ctx.fill();
      break;
    case 'bucket':
      if (!hasArmor) break;
      ctx.fillStyle = dmg > 0.5 ? '#2f7fd8' : '#245ea0';
      ctx.beginPath(); ctx.moveTo(hx - 16, hy - 8); ctx.lineTo(hx + 14, hy - 8); ctx.lineTo(hx + 10, hy - 32); ctx.lineTo(hx - 12, hy - 32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(hx - 15, hy - 14, 29, 4);
      // sandcastle turrets on top
      ctx.fillStyle = '#e8c88a';
      ctx.fillRect(hx - 10, hy - 42, 18, 10);
      for (let i = 0; i < 3; i++) ctx.fillRect(hx - 10 + i * 7, hy - 47, 4, 5);
      if (dmg < 0.66) { ctx.strokeStyle = '#123'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx - 6, hy - 30); ctx.lineTo(hx - 2, hy - 22); ctx.lineTo(hx - 7, hy - 14); ctx.stroke(); }
      if (dmg < 0.33) { ctx.beginPath(); ctx.moveTo(hx + 6, hy - 30); ctx.lineTo(hx + 3, hy - 18); ctx.stroke(); }
      break;
    case 'pirate':
      if (!charred) { ctx.fillStyle = '#111'; ell(ctx, hx - 9, hy - 4, 5.5, 5); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx - 14, hy - 8); ctx.lineTo(hx + 12, hy - 2); ctx.stroke(); }
      if (!hasArmor) break;
      ctx.fillStyle = '#1b1b1b';
      ctx.beginPath(); ctx.moveTo(hx - 24, hy - 12); ctx.quadraticCurveTo(hx, hy - 42, hx + 22, hy - 12); ctx.quadraticCurveTo(hx, hy - 20, hx - 24, hy - 12); ctx.fill();
      ctx.fillStyle = '#fff'; ell(ctx, hx - 1, hy - 22, 3, 3); ctx.fill();
      ctx.strokeStyle = '#e8c45a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx - 24, hy - 12); ctx.quadraticCurveTo(hx, hy - 20, hx + 22, hy - 12); ctx.stroke();
      if (dmg < 0.5) { ctx.fillStyle = '#9cbf72'; ell(ctx, hx + 8, hy - 20, 3, 3); ctx.fill(); }
      break;
    case 'snorkel':
      if (charred) break;
      ctx.fillStyle = 'rgba(160,220,255,0.6)'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2.5;
      rrect(ctx, hx - 16, hy - 11, 22, 12, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#f4c430'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx + 6, hy + 4); ctx.lineTo(hx + 12, hy + 2); ctx.lineTo(hx + 12, hy - 26); ctx.stroke();
      break;
    case 'diver':
      if (!hasArmor) break;
      ctx.fillStyle = dmg > 0.5 ? '#c8913a' : '#9a6c28'; ctx.strokeStyle = '#6b4a18'; ctx.lineWidth = 2;
      ell(ctx, hx, hy, 22, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(150,210,230,0.55)'; ell(ctx, hx - 7, hy - 1, 10, 10); ctx.fill();
      ctx.strokeStyle = '#6b4a18'; ctx.lineWidth = 3; ell(ctx, hx - 7, hy - 1, 10, 10); ctx.stroke();
      ctx.fillStyle = '#e8c070'; for (const a of [0, 1.6, 3.2, 4.7]) { ell(ctx, hx + Math.cos(a) * 18, hy + Math.sin(a) * 18, 2, 2); ctx.fill(); }
      if (dmg < 0.5) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - 13, hy - 6); ctx.lineTo(hx - 5, hy + 2); ctx.lineTo(hx - 9, hy + 6); ctx.stroke(); }
      break;
    case 'shark':
      if (charred) break;
      ctx.fillStyle = 'rgba(160,220,255,0.6)'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
      rrect(ctx, hx - 16, hy - 11, 20, 11, 4); ctx.fill(); ctx.stroke();
      break;
    case 'anchor':
      ctx.fillStyle = '#2b2b2b'; rrect(ctx, hx - 15, hy - 18, 28, 8, 3); ctx.fill();
      break;
    case 'volley':
      ctx.fillStyle = '#e53935'; rrect(ctx, hx - 15, hy - 13, 30, 5, 2); ctx.fill();
      break;
    case 'tiki':
      if (charred) break;
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 0.4; ctx.fillStyle = '#ff5fa2'; ell(ctx, hx + 9 + Math.cos(a) * 4, hy - 12 + Math.sin(a) * 4, 3, 3); ctx.fill(); }
      ctx.fillStyle = '#ffd23f'; ell(ctx, hx + 9, hy - 12, 2, 2); ctx.fill();
      break;
    case 'angler': {
      // anglerfish hood with jagged teeth
      ctx.fillStyle = charred ? '#111' : '#2b3a4a';
      ctx.beginPath(); ctx.arc(hx + 1, hy - 3, 19, Math.PI * 0.95, Math.PI * 2.05);
      for (let i = 0; i <= 6; i++) ctx.lineTo(hx + 19 - i * 6.3, hy - 3 + (i % 2 ? 5 : 0));
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8e8d0';
      for (let i = 0; i < 6; i++) { const tx = hx - 16 + i * 6; ctx.beginPath(); ctx.moveTo(tx, hy - 3); ctx.lineTo(tx + 2, hy + 2); ctx.lineTo(tx + 4, hy - 3); ctx.fill(); }
      if (hasArmor) {
        const lx = hx - 28, ly = hy - 30 + Math.sin(t * 3) * 3;
        ctx.strokeStyle = '#2b3a4a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(hx + 4, hy - 20); ctx.quadraticCurveTo(hx - 10, hy - 48, lx, ly); ctx.stroke();
        const pulse = 0.7 + 0.3 * Math.sin(t * 5);
        const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 16 * pulse);
        g.addColorStop(0, 'rgba(255,255,200,1)'); g.addColorStop(0.35, 'rgba(255,240,120,0.8)'); g.addColorStop(1, 'rgba(255,240,120,0)');
        ctx.fillStyle = g; ell(ctx, lx, ly, 16 * pulse, 16 * pulse); ctx.fill();
      }
      break;
    }
  }
}
function drawSurfboard(ctx, z) {
  const dmg = z.armor / z.maxArmor;
  ctx.save(); ctx.translate(-30, -58); ctx.rotate(-0.12);
  ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#a07a00'; ctx.lineWidth = 2;
  ell(ctx, 0, 0, 7, 50); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ee4266'; ctx.fillRect(-1.5, -46, 3, 92);
  if (dmg < 0.5) {
    ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(0, -12); ctx.lineTo(-4, -4); ctx.lineTo(3, 6); ctx.stroke();
  }
  ctx.restore();
}
function drawShark(ctx, t, z, charred) {
  const tail = Math.sin(t * 8) * 0.3;
  const body = charred ? '#222' : (z.flash > 0 ? '#c8d4e0' : '#7d8fa3');
  ctx.fillStyle = body; ctx.strokeStyle = shade(body, -40); ctx.lineWidth = 2;
  // tail
  ctx.save(); ctx.translate(40, -4); ctx.rotate(tail);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -16); ctx.lineTo(13, 0); ctx.lineTo(18, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ell(ctx, -6, -4, 48, 15); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e6ecf0'; ell(ctx, -10, 4, 38, 6); ctx.fill();
  // fin
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(10, -16); ctx.lineTo(24, -36); ctx.lineTo(28, -14); ctx.closePath(); ctx.fill();
  // face
  ctx.fillStyle = '#fff'; ell(ctx, -38, -8, 3.5, 3.5); ctx.fill(); ctx.fillStyle = '#111'; ell(ctx, -39, -8, 1.6, 1.6); ctx.fill();
  ctx.fillStyle = '#5a1020'; ell(ctx, -44, 2, 8, 3.5); ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-50 + i * 4, -1); ctx.lineTo(-48 + i * 4, 3); ctx.lineTo(-46 + i * 4, -1); ctx.fill(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-28 + i * 4, -10); ctx.lineTo(-30 + i * 4, -2); ctx.stroke(); }
  // zombie sits on top
  ctx.translate(4, 16);
}
function drawAnchorArm(ctx, z, skin, shirt, t) {
  // anchor raised over shoulder, smashes down when attacking
  const sm = z.smashT > 0 ? z.smashT : 0; // 0..1
  const ang = z.smashT > 0 ? (-2.4 + Math.min(1, sm * 1.4) * 2.6) : -2.4 + Math.sin(t * 2) * 0.08;
  ctx.save(); ctx.translate(2, -66); ctx.rotate(ang);
  ctx.strokeStyle = skin; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(24, 0); ctx.stroke();
  // anchor
  ctx.translate(26, 0);
  ctx.strokeStyle = '#4a5560'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(40, 0); ctx.stroke();
  ctx.lineWidth = 3; ell(ctx, -18, 0, 5, 5); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
  ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(30, 0, 16, -Math.PI / 2 + 0.2, Math.PI / 2 - 0.2); ctx.stroke();
  ctx.fillStyle = '#4a5560';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(34, s * 16); ctx.lineTo(28, s * 22); ctx.lineTo(40, s * 18); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // other hand grips the shaft
  ctx.fillStyle = skin; ell(ctx, -6, -62, 5, 5); ctx.fill();
}

// The Kraken King boss: octopus-headed zombie with tentacle legs and a crown
function drawKraken(ctx, z, t) {
  const charred = z.dying && z.deathType === 'burn';
  let skin = '#8a5aa8';
  if (z.slow > 0) skin = '#9fb4e8';
  if (z.flash > 0) skin = '#efd8ff';
  if (charred) skin = '#2b2b2b';
  const dark = shade(skin, -45), light = shade(skin, 35);
  ctx.save();
  ctx.scale(z.scale, z.scale);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, 0, 0, 36, 7); ctx.fill();
  // tentacle legs
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const x0 = -18 + i * 7, sw = Math.sin(t * 3 + i * 1.3 + z.walk) * 8;
    ctx.strokeStyle = i % 2 ? dark : skin; ctx.lineWidth = 7 - (i % 2);
    ctx.beginPath(); ctx.moveTo(x0, -34); ctx.quadraticCurveTo(x0 + sw, -16, x0 - 8 + sw * 0.5, -3); ctx.quadraticCurveTo(x0 - 14, 2, x0 - 12 + sw * 0.3, -6); ctx.stroke();
  }
  // back tentacle arm (waves)
  ctx.save(); ctx.translate(6, -76); ctx.rotate(-0.6 + Math.sin(t * 2) * 0.3);
  drawTentacle(ctx, 46, 7, skin, light);
  ctx.restore();
  // royal robe body
  ctx.fillStyle = charred ? '#1a1a1a' : '#4a1d5e'; ctx.strokeStyle = '#2a0d36'; ctx.lineWidth = 2;
  rrect(ctx, -20, -90, 40, 60, 12); ctx.fill(); ctx.stroke();
  if (!charred) { ctx.fillStyle = '#e8c45a'; ctx.fillRect(-20, -40, 40, 4); ctx.fillRect(-2, -90, 4, 50); }
  // face
  const hx = -6, hy = -104;
  ctx.fillStyle = skin; ctx.strokeStyle = dark; ctx.lineWidth = 2;
  ell(ctx, hx, hy, 17, 16); ctx.fill(); ctx.stroke();
  // mantle (octopus head)
  ctx.fillStyle = skin; ell(ctx, hx + 6, hy - 26, 24, 28, 0.25); ctx.fill(); ctx.stroke();
  ctx.fillStyle = light;
  for (const [x, y, r] of [[0, -138, 4], [12, -128, 3], [8, -144, 2.5], [18, -140, 3]]) { ell(ctx, x, y, r, r); ctx.fill(); }
  // crown
  if (!charred) {
    ctx.fillStyle = '#ffd700'; ctx.strokeStyle = '#a07800'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-6, -150); ctx.lineTo(-8, -166); ctx.lineTo(0, -158); ctx.lineTo(6, -172); ctx.lineTo(11, -158); ctx.lineTo(19, -164); ctx.lineTo(16, -149); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e53935'; ell(ctx, 6, -157, 2.5, 2.5); ctx.fill();
  }
  // eyes (glowing yellow slit pupils)
  if (!charred) {
    for (const [ex, ey] of [[hx - 9, hy - 3], [hx + 3, hy - 4]]) {
      ctx.fillStyle = '#ffe14d'; ell(ctx, ex, ey, 5, 4.5); ctx.fill();
      ctx.fillStyle = '#111'; ell(ctx, ex - 0.5, ey, 1.2, 3.8); ctx.fill();
    }
  }
  // tentacle beard
  for (let i = 0; i < 5; i++) {
    const bx = hx - 14 + i * 6, sw = Math.sin(t * 4 + i) * 3;
    ctx.strokeStyle = i % 2 ? dark : skin; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(bx, hy + 8); ctx.quadraticCurveTo(bx + sw, hy + 20, bx - 3 + sw, hy + 30); ctx.stroke();
  }
  // smashing tentacle arm (same swing as the Anchor Brute)
  const ang = z.smashT > 0 ? (-2.4 + Math.min(1, z.smashT * 1.4) * 2.6) : -2.4 + Math.sin(t * 2) * 0.1;
  ctx.save(); ctx.translate(-4, -80); ctx.rotate(ang);
  drawTentacle(ctx, 78, 11, skin, light);
  ctx.restore();
  ctx.restore();
}
function drawTentacle(ctx, len, width, skin, light) {
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.moveTo(0, -width / 2);
  ctx.quadraticCurveTo(len * 0.6, -width * 0.6, len, -1);
  ctx.quadraticCurveTo(len + 6, 2, len - 4, 4);
  ctx.quadraticCurveTo(len * 0.6, width * 0.5, 0, width / 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = light;
  for (let i = 1; i < 6; i++) { const x = len * i / 6.5; ell(ctx, x, width * 0.25 * (1 - i / 7), 2.2 * (1 - i / 8), 2 * (1 - i / 8)); ctx.fill(); }
}

// ---------- Crab defenders (left column, like lawnmowers) ----------
function drawCrab(ctx, x, y, t, running) {
  ctx.save(); ctx.translate(x, y);
  const snap = Math.sin(t * (running ? 20 : 4)) * (running ? 0.4 : 0.15);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, 0, 2, 22, 5); ctx.fill();
  ctx.strokeStyle = '#b8321e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const k = running ? Math.sin(t * 30 + i) * 4 : 0;
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-18 - i * 3, -2 + i * 2 + k); ctx.lineTo(-20 - i * 3, 2 + k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(18 + i * 3, -2 + i * 2 - k); ctx.lineTo(20 + i * 3, 2 - k); ctx.stroke();
  }
  ctx.fillStyle = '#e8462b'; ell(ctx, 0, -10, 17, 11); ctx.fill();
  ctx.fillStyle = '#ff7a5c'; ell(ctx, -4, -14, 8, 4); ctx.fill();
  // claws
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 12, -18); ctx.rotate(s * -0.4);
    ctx.fillStyle = '#e8462b'; ell(ctx, s * 6, -8, 7, 6); ctx.fill();
    ctx.fillStyle = '#c53a22'; ctx.beginPath(); ctx.moveTo(s * 6, -8); ctx.lineTo(s * 14, -14 - snap * 10); ctx.lineTo(s * 12, -6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // eye stalks
  ctx.strokeStyle = '#e8462b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(-5, -27); ctx.moveTo(4, -18); ctx.lineTo(5, -27); ctx.stroke();
  ctx.fillStyle = '#fff'; ell(ctx, -5, -28, 3, 3); ctx.fill(); ell(ctx, 5, -28, 3, 3); ctx.fill();
  ctx.fillStyle = '#111'; ell(ctx, -4, -28, 1.4, 1.4); ctx.fill(); ell(ctx, 6, -28, 1.4, 1.4); ctx.fill();
  ctx.restore();
}

// ---------- Projectiles ----------
function drawProjectile(ctx, p, t) {
  if (p.kind === 'lob') {
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ell(ctx, p.sx, p.shadowY, 8, 3); ctx.fill();
    drawUrchin(ctx, p.x, p.y, 7, t * 3);
    return;
  }
  if (p.kind === 'frost') {
    const g = ctx.createRadialGradient(p.x - 3, p.y - 3, 1, p.x, p.y, 10);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#bff2ff'); g.addColorStop(1, '#4fc3f7');
    ctx.fillStyle = g; ell(ctx, p.x, p.y, 10, 10); ctx.fill();
    sparkle(ctx, p.x + Math.sin(t * 20) * 3, p.y - 5, 4, '#fff');
    ctx.fillStyle = 'rgba(190,240,255,0.4)'; ell(ctx, p.x - 12, p.y, 6, 4); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(160,220,255,0.35)'; ell(ctx, p.x, p.y, 10, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(40,130,200,0.9)'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ell(ctx, p.x - 3.5, p.y - 3.5, 3, 2.2, -0.6); ctx.fill();
  }
}
