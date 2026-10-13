// ===== Core game: state, update loop, input, UI =====

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

let G = null;
let progress = Math.max(1, Math.min(LEVELS.length, parseInt(localStorage.getItem('tvz_progress') || '1', 10) || 1));
let cleared = JSON.parse(localStorage.getItem('tvz_cleared') || '[]');
let speedMul = [1, 2, 3].includes(+localStorage.getItem('tvz_speed')) ? +localStorage.getItem('tvz_speed') : 1;
let lastTs = 0;

const rowFootY = r => GRID_Y + r * CELL_H + CELL_H - 16;
const colCenterX = c => GRID_X + c * CELL_W + CELL_W / 2;
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- Level setup ----------
function startLevel(n) {
  const L = LEVELS[n - 1];
  const schedule = buildSchedule(L, n);
  schedule.unshift(
    { t: 0.3, banner: `Level ${n}: ${L.title}`, quiet: true },
    { t: 2.6, banner: 'Ready...', quiet: true },
    { t: 3.6, banner: 'Set...', quiet: true },
    { t: 4.6, banner: 'DEFEND!', quiet: true }
  );
  const total = schedule.filter(e => e.type).length;
  // flag marker positions for the progress bar
  const flagMarks = [];
  let seen = 0;
  for (const e of schedule) {
    if (e.type) seen++;
    else if (!e.quiet) flagMarks.push(seen / total);
  }
  G = {
    n, L, env: L.env, time: 0, pearls: L.pearls,
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    zombies: [], projectiles: [], drops: [], particles: [],
    crabs: Array.from({ length: ROWS }, (_, r) => ({ row: r, x: 58, state: 'idle' })),
    schedule, total, spawned: 0, flagMarks, zid: 0, lastRow: -1,
    skyT: 5, cool: {}, selected: null, shovel: false, hover: null,
    banner: null, shake: 0, running: true, paused: false, over: false, winT: 0,
    available: turtlesForLevel(n), announced: false, lobs: [], picking: false
  };
  showScreen('gameScreen');
  hideOverlay();
  updatePauseBtn();
  if (G.available.length > MAX_SLOTS) showPicker();
  else buildCards();
}

// When more turtles are unlocked than card slots, let the player choose a loadout.
function showPicker() {
  G.running = false; G.picking = true;
  const all = G.available;
  const saved = JSON.parse(localStorage.getItem('tvz_loadout') || '[]').filter(t => all.includes(t));
  // newly unlocked turtle goes in by default
  const newest = G.n > 1 ? LEVELS[G.n - 2].reward : null;
  if (newest && all.includes(newest) && !saved.includes(newest) && !localStorage.getItem('tvz_seen_' + newest)) {
    if (saved.length >= MAX_SLOTS) saved.pop();
    saved.push(newest);
  }
  for (const t of all) if (saved.length < MAX_SLOTS && !saved.includes(t)) saved.push(t);
  const chosen = new Set(saved);
  const L = G.L;
  const threats = Object.keys(L.pool).concat(L.bosses.some(x => x) ? ['anchor'] : []).concat(L.finalBoss ? [L.finalBoss] : []);
  showOverlay(`<h2>Choose your turtles</h2>
    <p class="pick-info">Pick up to ${MAX_SLOTS}. Zombies in this level: <b>${threats.map(z => ZOMBIES[z].name).join(', ')}</b></p>
    <div class="pick-grid"></div><p class="pick-count"></p>`, [
    { label: 'Start ▶', primary: true, fn: () => {
      if (!chosen.size) return;
      G.available = TURTLE_ORDER.filter(t => chosen.has(t));
      localStorage.setItem('tvz_loadout', JSON.stringify(G.available));
      for (const t of G.available) localStorage.setItem('tvz_seen_' + t, '1');
      G.picking = false; G.running = true;
      buildCards(); hideOverlay();
    } },
    { label: 'Level select', fn: goMenu }
  ]);
  const grid = document.querySelector('#overlay .pick-grid');
  const refresh = () => {
    for (const el of grid.children) el.classList.toggle('chosen', chosen.has(el.dataset.type));
    document.querySelector('#overlay .pick-count').textContent = `${chosen.size} / ${MAX_SLOTS} chosen`;
  };
  for (const type of all) {
    const def = TURTLES[type];
    const el = document.createElement('div');
    el.className = 'card pick'; el.dataset.type = type; el.title = `${def.name} — ${def.desc}`;
    el.innerHTML = `<canvas width="70" height="56"></canvas><div class="cost">${def.cost}</div><div class="pick-name">${def.name}</div>`;
    drawIcon(el.querySelector('canvas'), type);
    el.onclick = () => {
      Sfx.click();
      if (chosen.has(type)) chosen.delete(type);
      else if (chosen.size < MAX_SLOTS) chosen.add(type);
      refresh();
    };
    grid.appendChild(el);
  }
  refresh();
}

// ---------- Entities ----------
function spawnZombie(type, forceRow, forceX) {
  const def = ZOMBIES[type];
  let row = forceRow;
  if (row == null) {
    do { row = Math.floor(Math.random() * ROWS); } while (row === G.lastRow && Math.random() < 0.75);
    G.lastRow = row;
  }
  const m = G.L.hpMul;
  G.zombies.push({
    id: ++G.zid, type, row, x: forceX != null ? forceX : W + 10 + Math.random() * 25,
    hp: def.hp * m, maxHp: def.hp * m, armor: def.armor * m, maxArmor: def.armor * m,
    speed: def.speed * rand(0.9, 1.1), dps: def.dps, scale: def.scale || 1,
    slow: 0, flash: 0, walk: Math.random() * 6, eating: null, dying: 0, deathType: null,
    smashT: 0, bubbleT: rand(1, 3), groanT: rand(3, 12),
    jumpT: 0, vaulted: false, fuseT: 0, lureT: rand(3, 5), summonT: 9, disarmed: false
  });
  if (forceRow != null) return;
  G.spawned++;
  if (!G.announced) { G.announced = true; setBanner('The zombies are coming!'); Sfx.groan(); }
}

function placeTurtle(type, row, col) {
  const def = TURTLES[type];
  const p = { type, row, col, x: colCenterX(col), y: rowFootY(row), hp: def.hp, maxHp: def.hp, timer: 0, shoot: 0, seed: Math.random() * 10, hurt: 0 };
  if (def.kind === 'producer') { p.timer = def.first; p.ready = 0; }
  if (def.kind === 'shooter') p.timer = 0.4;
  if (def.kind === 'mine') { p.armT = def.armTime; p.armed = false; }
  if (def.kind === 'chomper') p.chew = 0;
  if (def.kind === 'bomb') p.fuse = def.fuse;
  if (def.kind === 'lobber') p.timer = 0.8;
  if (def.kind === 'magnet') { p.charge = 0; p.held = null; }
  p.sleep = 0;
  G.grid[row][col] = p;
  G.pearls -= def.cost;
  G.cool[type] = def.cooldown;
  Sfx.plant();
  for (let i = 0; i < 8; i++) addParticle({ x: p.x + rand(-20, 20), y: p.y - 4, vx: rand(-40, 40), vy: rand(-80, -30), g: 200, life: 0.5, color: groundColor(G.env), size: 3 });
}

