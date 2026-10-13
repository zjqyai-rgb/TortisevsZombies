// ===== Game data: turtles, zombies, levels =====

const W = 1000, H = 600;
const GRID_X = 90, GRID_Y = 70, CELL_W = 86, CELL_H = 100, ROWS = 5, COLS = 9;
const GRID_RIGHT = GRID_X + CELL_W * COLS;

const TURTLES = {
  hawksbill: {
    name: 'Hawksbill Pearler', cost: 50, hp: 300, cooldown: 7.5, kind: 'producer',
    rate: 24, first: 7,
    desc: 'Grows a shiny pearl on its shell and hands it to you every so often. Your pearl economy starts here.'
  },
  green: {
    name: 'Green Bubble Shooter', cost: 100, hp: 300, cooldown: 7.5, kind: 'shooter',
    damage: 20, fireRate: 1.45, shots: 1, projectile: 'bubble',
    desc: 'Blows hard-hitting bubbles at zombies in its lane.'
  },
  galapagos: {
    name: 'Galápagos Wall', cost: 50, hp: 4000, cooldown: 30, kind: 'wall',
    desc: 'A 150-year-old giant. Very tough shell. Zombies chew on it for a long, long time.'
  },
  softshell: {
    name: 'Softshell Sand Mine', cost: 25, hp: 300, cooldown: 30, kind: 'mine',
    armTime: 14, damage: 1800,
    desc: 'Buries itself in sand. Once armed, it bursts out and blasts the first zombie that steps on it.'
  },
  snapper: {
    name: 'Alligator Snapper', cost: 150, hp: 300, cooldown: 7.5, kind: 'chomper',
    chewTime: 26, range: 1.35,
    desc: 'Swallows a zombie whole in one snap, then needs a long time to chew. Cannot eat the Anchor Brute.'
  },
  loggerhead: {
    name: 'Loggerhead Frost', cost: 175, hp: 300, cooldown: 7.5, kind: 'shooter',
    damage: 20, fireRate: 1.45, shots: 1, projectile: 'frost', slowTime: 8,
    desc: 'Shoots icy deep-current bubbles that slow zombies down.'
  },
  leatherback: {
    name: 'Leatherback Twin', cost: 200, hp: 300, cooldown: 7.5, kind: 'shooter',
    damage: 20, fireRate: 1.45, shots: 2, projectile: 'bubble',
    desc: 'The giant of the sea. Fires two bubbles at a time.'
  },
  ridley: {
    name: 'Ridley Arribada', cost: 150, hp: 9999, cooldown: 45, kind: 'bomb',
    fuse: 1.1, damage: 1800,
    desc: 'Calls a mass arribada of Ridley turtles that stampede and blast every zombie in a 3x3 area.'
  }
};
Object.assign(TURTLES, {
  twinpearl: {
    name: 'Pearl Queen', cost: 125, hp: 300, cooldown: 7.5, kind: 'producer',
    rate: 24, first: 7, count: 2,
    desc: 'A golden hawksbill that makes two pearls at a time. Very handy on dark levels where few pearls drift in.'
  },
  star: {
    name: 'Star Tortoise Spikes', cost: 100, hp: 300, cooldown: 7.5, kind: 'spikes',
    damage: 20, tick: 1,
    desc: 'Lies low in the sand with a spiky star-patterned shell. Hurts every zombie that walks over it. Zombies cannot eat it, but brutes can crush it.'
  },
  flatback: {
    name: 'Flatback Lobber', cost: 250, hp: 300, cooldown: 7.5, kind: 'lobber',
    damage: 60, splash: 30, fireRate: 2.9,
    desc: 'Lobs spiky sea urchins in an arc. Splashes nearby zombies and flies right over surfboards and sharks.'
  },
  matamata: {
    name: 'Mata Mata Magnet', cost: 100, hp: 300, cooldown: 7.5, kind: 'magnet',
    range: 2.6, recharge: 12,
    desc: 'Its strange frilly head pulls metal off nearby zombies: buckets, diving helmets, even the Anchor Brute\'s anchor.'
  }
});
const TURTLE_ORDER = ['hawksbill', 'green', 'galapagos', 'softshell', 'snapper', 'loggerhead', 'leatherback', 'ridley', 'twinpearl', 'star', 'flatback', 'matamata'];
const MAX_SLOTS = 8;

