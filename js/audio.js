// ===== Tiny synth sound effects (no audio files needed) =====
const Sfx = {
  ctx: null,
  muted: localStorage.getItem('tvz_muted') === '1',
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null, delay = 0) {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol = 0.3, delay = 0) {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    s.buffer = buf; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t0);
  },
  shoot() { this.tone(520, 0.08, 'sine', 0.06, 900); },
  hit() { this.tone(220, 0.06, 'triangle', 0.06, 120); },
  pearl() { this.tone(880, 0.12, 'sine', 0.12); this.tone(1320, 0.18, 'sine', 0.1, null, 0.07); },
  plant() { this.tone(300, 0.1, 'triangle', 0.15, 180); this.noise(0.08, 0.12); },
  chomp() { this.noise(0.15, 0.3); this.tone(140, 0.2, 'square', 0.08, 70); },
  boom() { this.noise(0.6, 0.6); this.tone(90, 0.5, 'sine', 0.3, 30); },
  crab() { for (let i = 0; i < 4; i++) this.tone(600 + i * 120, 0.06, 'square', 0.05, null, i * 0.06); },
  groan() { this.tone(110 + Math.random() * 30, 0.6, 'sawtooth', 0.04, 80); },
  armor() { this.tone(900, 0.1, 'square', 0.05, 400); },
  wave() { this.tone(200, 0.4, 'sawtooth', 0.08, 300); this.tone(300, 0.5, 'sawtooth', 0.06, 450, 0.3); },
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.15, null, i * 0.15)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.4, 'sawtooth', 0.08, null, i * 0.25)); },
  click() { this.tone(700, 0.04, 'square', 0.04); }
};