function removeTurtle(p, silent) {
  if (G.grid[p.row][p.col] === p) G.grid[p.row][p.col] = null;
  if (!silent) for (let i = 0; i < 6; i++) addParticle({ x: p.x + rand(-15, 15), y: p.y - 20, vx: rand(-60, 60), vy: rand(-120, -40), g: 300, life: 0.6, color: TURTLE_LOOK[p.type] ? TURTLE_LOOK[p.type].shell : '#9a8a5a', size: 4 });
}

function spawnPearl(x, y, kind) {
  const d = { x, y, kind, value: 25, life: 9, state: 'move', t: 0 };
  if (kind === 'turtle') { d.vx = rand(-45, 45); d.vy = -170; d.ty = y + 30; }
  else if (isWater(G.env)) { d.y = H + 20; d.vy = -50; d.ty = GRID_Y + 30 + Math.random() * (ROWS * CELL_H - 70); }
  else { d.y = -20; d.vy = 50; d.ty = GRID_Y + 30 + Math.random() * (ROWS * CELL_H - 70); }
  G.drops.push(d);
}

function addParticle(p) { p.max = p.life; G.particles.push(p); }
function setBanner(text) { G.banner = { text, t: 0, dur: 2.6 }; }

function damageZombie(z, dmg, source) {
  if (z.dying) return;
  z.flash = 0.1;
  const overShield = source === 'lob' && (z.type === 'surfer' || z.type === 'shark');
  if (z.armor > 0 && !overShield) {
    const a = Math.min(z.armor, dmg);
    z.armor -= a; dmg -= a;
    if (z.armor <= 0) breakArmor(z);
  }
  z.hp -= dmg;
  if (z.hp <= 0) killZombie(z, source === 'blast' ? 'burn' : 'fall');
}
function breakArmor(z) {
  z.armor = 0;
  const def = ZOMBIES[z.type];
  if (def.slowSpeed) z.speed = def.slowSpeed * rand(0.9, 1.1);
  Sfx.armor();
  const colors = { lifebuoy: '#e33', bucket: '#2f7fd8', surfer: '#ffd23f', pirate: '#1b1b1b', diver: '#c8913a', shark: '#7d8fa3', angler: '#fff38a' };
  const y = rowFootY(z.row) - 90 * z.scale;
  for (let i = 0; i < 6; i++) addParticle({ x: z.x, y, vx: rand(20, 120), vy: rand(-180, -60), g: 500, life: 0.9, color: colors[z.type] || '#888', size: 6, kind: 'debris', rot: rand(0, 6) });
  if (z.type === 'shark') addParticle({ x: z.x, y: y + 40, vx: 0, vy: -20, g: 0, life: 1.2, text: 'Shark down!', kind: 'text', color: '#fff' });
}
function killZombie(z, type) {
  z.dying = 0.001; z.deathType = type; z.eating = null; z.smashT = 0;
}

// ---------- Update ----------
function update(dt) {
  G.time += dt;
  const t = G.time;

  // spawn schedule
  while (G.schedule.length && G.schedule[0].t <= t) {
    const e = G.schedule.shift();
    if (e.banner) { setBanner(e.banner); if (!e.quiet) Sfx.wave(); }
    if (e.type) spawnZombie(e.type);
  }

  // falling / rising pearls from the environment
  G.skyT -= dt;
  if (G.skyT <= 0) {
    spawnPearl(GRID_X + 30 + Math.random() * (CELL_W * COLS - 60), 0, 'sky');
    G.skyT = G.L.sky * rand(0.85, 1.2);
  }

  // card cooldowns
  for (const k in G.cool) G.cool[k] = Math.max(0, G.cool[k] - dt);

  // turtles
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const p = G.grid[r][c];
    if (p) updateTurtle(p, dt);
  }

  // projectiles
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i];
    if (pr.delay > 0) { pr.delay -= dt; continue; }
    pr.x += 340 * dt;
    let hit = null;
    for (const z of G.zombies) {
      if (z.row !== pr.row || z.dying || z.x > W + 5) continue;
      const left = (z.type === 'shark' && z.armor > 0 ? 52 : 16) * z.scale;
      if (pr.x + 8 >= z.x - left && pr.x <= z.x + 22 * z.scale) {
        if (!hit || z.x < hit.x) hit = z;
      }
    }
    if (hit) {
      damageZombie(hit, pr.dmg, 'shot');
      if (pr.kind === 'frost') hit.slow = TURTLES.loggerhead.slowTime;
      Sfx.hit();
      for (let k = 0; k < 5; k++) addParticle({ x: pr.x, y: pr.y, vx: rand(-80, 20), vy: rand(-60, 60), g: 0, life: 0.3, color: pr.kind === 'frost' ? '#d8f6ff' : '#a8dcff', size: 3 });
      G.projectiles.splice(i, 1);
    } else if (pr.x > W + 20) G.projectiles.splice(i, 1);
  }

  // lobbed urchins
  for (let i = G.lobs.length - 1; i >= 0; i--) {
    const l = G.lobs[i];
    l.t += dt;
    if (l.target && !l.target.dying && G.zombies.includes(l.target)) l.tx = l.target.x - 8;
    const u = Math.min(1, l.t / l.dur);
    l.sx = l.x0 + (l.tx - l.x0) * u;
    l.x = l.sx; l.y = l.y0 + (l.ty - l.y0) * u - Math.sin(u * Math.PI) * 120;
    if (u >= 1) {
      const def = TURTLES.flatback;
      if (l.target && !l.target.dying && Math.abs(l.target.x - l.tx) < 40) damageZombie(l.target, def.damage, 'lob');
      for (const z of G.zombies) if (z !== l.target && z.row === l.row && !z.dying && Math.abs(z.x - l.tx) < 60) damageZombie(z, def.splash, 'lob');
      Sfx.hit();
      for (let k = 0; k < 8; k++) addParticle({ x: l.tx, y: l.ty, vx: rand(-90, 90), vy: rand(-120, -20), g: 300, life: 0.4, color: '#6a2c82', size: 3 });
      G.lobs.splice(i, 1);
    }
  }

  // zombies
  for (const z of G.zombies) updateZombie(z, dt);
  G.zombies = G.zombies.filter(z => !(z.dying >= 1 || z.remove));
  if (G.over) return;

  // crabs
  for (const crab of G.crabs) {
    if (crab.state !== 'run') continue;
    crab.x += 380 * dt;
    for (const z of G.zombies) {
      if (z.row === crab.row && !z.dying && Math.abs(z.x - crab.x) < 34) {
        killZombie(z, 'fall');
        addParticle({ x: z.x, y: rowFootY(z.row) - 60, vx: 0, vy: -30, g: 0, life: 0.8, text: 'SNIP!', kind: 'text', color: '#ffeb99' });
      }
    }
    if (crab.x > W + 40) crab.state = 'gone';
  }

  // pearls
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i];
    d.t += dt;
    if (d.state === 'move') {
      if (d.kind === 'turtle') {
        d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 450 * dt;
        if (d.vy > 0 && d.y >= d.ty) { d.y = d.ty; d.state = 'rest'; }
      } else {
        d.y += d.vy * dt;
        d.x += Math.sin(d.t * 2) * 12 * dt;
        if ((d.vy > 0 && d.y >= d.ty) || (d.vy < 0 && d.y <= d.ty)) { d.y = d.ty; d.state = 'rest'; }
      }
    } else if (d.state === 'rest') {
      d.life -= dt;
      if (d.life <= 0) G.drops.splice(i, 1);
    } else if (d.state === 'collect') {
      const k = Math.min(1, dt * 7);
      d.x += (18 - d.x) * k; d.y += (-10 - d.y) * k;
      if (Math.abs(d.x - 18) < 8 && d.y < 4) G.drops.splice(i, 1);
    }
  }

  // particles
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) { G.particles.splice(i, 1); continue; }
    p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; p.vy = (p.vy || 0) + (p.g || 0) * dt;
    if (p.rot != null) p.rot += dt * 8;
  }

  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  G.shake = Math.max(0, G.shake - dt);

  // win check
  if (!G.schedule.length && !G.zombies.length) {
    G.winT += dt;
    if (G.winT > 1.2) winLevel();
  }
}