const ZOMBIES = {
  beach:    { name: 'Beachgoer Zombie',   hp: 200, armor: 0,    speed: 16, dps: 100, desc: 'Just here for the sun. And your turtles.' },
  lifebuoy: { name: 'Lifebuoy Zombie',    hp: 200, armor: 370,  speed: 16, dps: 100, desc: 'Its life ring soaks up some damage.' },
  bucket:   { name: 'Sandcastle Zombie',  hp: 200, armor: 1100, speed: 16, dps: 100, desc: 'Wears a sand bucket as a helmet. Very sturdy.' },
  surfer:   { name: 'Surfer Zombie',      hp: 200, armor: 350,  speed: 32, slowSpeed: 16, dps: 100, desc: 'Rides in fast. Slows down once its board breaks.' },
  pirate:   { name: 'Pirate Captain',     hp: 500, armor: 500,  speed: 14, dps: 150, scale: 1.1, desc: 'Tough and bites hard. Arrr.' },
  snorkel:  { name: 'Snorkel Zombie',     hp: 220, armor: 0,    speed: 22, dps: 100, desc: 'Quick swimmer from the reef.' },
  diver:    { name: 'Deep Diver Zombie',  hp: 220, armor: 1000, speed: 12, dps: 100, desc: 'A brass diving helmet makes it very hard to stop.' },
  shark:    { name: 'Shark Rider',        hp: 220, armor: 600,  speed: 34, slowSpeed: 16, dps: 100, desc: 'Charges in on a zombie shark. Slows down once the shark is gone.' },
  anchor:   { name: 'Anchor Brute',       hp: 3000, armor: 0,   speed: 9,  dps: 0, scale: 1.55, smash: true, boss: true, desc: 'A huge brute that crushes turtles with a ship anchor.' }
};
Object.assign(ZOMBIES, {
  volley: { name: 'Volleyball Vaulter', hp: 340, armor: 0,  speed: 30, slowSpeed: 16, dps: 100, desc: 'Sprints in and leaps over the first turtle it meets. A Galápagos Wall is too tall to jump.' },
  tiki:   { name: 'Tiki Bomber',        hp: 300, armor: 0,  speed: 15, dps: 100, desc: 'Carries a lit coconut bomb. If it gets to chew on a turtle, it blows up everything around it.' },
  angler: { name: 'Anglerfish Zombie',  hp: 300, armor: 400, speed: 14, dps: 100, desc: 'Its glowing lure lulls nearby turtles to sleep. Break the lure to stop it.' },
  kraken: { name: 'Kraken King',        hp: 7000, armor: 0, speed: 6, dps: 0, scale: 1.75, smash: true, boss: true, summon: true, desc: 'The final boss. Crushes turtles with huge tentacles and calls in snorkel minions.' }
});
const ZOMBIE_ORDER = ['beach', 'lifebuoy', 'bucket', 'surfer', 'pirate', 'volley', 'tiki', 'snorkel', 'diver', 'shark', 'anchor', 'angler', 'kraken'];
const WATER_ZOMBIES = ['snorkel', 'diver', 'shark', 'anchor', 'angler', 'kraken'];
// Metal armor the Mata Mata can pull off
const METAL_ARMOR = ['bucket', 'diver'];

const ENVS = {
  seaside:    { label: '🏖️ Seaside',        world: 'World 1 — Seaside',        home: 'the turtle nest' },
  underwater: { label: '🌊 Underwater',     world: 'World 2 — Underwater Reef', home: 'the coral nursery' },
  night:      { label: '🌙 Moonlit Shore',  world: 'World 3 — Moonlit Shore',  home: 'the turtle nest' },
  trench:     { label: '🦑 Abyssal Trench', world: 'World 4 — Abyssal Trench', home: 'the vent nursery' }
};
const isWater = env => env === 'underwater' || env === 'trench';

