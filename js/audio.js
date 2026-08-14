'use strict';
/* Wiggle World - tiny synth kit. Soft, kid-friendly tones only. */

const Sound = {
  ctx: null, on: true,
  init(){ if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  tone(freq, dur, type = 'sine', vol = 0.12, slide = 0){
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },
  pop(){ this.tone(500 + Math.random() * 200, 0.12, 'sine', 0.14, 300); },
  bloop(){ this.tone(280 + Math.random() * 100, 0.25, 'sine', 0.1, -160); },
  twinkle(){
    const base = [880, 988, 1175, 1319][Math.floor(Math.random() * 4)];
    this.tone(base, 0.2, 'sine', 0.08);
    setTimeout(() => this.tone(base * 1.5, 0.25, 'sine', 0.06), 90);
  },
  chirp(){ this.tone(900 + Math.random() * 400, 0.09, 'square', 0.05, 500); },
  boing(){ this.tone(160, 0.3, 'triangle', 0.12, 220); },
  marimba(){ this.tone([392, 440, 523, 587, 659][Math.floor(Math.random() * 5)], 0.35, 'sine', 0.1); },
  crack(){ this.tone(1800, 0.05, 'square', 0.06, -900); },
  rumble(){ this.tone(70, 0.6, 'triangle', 0.14, -20); },
  squeak(){ this.tone(1100 + Math.random() * 400, 0.12, 'sine', 0.07, 300); },
  whoosh(){ this.tone(300, 0.4, 'sawtooth', 0.03, 700); }
};