function zombiesAhead(p, maxDist) {
  for (const z of G.zombies) {
    if (z.row === p.row && !z.dying && z.x > p.x - 10 && z.x < W - 5 && (maxDist == null || z.x - p.x <= maxDist)) return true;
  }
  return false;
}

function updateTurtle(p, dt) {
  const def = TURTLES[p.type];
  p.hurt = Math.max(0, p.hurt - dt);
  if (p.sleep > 0) { p.sleep -= dt; return; }
  switch (def.kind) {
    case 'producer':
      p.timer -= dt;
      p.ready = Math.max(0, Math.min(1, 1 - p.timer / def.rate));
      if (p.timer <= 0) {
        for (let i = 0; i < (def.count || 1); i++) spawnPearl(p.x + i * 10, p.y - 45, 'turtle');
        p.timer = def.rate * rand(0.9, 1.1);
      }
      break;
    case 'shooter':
      p.shoot = Math.max(0, p.shoot - dt * 4);
      p.timer = Math.max(0, p.timer - dt);
      if (p.timer <= 0 && zombiesAhead(p)) {
        for (let s = 0; s < def.shots; s++) {
          G.projectiles.push({ x: p.x + 36, y: p.y - 26, row: p.row, dmg: def.damage, kind: def.projectile, delay: s * 0.18 });
        }
        p.shoot = 1; p.timer = def.fireRate;
        Sfx.shoot();
      }
      break;
    case 'mine':
      if (!p.armed) {
        p.armT -= dt;
        if (p.armT <= 0) {
          p.armed = true; Sfx.plant();
          for (let i = 0; i < 10; i++) addParticle({ x: p.x + rand(-25, 25), y: p.y - 6, vx: rand(-60, 60), vy: rand(-140, -60), g: 400, life: 0.6, color: '#e2c184', size: 3 });
        }
      } else {
        const trig = G.zombies.some(z => z.row === p.row && !z.dying && !(z.jumpT > 0) && z.x - 20 * z.scale < p.x + CELL_W * 0.45 && z.x > p.x - CELL_W * 0.5);
        if (trig) {
          for (const z of G.zombies) if (z.row === p.row && Math.abs(z.x - p.x) < CELL_W * 0.75) damageZombie(z, def.damage, 'blast');
          explosionFx(p.x, p.y - 20, 0.8, '#e2c184');
          addParticle({ x: p.x, y: p.y - 60, vx: 0, vy: -30, g: 0, life: 1, text: 'SAND-BOOM!', kind: 'text', color: '#fff3c4' });
          removeTurtle(p, true);
        }
      }
      break;
    case 'chomper':
      if (p.chew > 0) { p.chew -= dt; break; }
      {
        let target = null;
        for (const z of G.zombies) {
          if (z.row !== p.row || z.dying || ZOMBIES[z.type].boss) continue;
          const front = z.x - (z.type === 'shark' && z.armor > 0 ? 50 : 20) * z.scale;
          if (front >= p.x - 10 && front <= p.x + CELL_W * def.range) { if (!target || z.x < target.x) target = z; }
        }
        if (target) {
          target.remove = true;
          p.chew = def.chewTime;
          Sfx.chomp();
          for (let i = 0; i < 8; i++) addParticle({ x: target.x, y: p.y - 40, vx: rand(-80, 80), vy: rand(-120, -20), g: 300, life: 0.5, color: '#9cbf72', size: 4 });
          addParticle({ x: p.x + 20, y: p.y - 70, vx: 0, vy: -25, g: 0, life: 1, text: 'CHOMP!', kind: 'text', color: '#fff' });
        }
      }
      break;
    case 'spikes':
      p.shoot = Math.max(0, p.shoot - dt * 3);
      p.timer -= dt;
      if (p.timer <= 0) {
        p.timer = def.tick;
        for (const z of G.zombies) {
          if (z.row === p.row && !z.dying && !(z.jumpT > 0) && Math.abs(z.x - p.x) < CELL_W * 0.5) { damageZombie(z, def.damage, 'spike'); p.shoot = 1; }
        }
      }
      break;
    case 'lobber': {
      p.shoot = Math.max(0, p.shoot - dt * 2);
      p.timer = Math.max(0, p.timer - dt);
      if (p.timer > 0) break;
      let target = null;
      for (const z of G.zombies) if (z.row === p.row && !z.dying && z.x > p.x - 10 && z.x < W - 5 && (!target || z.x < target.x)) target = z;
      if (target) {
        G.lobs.push({ x0: p.x, y0: p.y - 40, x: p.x, y: p.y - 40, sx: p.x, tx: target.x - 8, ty: rowFootY(p.row) - 45, shadowY: rowFootY(p.row) - 4, t: 0, dur: 0.9, row: p.row, target, kind: 'lob' });
        p.timer = def.fireRate; p.shoot = 1;
        Sfx.shoot();
      }
      break;
    }
    case 'magnet': {
      if (p.charge > 0) { p.charge -= dt; if (p.charge <= 0) p.held = null; break; }
      let best = null, bestD = Infinity;
      for (const z of G.zombies) {
        if (z.dying || z.x > W - 5) continue;
        const metal = (METAL_ARMOR.includes(z.type) && z.armor > 0) || (z.type === 'anchor' && !z.disarmed);
        if (!metal) continue;
        const d = Math.hypot((z.x - p.x) / CELL_W, z.row - p.row);
        if (d <= def.range && d < bestD) { best = z; bestD = d; }
      }
      if (best) {
        if (best.type === 'anchor') { best.disarmed = true; best.smashT = 0; best.dps = 120; p.held = 'anchor'; }
        else { best.armor = 0; p.held = best.type; }
        p.charge = def.recharge;
        Sfx.armor();
        addParticle({ x: best.x, y: rowFootY(best.row) - 110 * best.scale, vx: 0, vy: -25, g: 0, life: 1, text: 'CLANG!', kind: 'text', color: '#cfe3ff' });
        for (let k = 0; k < 8; k++) {
          const u = k / 8;
          addParticle({ x: best.x + (p.x - best.x) * u, y: rowFootY(best.row) - 80 + (p.y - 40 - rowFootY(best.row) + 80) * u, vx: 0, vy: 0, g: 0, life: 0.5, color: k % 2 ? '#ff6b6b' : '#6bb5ff', size: 3 });
        }
      }
      break;
    }
    case 'bomb':
      p.fuse -= dt;
      if (p.fuse <= 0) {
        for (const z of G.zombies) if (Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - p.x) < CELL_W * 1.55) damageZombie(z, def.damage, 'blast');
        explosionFx(p.x, p.y - 25, 1.6, '#ffb347');
        for (let i = 0; i < 18; i++) {
          const a = Math.random() * Math.PI * 2, s = rand(120, 300);
          addParticle({ x: p.x, y: p.y - 20, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, g: 0, life: 0.9, kind: 'baby', size: rand(5, 8) });
        }
        addParticle({ x: p.x, y: p.y - 80, vx: 0, vy: -30, g: 0, life: 1.2, text: 'ARRIBADA!', kind: 'text', color: '#fff3c4' });
        removeTurtle(p, true);
      }
      break;
  }
}