// Turtles available at the start, plus the one unlocked by beating each level.
const START_TURTLES = ['hawksbill', 'green'];
const LEVELS = [
  { title: 'First Tide',         env: 'seaside',    pearls: 150, first: 24, normal: 8,  flags: 1, flagSize: 4,  interval: [22, 14], pool: { beach: 1 }, hpMul: 1.00, sky: 8.5, reward: 'galapagos', bosses: [] },
  { title: 'Lifeguard Off Duty', env: 'seaside',    pearls: 150, first: 22, normal: 10, flags: 1, flagSize: 5,  interval: [20, 13], pool: { beach: 4, lifebuoy: 1 }, hpMul: 1.00, sky: 8.5, reward: 'softshell', bosses: [] },
  { title: 'Sandcastle Siege',   env: 'seaside',    pearls: 150, first: 22, normal: 12, flags: 2, flagSize: 4,  interval: [19, 12], pool: { beach: 5, lifebuoy: 2, bucket: 1 }, hpMul: 1.02, sky: 9, reward: 'snapper', bosses: [] },
  { title: "Surf's Up",          env: 'seaside',    pearls: 175, first: 22, normal: 14, flags: 2, flagSize: 5,  interval: [18, 11], pool: { beach: 4, lifebuoy: 2, bucket: 1, surfer: 2 }, hpMul: 1.03, sky: 9, reward: 'loggerhead', bosses: [] },
  { title: 'Pirate Cove',        env: 'seaside',    pearls: 175, first: 22, normal: 15, flags: 2, flagSize: 5,  interval: [17.5, 10.5], pool: { beach: 5, lifebuoy: 2, bucket: 1, surfer: 2, pirate: 1 }, hpMul: 1.05, sky: 9, reward: 'leatherback', bosses: [] },
  { title: 'Into the Deep',      env: 'underwater', pearls: 200, first: 22, normal: 16, flags: 2, flagSize: 6,  interval: [17, 10], pool: { snorkel: 5, lifebuoy: 2, diver: 1 }, hpMul: 1.06, sky: 9, reward: 'ridley', bosses: [] },
  { title: 'Shark Alley',        env: 'underwater', pearls: 200, first: 22, normal: 18, flags: 2, flagSize: 7,  interval: [16, 9.5], pool: { snorkel: 5, lifebuoy: 1, diver: 1, shark: 2 }, hpMul: 1.08, sky: 9, reward: null, bosses: [] },
  { title: 'Coral Crisis',       env: 'underwater', pearls: 200, first: 22, normal: 20, flags: 3, flagSize: 5,  interval: [15, 9],  pool: { snorkel: 4, bucket: 1, diver: 2, shark: 2, pirate: 1 }, hpMul: 1.10, sky: 9, reward: null, bosses: [] },
  { title: 'Sunken Wreck',       env: 'underwater', pearls: 225, first: 22, normal: 22, flags: 3, flagSize: 7,  interval: [14, 8.5], pool: { snorkel: 4, diver: 2, shark: 2, pirate: 2 }, hpMul: 1.12, sky: 9, reward: null, bosses: [0, 0, 1] },
  { title: 'Abyssal Armada',     env: 'underwater', pearls: 250, first: 22, normal: 26, flags: 3, flagSize: 8,  interval: [13, 8],  pool: { snorkel: 4, bucket: 1, diver: 2, shark: 3, pirate: 2 }, hpMul: 1.15, sky: 9, reward: 'twinpearl', bosses: [0, 1, 1] },
  // ---- World 3: Moonlit Shore (fewer pearls drift in at night) ----
  { title: 'Moonrise',               env: 'night',  pearls: 250, first: 22, normal: 18, flags: 2, flagSize: 6, interval: [16, 9.5],  pool: { beach: 4, lifebuoy: 2, bucket: 1, volley: 2 }, hpMul: 1.10, sky: 12, reward: 'star', bosses: [] },
  { title: 'Volleyball by Moonlight', env: 'night', pearls: 200, first: 22, normal: 20, flags: 2, flagSize: 7, interval: [15.5, 9],  pool: { beach: 3, lifebuoy: 2, bucket: 1, volley: 3, surfer: 2 }, hpMul: 1.12, sky: 12, reward: 'flatback', bosses: [] },
  { title: 'Tiki Torch Party',       env: 'night',  pearls: 225, first: 22, normal: 22, flags: 3, flagSize: 5, interval: [15, 9],    pool: { beach: 3, lifebuoy: 2, bucket: 2, volley: 2, tiki: 2 }, hpMul: 1.14, sky: 12, reward: 'matamata', bosses: [] },
  { title: 'Midnight Mutiny',        env: 'night',  pearls: 225, first: 22, normal: 24, flags: 3, flagSize: 6, interval: [14.5, 8.5], pool: { beach: 2, bucket: 2, surfer: 2, volley: 2, tiki: 2, pirate: 2 }, hpMul: 1.16, sky: 12, reward: null, bosses: [] },
  { title: 'Full Moon Fury',         env: 'night',  pearls: 250, first: 22, normal: 26, flags: 3, flagSize: 7, interval: [14, 8],    pool: { beach: 2, lifebuoy: 1, bucket: 2, surfer: 2, volley: 2, tiki: 2, pirate: 2 }, hpMul: 1.18, sky: 12, reward: null, bosses: [0, 1, 1] },
  // ---- World 4: Abyssal Trench ----
  { title: 'The Drop-off',           env: 'trench', pearls: 225, first: 22, normal: 24, flags: 3, flagSize: 6, interval: [14, 8.5],  pool: { snorkel: 4, diver: 2, angler: 2 }, hpMul: 1.20, sky: 12, reward: null, bosses: [] },
  { title: 'Lantern Lights',         env: 'trench', pearls: 225, first: 22, normal: 26, flags: 3, flagSize: 7, interval: [13.5, 8],  pool: { snorkel: 3, diver: 2, angler: 3, shark: 2 }, hpMul: 1.22, sky: 12, reward: null, bosses: [] },
  { title: 'Hydrothermal Vents',     env: 'trench', pearls: 250, first: 22, normal: 28, flags: 3, flagSize: 8, interval: [13, 7.5],  pool: { snorkel: 3, diver: 3, angler: 2, shark: 2, bucket: 1 }, hpMul: 1.24, sky: 12, reward: null, bosses: [] },
  { title: "Leviathan's Lair",       env: 'trench', pearls: 250, first: 22, normal: 30, flags: 3, flagSize: 8, interval: [12.5, 7.5], pool: { snorkel: 3, diver: 3, angler: 2, shark: 3, pirate: 2 }, hpMul: 1.27, sky: 12, reward: null, bosses: [1, 1, 2] },
  { title: 'The Kraken Awakens',     env: 'trench', pearls: 300, first: 22, normal: 32, flags: 3, flagSize: 9, interval: [12, 7],    pool: { snorkel: 3, diver: 3, angler: 3, shark: 3, pirate: 2, bucket: 1 }, hpMul: 1.30, sky: 12, reward: null, bosses: [0, 1, 1], finalBoss: 'kraken' }
];