function tikiExplode(z) {
  const y = rowFootY(z.row);
  for (let r = z.row - 1; r <= z.row + 1; r++) {
    if (r < 0 || r >= ROWS) continue;
    for (const p of G.grid[r]) if (p && Math.abs(p.x - z.x) < CELL_W * 1.4) removeTurtle(p);
  }
  explosionFx(z.x - 20, y - 40, 1.3, '#8d6e3f');
  addParticle({ x: z.x, y: y - 110, vx: 0, vy: -30, g: 0, life: 1.1, text: 'KA-BOOM!', kind: 'text', color: '#ffb347' });
  killZombie(z, 'burn');
}

function explosionFx(x, y, size, color) {
  Sfx.boom();
  G.shake = 0.35 * size;
  addParticle({ x, y, vx: 0, vy: 0, g: 0, life: 0.5, kind: 'ring', size: 70 * size, color: '#fff7d6' });
  addParticle({ x, y, vx: 0, vy: 0, g: 0, life: 0.35, kind: 'flash', size: 55 * size, color: '#ffd27a' });
  for (let i = 0; i < 26 * size; i++) {
    const a = Math.random() * Math.PI * 2, s = rand(60, 260) * size;
    addParticle({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, g: 380, life: rand(0.5, 0.9), color: Math.random() < 0.5 ? color : '#ff7b3a', size: rand(3, 6) });
  }
}

function updateZombie(z, dt) {
  if (z.dying) { z.dying += dt * (z.deathType === 'burn' ? 0.9 : 1.3); return; }
  z.flash -= dt; z.slow -= dt;
  const def = ZOMBIES[z.type];
  const slowF = z.slow > 0 ? 0.5 : 1;

  if (isWater(G.env)) {
    z.bubbleT -= dt;
    if (z.bubbleT <= 0) {
      z.bubbleT = rand(1.5, 3.5);
      addParticle({ x: z.x - 12 * z.scale, y: rowFootY(z.row) - 92 * z.scale, vx: rand(-5, 5), vy: -40, g: 0, life: 1.5, kind: 'bubble', size: rand(2.5, 4.5) });
    }
  }
  z.groanT -= dt;
  if (z.groanT <= 0) { z.groanT = rand(8, 20); if (Math.random() < 0.4) Sfx.groan(); }

  // Kraken King summons snorkel minions in neighbouring lanes
  if (def.summon && z.x < GRID_RIGHT) {
    z.summonT -= dt;
    if (z.summonT <= 0) {
      z.summonT = 12;
      for (const r of [z.row - 1, z.row + 1]) {
        if (r < 0 || r >= ROWS) continue;
        spawnZombie('snorkel', r, z.x + rand(-10, 20));
        for (let k = 0; k < 10; k++) addParticle({ x: z.x, y: rowFootY(r) - 40, vx: rand(-60, 60), vy: rand(-60, 20), g: 0, life: 0.9, color: '#2a1838', size: rand(5, 9) });
      }
      addParticle({ x: z.x, y: rowFootY(z.row) - 200, vx: 0, vy: -20, g: 0, life: 1.2, text: 'RISE, MINIONS!', kind: 'text', color: '#e6b3ff' });
      Sfx.groan();
    }
  }
  // Anglerfish lure lulls the nearest turtle ahead to sleep
  if (z.type === 'angler' && z.armor > 0 && z.x < GRID_RIGHT + 10) {
    z.lureT -= dt;
    if (z.lureT <= 0) {
      z.lureT = 7;
      let best = null;
      for (const p of G.grid[z.row]) {
        if (!p || p.x > z.x || z.x - p.x > CELL_W * 3 || p.sleep > 0) continue;
        const k = TURTLES[p.type].kind;
        if (k === 'mine' || k === 'bomb') continue;
        if (!best || p.x > best.x) best = p;
      }
      if (best) {
        best.sleep = 5;
        Sfx.tone(300, 0.5, 'sine', 0.08, 150);
        for (let k = 0; k < 3; k++) addParticle({ x: best.x, y: best.y - 30, vx: 0, vy: 0, g: 0, life: 0.6 + k * 0.2, kind: 'ring', size: 40, color: '#fff38a' });
      }
    }
  }
  // Volleyball Vaulter mid-jump
  if (z.jumpT > 0) {
    z.jumpT += dt / 0.8;
    const u = Math.min(1, z.jumpT);
    z.x = z.jumpFrom + (z.jumpTo - z.jumpFrom) * u;
    if (u >= 1) { z.jumpT = 0; z.vaulted = true; z.speed = ZOMBIES.volley.slowSpeed * rand(0.9, 1.1); }
    return;
  }

  // Anchor Brute smash in progress
  if (z.smashT > 0) {
    z.smashT += dt * slowF / 1.1;
    if (z.smashT >= 1) {
      const p = G.grid[z.row][z.smashCol];
      if (p) {
        removeTurtle(p);
        G.shake = 0.25;
        Sfx.boom();
        for (let i = 0; i < 10; i++) addParticle({ x: p.x + rand(-30, 30), y: p.y, vx: rand(-80, 80), vy: rand(-160, -40), g: 400, life: 0.6, color: groundColor(G.env), size: 4 });
      }
      z.smashT = 0;
    }
    return;
  }

  const frontOff = (z.type === 'shark' && z.armor > 0 ? 50 : 22) * z.scale;
  const front = z.x - frontOff;
  const col = Math.floor((front - GRID_X) / CELL_W);
  let target = col >= 0 && col < COLS && front < GRID_RIGHT ? G.grid[z.row][col] : null;
  const smasher = def.smash && !z.disarmed;
  // star tortoise spikes can only be crushed, not eaten
  if (target && TURTLES[target.type].kind === 'spikes' && !smasher) target = null;
  if (target && !(TURTLES[target.type].kind === 'mine' && target.armed)) {
    if (smasher) { z.smashT = 0.001; z.smashCol = col; z.eating = null; return; }
    if (z.type === 'volley' && !z.vaulted) {
      if (target.type === 'galapagos') {
        z.vaulted = true; z.speed = ZOMBIES.volley.slowSpeed;
        addParticle({ x: z.x, y: rowFootY(z.row) - 110, vx: 0, vy: -25, g: 0, life: 0.9, text: 'BONK!', kind: 'text', color: '#fff' });
      } else {
        z.jumpT = 0.001; z.jumpFrom = z.x; z.jumpTo = GRID_X + col * CELL_W + 8; z.eating = null;
        return;
      }
    }
    if (z.type === 'tiki') {
      z.fuseT += dt;
      if (z.fuseT >= 1.6) { tikiExplode(z); return; }
    }
    z.eating = target;
    target.hp -= z.dps * slowF * dt;
    target.hurt = 0.15;
    if (target.hp <= 0) { removeTurtle(target); Sfx.chomp(); z.eating = null; }
  } else {
    z.eating = null;
    z.x -= z.speed * slowF * dt;
    z.walk += dt * z.speed * 0.17 * slowF;
  }

  if (z.x < GRID_X + 4) {
    const crab = G.crabs[z.row];
    if (crab.state === 'idle') { crab.state = 'run'; Sfx.crab(); }
  }
  if (z.x < 22) loseLevel();
}

// ---------- Rendering ----------
function render() {
  const t = G.time;
  ctx.save();
  if (G.shake > 0) ctx.translate(rand(-6, 6) * G.shake * 2, rand(-6, 6) * G.shake * 2);
  ctx.drawImage(getBackground(G.env), 0, 0);
  drawBackgroundAnimated(ctx, G.env, t);

  // hover highlight
  if (G.hover && (G.selected || G.shovel)) {
    const { row, col } = G.hover;
    const occupied = !!G.grid[row][col];
    const ok = G.selected ? !occupied : occupied;
    ctx.fillStyle = ok ? 'rgba(255,255,255,0.18)' : 'rgba(255,60,60,0.15)';
    ctx.fillRect(GRID_X, GRID_Y + row * CELL_H, CELL_W * COLS, CELL_H);
    ctx.fillRect(GRID_X + col * CELL_W, GRID_Y, CELL_W, ROWS * CELL_H);
    ctx.strokeStyle = ok ? 'rgba(255,255,255,0.8)' : 'rgba(255,80,80,0.8)'; ctx.lineWidth = 2;
    ctx.strokeRect(GRID_X + col * CELL_W + 2, GRID_Y + row * CELL_H + 2, CELL_W - 4, CELL_H - 4);
  }

  for (let r = 0; r < ROWS; r++) {
    const crab = G.crabs[r];
    if (crab.state !== 'gone') drawCrab(ctx, crab.x, rowFootY(r) - 4, t, crab.state === 'run');
    for (let c = 0; c < COLS; c++) {
      const p = G.grid[r][c];
      if (!p) continue;
      const def = TURTLES[p.type];
      ctx.save();
      ctx.translate(p.x + (p.hurt > 0 ? Math.sin(t * 50) * 1.2 : 0), p.y);
      drawTurtle(ctx, p.type, {
        seed: p.seed, shoot: p.shoot, ready: p.ready, hpRatio: p.hp / p.maxHp, env: G.env,
        armed: p.armed, armProgress: def.kind === 'mine' ? 1 - p.armT / def.armTime : null,
        chewing: p.chew > 0, fuse: p.fuse, held: p.held
      }, t);
      ctx.restore();
      if (p.sleep > 0) {
        ctx.font = 'bold 18px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#e6dcff'; ctx.strokeStyle = 'rgba(40,20,80,0.8)'; ctx.lineWidth = 3;
        const zy = p.y - 62 - (t * 10 % 10);
        ctx.strokeText('Zz', p.x + 14, zy); ctx.fillText('Zz', p.x + 14, zy);
      }
      if (p.hp < p.maxHp && def.kind !== 'bomb') {
        const w = 44, ratio = Math.max(0, p.hp / p.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; rrect(ctx, p.x - w / 2, p.y + 4, w, 5, 2.5); ctx.fill();
        ctx.fillStyle = ratio > 0.5 ? '#6ad36a' : ratio > 0.25 ? '#f0c040' : '#e5533d';
        rrect(ctx, p.x - w / 2, p.y + 4, w * ratio, 5, 2.5); ctx.fill();
      }
    }
    // ghost preview
    if (G.selected && G.hover && G.hover.row === r && !G.grid[r][G.hover.col]) {
      ctx.save(); ctx.globalAlpha = 0.45;
      ctx.translate(colCenterX(G.hover.col), rowFootY(r));
      drawTurtle(ctx, G.selected, { armed: true, env: G.env }, t);
      ctx.restore();
    }
    const rowZ = G.zombies.filter(z => z.row === r).sort((a, b) => b.x - a.x);
    for (const z of rowZ) {
      ctx.save();
      ctx.translate(z.x, rowFootY(r) - (z.jumpT > 0 ? Math.sin(Math.min(1, z.jumpT) * Math.PI) * 75 : 0));
      if (z.dying) {
        if (z.deathType === 'burn') ctx.globalAlpha = Math.max(0, 1 - z.dying);
        else { ctx.rotate(Math.min(1, z.dying * 1.6) * 1.45); ctx.globalAlpha = Math.max(0, 1 - z.dying * z.dying); }
      }
      drawZombie(ctx, z, t, G.env);
      ctx.restore();
    }
  }

  for (const pr of G.projectiles) if (!(pr.delay > 0)) drawProjectile(ctx, pr, t);
  for (const l of G.lobs) drawProjectile(ctx, l, t);
  drawParticles(t);

  // pearls on top
  for (const d of G.drops) {
    const fade = d.state === 'rest' && d.life < 2 ? (Math.sin(d.t * 20) > 0 ? 0.4 : 1) : 1;
    ctx.globalAlpha = fade;
    const bob = d.state === 'rest' ? Math.sin(d.t * 3) * 2 : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ell(ctx, d.x, d.y + bob, 22, 22); ctx.fill();
    drawPearlShape(ctx, d.x, d.y + bob, 14, t);
    sparkle(ctx, d.x + 9, d.y - 9 + bob, 4 + Math.sin(d.t * 6) * 2, '#fff');
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  drawHud(t);
}

function drawParticles(t) {
  for (const p of G.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    switch (p.kind) {
      case 'ring':
        ctx.strokeStyle = p.color; ctx.lineWidth = 6 * a;
        ell(ctx, p.x, p.y, p.size * (1 - a) + 10, (p.size * (1 - a) + 10) * 0.6); ctx.stroke(); break;
      case 'flash':
        ctx.fillStyle = p.color; ell(ctx, p.x, p.y, p.size * (1.2 - a * 0.5), p.size * (1.2 - a * 0.5) * 0.7); ctx.fill(); break;
      case 'text':
        ctx.font = 'bold 22px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); break;
      case 'bubble':
        ctx.strokeStyle = 'rgba(210,240,255,0.9)'; ctx.lineWidth = 1.2;
        ell(ctx, p.x + Math.sin(t * 5 + p.y) * 2, p.y, p.size, p.size); ctx.stroke(); break;
      case 'debris':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); ctx.restore(); break;
      case 'baby': {
        const dir = p.vx >= 0 ? 1 : -1;
        ctx.fillStyle = '#a7b46a'; ell(ctx, p.x + dir * p.size, p.y, p.size * 0.45, p.size * 0.4); ctx.fill();
        ctx.fillStyle = '#7f8d3c'; ell(ctx, p.x, p.y, p.size, p.size * 0.7); ctx.fill();
        ctx.strokeStyle = '#454f1c'; ctx.lineWidth = 1; ctx.stroke();
        break;
      }
      default:
        ctx.fillStyle = p.color; ell(ctx, p.x, p.y, p.size, p.size); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawHud(t) {
  // progress bar
  const bx = 690, by = H - 22, bw = 290, bh = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; rrect(ctx, bx - 4, by - 4, bw + 8, bh + 8, 9); ctx.fill();
  ctx.fillStyle = '#3b3b3b'; rrect(ctx, bx, by, bw, bh, 7); ctx.fill();
  const prog = Math.min(1, G.spawned / G.total);
  if (prog > 0) {
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#7ee081'); g.addColorStop(1, '#3fae49');
    ctx.fillStyle = g; rrect(ctx, bx, by, Math.max(14, bw * prog), bh, 7); ctx.fill();
  }
  for (const f of G.flagMarks) {
    const fx = bx + bw * f;
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, by + bh); ctx.lineTo(fx, by - 10); ctx.stroke();
    ctx.fillStyle = prog >= f ? '#e33' : '#fff'; ctx.beginPath(); ctx.moveTo(fx, by - 10); ctx.lineTo(fx + 11, by - 6); ctx.lineTo(fx, by - 2); ctx.closePath(); ctx.fill();
  }
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'right';
  ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
  const label = `Level ${G.n} — ${G.L.title}`;
  ctx.strokeText(label, bx - 14, by + 12); ctx.fillText(label, bx - 14, by + 12);

  // banner
  if (G.banner) {
    const b = G.banner;
    const a = Math.min(1, b.t * 4, (b.dur - b.t) * 3);
    const s = 1 + Math.max(0, 0.3 - b.t) * 1.5;
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    ctx.translate(W / 2, H / 2 - 20); ctx.scale(s, s);
    ctx.font = 'bold 44px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.strokeText(b.text, 0, 0);
    ctx.fillStyle = /WAVE|huge/.test(b.text) ? '#ff5a4a' : '#fff6d0'; ctx.fillText(b.text, 0, 0);
    ctx.restore();
  }
}

// ---------- Outcome ----------
function winLevel() {
  if (G.over) return;
  G.over = true; G.running = false;
  Sfx.win();
  if (!cleared.includes(G.n)) cleared.push(G.n);
  localStorage.setItem('tvz_cleared', JSON.stringify(cleared));
  progress = Math.max(progress, Math.min(LEVELS.length, G.n + 1));
  localStorage.setItem('tvz_progress', String(progress));
  const reward = G.L.reward;
  let html;
  if (G.n === LEVELS.length) {
    html = `<h2>🌊 You saved the ocean! 🐢</h2><p>All ${LEVELS.length} levels cleared and the Kraken King is defeated. Every beach, reef and trench is safe — for now.</p>`;
  } else {
    html = `<h2>Level ${G.n} cleared!</h2>`;
    if (reward) {
      html += `<div class="reward"><canvas id="rewardIcon" width="120" height="90"></canvas><div><div class="reward-title">New turtle: ${TURTLES[reward].name}</div><p>${TURTLES[reward].desc}</p><p class="cost-line">Cost: ${TURTLES[reward].cost} pearls</p></div></div>`;
    } else {
      html += `<p>Great defending! The next level is even tougher.</p>`;
    }
    const next = LEVELS[G.n];
    if (next.env !== G.L.env) html += `<p class="world-unlock">New world unlocked: <b>${ENVS[next.env].label}</b></p>`;
  }
  const buttons = [];
  if (G.n < LEVELS.length) buttons.push({ label: 'Next level ▶', primary: true, fn: () => startLevel(G.n + 1) });
  buttons.push({ label: 'Level select', fn: goMenu });
  showOverlay(html, buttons);
  if (reward && G.n < LEVELS.length) {
    const c = $('rewardIcon'), cx = c.getContext('2d');
    cx.translate(55, 78); cx.scale(1.3, 1.3); drawTurtle(cx, reward, { armed: true }, 0);
  }
}

function loseLevel() {
  if (G.over) return;
  G.over = true; G.running = false;
  Sfx.lose();
  const where = 'reached ' + ENVS[G.env].home;
  showOverlay(`<h2>The zombies ${where}!</h2><p>Tip: build lots of Hawksbill Pearlers early, and use tough Galápagos Walls to slow down the front line.</p>`, [
    { label: 'Try again', primary: true, fn: () => startLevel(G.n) },
    { label: 'Level select', fn: goMenu }
  ]);
}

// ---------- UI ----------
function showScreen(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('hidden', s.id !== id);
}
function showOverlay(html, buttons) {
  const o = $('overlay');
  o.innerHTML = `<div class="panel">${html}<div class="btn-row"></div></div>`;
  const row = o.querySelector('.btn-row');
  for (const b of buttons) {
    const el = document.createElement('button');
    el.textContent = b.label;
    if (b.primary) el.className = 'primary';
    el.onclick = () => { Sfx.click(); b.fn(); };
    row.appendChild(el);
  }
  o.classList.remove('hidden');
}
function hideOverlay() { $('overlay').classList.add('hidden'); }

function goMenu() {
  if (G) { G.running = false; }
  G = null;
  hideOverlay();
  buildLevelSelect();
  showScreen('menu');
}

function togglePause(force) {
  if (!G || G.over || G.picking) return;
  G.paused = force != null ? force : !G.paused;
  if (G.paused) {
    showOverlay('<h2>Paused</h2>', [
      { label: 'Resume', primary: true, fn: () => togglePause(false) },
      { label: 'Restart level', fn: () => startLevel(G.n) },
      { label: 'Level select', fn: goMenu }
    ]);
  } else hideOverlay();
  updatePauseBtn();
}
function updatePauseBtn() { $('pauseBtn').textContent = G && G.paused ? '▶' : '❚❚'; }

function drawIcon(canvasEl, type) {
  const c = canvasEl.getContext('2d');
  c.clearRect(0, 0, canvasEl.width, canvasEl.height);
  c.save();
  c.translate(canvasEl.width / 2 - 6, canvasEl.height - 8);
  const s = type === 'galapagos' ? 0.62 : 0.74;
  c.scale(s, s);
  drawTurtle(c, type, { armed: true, seed: 1 }, 0.5);
  c.restore();
}

function buildCards() {
  const wrap = $('cards');
  wrap.innerHTML = '';
  G.available.forEach((type, i) => {
    const def = TURTLES[type];
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.type = type;
    el.title = `${def.name} — ${def.desc}`;
    el.innerHTML = `<canvas width="70" height="56"></canvas><div class="cost">${def.cost}</div><div class="cd"></div><div class="key">${i + 1}</div>`;
    drawIcon(el.querySelector('canvas'), type);
    el.addEventListener('pointerdown', e => { e.stopPropagation(); selectCard(type); });
    wrap.appendChild(el);
  });
}

function selectCard(type) {
  Sfx.ensure();
  if (!G || G.paused || G.over) return;
  const def = TURTLES[type];
  if (G.selected === type) { G.selected = null; return; }
  if (G.pearls < def.cost || (G.cool[type] || 0) > 0) { Sfx.tone(160, 0.1, 'square', 0.05); return; }
  Sfx.click();
  G.selected = type; G.shovel = false;
}

function updateUI() {
  $('pearlCount').textContent = G.pearls;
  for (const el of $('cards').children) {
    const type = el.dataset.type, def = TURTLES[type];
    const cd = G.cool[type] || 0;
    el.classList.toggle('poor', G.pearls < def.cost);
    el.classList.toggle('selected', G.selected === type);
    el.querySelector('.cd').style.height = (cd / def.cooldown * 100) + '%';
  }
  $('shovelBtn').classList.toggle('selected', G.shovel);
  $('stage').classList.toggle('placing', !!(G.selected || G.shovel));
}

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
function cellAt(x, y) {
  const col = Math.floor((x - GRID_X) / CELL_W), row = Math.floor((y - GRID_Y) / CELL_H);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { row, col };
}

canvas.addEventListener('pointerdown', e => {
  Sfx.ensure();
  if (!G || G.paused || G.over || G.picking) return;
  if (e.button === 2) { G.selected = null; G.shovel = false; return; }
  const { x, y } = canvasPos(e);
  const tapR = e.pointerType === 'touch' ? 46 : 30;
  // pearls first
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i];
    if (d.state !== 'collect' && Math.hypot(d.x - x, d.y - y) < tapR) {
      d.state = 'collect';
      G.pearls += d.value;
      Sfx.pearl();
      return;
    }
  }
  const cell = cellAt(x, y);
  if (G.selected) {
    if (cell && !G.grid[cell.row][cell.col]) {
      const def = TURTLES[G.selected];
      if (G.pearls >= def.cost && !(G.cool[G.selected] > 0)) placeTurtle(G.selected, cell.row, cell.col);
      G.selected = null;
    } else if (!cell) G.selected = null;
    return;
  }
  if (G.shovel) {
    if (cell && G.grid[cell.row][cell.col]) { removeTurtle(G.grid[cell.row][cell.col]); Sfx.plant(); }
    G.shovel = false;
  }
});
canvas.addEventListener('pointermove', e => {
  if (!G) return;
  const { x, y } = canvasPos(e);
  G.hover = cellAt(x, y);
  // hovering over a pearl changes cursor
  canvas.style.cursor = G.drops.some(d => d.state !== 'collect' && Math.hypot(d.x - x, d.y - y) < 30) ? 'pointer' : '';
});
canvas.addEventListener('pointerleave', () => { if (G) G.hover = null; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('keydown', e => {
  if (!G) return;
  if (e.key === 'Escape') { if (G.selected || G.shovel) { G.selected = null; G.shovel = false; } else togglePause(); return; }
  if (e.key === 'p' || e.key === 'P' || e.key === ' ') { e.preventDefault(); togglePause(); return; }
  if (G.paused || G.over || G.picking) return;
  if (e.key === 's' || e.key === 'S') { G.shovel = !G.shovel; G.selected = null; return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= G.available.length) selectCard(G.available[n - 1]);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.paused && !G.over) togglePause(true); });

$('shovelBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (!G || G.paused || G.over) return; Sfx.click(); G.shovel = !G.shovel; G.selected = null; });
$('pauseBtn').onclick = () => { Sfx.ensure(); togglePause(); };
$('menuBtn').onclick = () => { if (G && !G.over) togglePause(true); };
function updateSpeedBtn() { $('speedBtn').textContent = speedMul + 'x'; $('speedBtn').classList.toggle('selected', speedMul > 1); }
$('speedBtn').onclick = () => {
  speedMul = speedMul >= 3 ? 1 : speedMul + 1;
  localStorage.setItem('tvz_speed', String(speedMul));
  updateSpeedBtn();
};
updateSpeedBtn();
function updateMuteBtn() { $('muteBtn').textContent = Sfx.muted ? '🔇' : '🔊'; }
$('muteBtn').onclick = () => { Sfx.muted = !Sfx.muted; localStorage.setItem('tvz_muted', Sfx.muted ? '1' : '0'); updateMuteBtn(); };
updateMuteBtn();

// ---------- Phones ----------
const isTouch = matchMedia('(pointer: coarse)').matches;
// On phones, go fullscreen and try to lock landscape when a level starts (Android; iOS ignores this).
function goFullscreenLandscape() {
  if (!isTouch) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!document.fullscreenElement && req) {
    Promise.resolve(req.call(el)).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
  }
}
if (sessionStorage.getItem('tvz_rotate_ok')) document.body.classList.add('rotate-dismissed');
$('rotateDismiss').onclick = () => { document.body.classList.add('rotate-dismissed'); sessionStorage.setItem('tvz_rotate_ok', '1'); };
// Pause the game if the phone is turned upright mid-level (the rotate hint covers the screen).
const portraitPhone = matchMedia('(orientation: portrait) and (max-width: 600px)');
portraitPhone.addEventListener('change', () => {
  if (portraitPhone.matches && !document.body.classList.contains('rotate-dismissed') && G && !G.paused) togglePause(true);
});

// ---------- Menu & Almanac ----------
function buildLevelSelect() {
  const grid = $('levelGrid');
  grid.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const n = i + 1, locked = n > progress;
    if (i === 0 || LEVELS[i - 1].env !== L.env) {
      const h = document.createElement('div');
      h.className = 'world-title'; h.textContent = ENVS[L.env].world;
      grid.appendChild(h);
    }
    const b = document.createElement('button');
    b.className = `level-btn ${L.env}${locked ? ' locked' : ''}${cleared.includes(n) ? ' cleared' : ''}`;
    const zTypes = Object.keys(L.pool).concat(L.bosses.some(x => x) ? ['anchor'] : []).concat(L.finalBoss ? [L.finalBoss] : []);
    b.innerHTML = `<div class="lv-num">${locked ? '🔒' : n}</div><div class="lv-title">${L.title}</div>
      <div class="lv-meta">${ENVS[L.env].label} · ${'★'.repeat(Math.ceil(n / 4))}</div>
      <div class="lv-meta small">${locked ? 'Clear the previous level' : zTypes.map(z => ZOMBIES[z].name.replace(' Zombie', '')).join(', ')}</div>
      ${cleared.includes(n) ? '<div class="lv-check">✔</div>' : ''}`;
    b.disabled = locked;
    b.onclick = () => { Sfx.ensure(); Sfx.click(); goFullscreenLandscape(); startLevel(n); };
    grid.appendChild(b);
  });
}