function turtlesForLevel(n) {
  const list = START_TURTLES.slice();
  for (let i = 0; i < n - 1; i++) if (LEVELS[i].reward) list.push(LEVELS[i].reward);
  return TURTLE_ORDER.filter(t => list.includes(t));
}

function pickWeighted(pool) {
  const keys = Object.keys(pool);
  let total = 0;
  for (const k of keys) total += pool[k];
  let r = Math.random() * total;
  for (const k of keys) { r -= pool[k]; if (r <= 0) return k; }
  return keys[keys.length - 1];
}

// Build the spawn timeline: steady trickle split into segments, each ending in a big flag wave.
function buildSchedule(L, n) {
  const sched = [];
  let t = L.first;
  const perSeg = Math.ceil(L.normal / L.flags);
  const groupChance = Math.min(0.3, (n - 1) * 0.035);
  let spawned = 0;
  for (let f = 0; f < L.flags; f++) {
    const segCount = Math.min(perSeg, L.normal - spawned);
    for (let i = 0; i < segCount; i++) {
      const p = (spawned + i) / Math.max(1, L.normal - 1);
      // Early zombies in level are the simplest type
      const type = (spawned + i) < 2 ? Object.keys(L.pool)[0] : pickWeighted(L.pool);
      sched.push({ t, type });
      if (Math.random() < groupChance && i > 1) sched.push({ t: t + 0.8, type: pickWeighted(L.pool) });
      t += L.interval[0] + (L.interval[1] - L.interval[0]) * p + (Math.random() * 2 - 1);
    }
    spawned += segCount;
    // Flag wave
    t += 4;
    sched.push({ t, banner: f === L.flags - 1 ? 'FINAL WAVE!' : 'A huge wave of zombies is approaching!' });
    t += 3;
    const bosses = L.bosses[f] || 0;
    for (let b = 0; b < bosses; b++) sched.push({ t: t + 2 + b * 2.5, type: 'anchor', flag: true });
    if (L.finalBoss && f === L.flags - 1) sched.push({ t: t + 5, type: L.finalBoss, flag: true });
    for (let i = 0; i < L.flagSize; i++) {
      sched.push({ t: t + i * 0.55, type: pickWeighted(L.pool), flag: true });
    }
    t += L.flagSize * 0.55 + 22;
  }
  sched.sort((a, b) => a.t - b.t);
  return sched;
}