function buildAlmanac() {
  const tw = $('almanacTurtles'), zw = $('almanacZombies');
  tw.innerHTML = ''; zw.innerHTML = '';
  const unlocked = turtlesForLevel(Math.min(LEVELS.length, progress) + (cleared.includes(progress) ? 1 : 0));
  for (const type of TURTLE_ORDER) {
    const def = TURTLES[type], known = unlocked.includes(type);
    const el = document.createElement('div');
    el.className = 'entry' + (known ? '' : ' unknown');
    el.innerHTML = `<canvas width="110" height="80"></canvas><div><h4>${known ? def.name : '???'}</h4><p>${known ? def.desc : 'Unlock by clearing more levels.'}</p>${known ? `<p class="cost-line">Cost ${def.cost} · Recharge ${def.cooldown}s</p>` : ''}</div>`;
    const c = el.querySelector('canvas'), cx = c.getContext('2d');
    cx.translate(50, 70); cx.scale(type === 'galapagos' ? 0.9 : 1.05, type === 'galapagos' ? 0.9 : 1.05);
    if (!known) cx.globalAlpha = 0.25;
    drawTurtle(cx, type, { armed: true }, 0.5);
    tw.appendChild(el);
  }
  for (const type of ZOMBIE_ORDER) {
    const def = ZOMBIES[type];
    const el = document.createElement('div');
    el.className = 'entry';
    el.innerHTML = `<canvas width="110" height="130"></canvas><div><h4>${def.name}</h4><p>${def.desc}</p><p class="cost-line">Toughness ${def.hp + def.armor} · Speed ${def.speed > 25 ? 'fast' : def.speed < 13 ? 'slow' : 'normal'}</p></div>`;
    const c = el.querySelector('canvas'), cx = c.getContext('2d');
    const z = { type, scale: 1, armor: def.armor, maxArmor: def.armor, walk: 0.8, slow: 0, flash: 0, eating: null, dying: 0, smashT: 0 };
    const s = type === 'kraken' ? 0.7 : type === 'anchor' ? 0.82 : type === 'shark' ? 0.78 : 0.95;
    cx.translate(type === 'shark' ? 64 : 58, type === 'shark' ? 100 : 124); cx.scale(s, s);
    drawZombie(cx, z, 0.3, WATER_ZOMBIES.includes(type) ? 'underwater' : 'seaside');
    zw.appendChild(el);
  }
}

$('almanacBtn').onclick = () => { Sfx.ensure(); Sfx.click(); buildAlmanac(); showScreen('almanac'); };
$('almanacBack').onclick = () => { Sfx.click(); showScreen('menu'); };
$('resetBtn').onclick = () => {
  if (!confirm('Reset all level progress?')) return;
  progress = 1; cleared = [];
  localStorage.removeItem('tvz_progress'); localStorage.removeItem('tvz_cleared');
  buildLevelSelect();
};

// pearl icon in the HUD
(() => {
  const c = $('pearlIcon').getContext('2d');
  drawPearlShape(c, 18, 18, 13, 0);
})();

// title art
(() => {
  const c = $('titleArt'), cx = c.getContext('2d');
  cx.save(); cx.translate(90, 120); cx.scale(1.5, 1.5); drawTurtle(cx, 'green', { seed: 2 }, 1); cx.restore();
  cx.save(); cx.translate(210, 125); cx.scale(1.1, 1.1); drawTurtle(cx, 'galapagos', { seed: 3 }, 2.2); cx.restore();
  cx.save(); cx.translate(420, 130);
  drawZombie(cx, { type: 'beach', scale: 1, armor: 0, maxArmor: 0, walk: 1, slow: 0, flash: 0, eating: null, dying: 0, smashT: 0 }, 0, 'seaside');
  cx.restore();
  cx.save(); cx.translate(510, 130); cx.scale(0.9, 0.9);
  drawZombie(cx, { type: 'diver', scale: 1, armor: 1, maxArmor: 1, walk: 2.5, slow: 0, flash: 0, eating: null, dying: 0, smashT: 0 }, 0, 'underwater');
  cx.restore();
})();

// ---------- Main loop ----------
function frame(ts) {
  // Catch up in fixed sub-steps so low frame rates don't slow the game down
  let elapsed = Math.min(0.25, (ts - lastTs) / 1000 || 0) * speedMul;
  lastTs = ts;
  if (G) {
    while (elapsed > 0 && G && G.running && !G.paused) {
      const step = Math.min(0.04, elapsed);
      update(step);
      elapsed -= step;
    }
    if (G) { render(); updateUI(); }
  }
  requestAnimationFrame(frame);
}

buildLevelSelect();
requestAnimationFrame(frame);
