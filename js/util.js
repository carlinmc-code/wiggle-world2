'use strict';
/* Wiggle World - shared canvas globals, helpers, and the particle system
   (the "magic trail" that follows every wiggle). Loaded first. */

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize(){
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// roundRect shipped in Safari 16; fall back to a plain rect on older iPads
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h){ this.rect(x, y, w, h); return this; };
}

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (x1, y1, x2, y2) => { const dx = x1 - x2, dy = y1 - y2; return dx * dx + dy * dy; };

function drawEmoji(e, x, y, size, angle = 0, flip = false, alpha = 1){
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  if (flip) ctx.scale(-1, 1);
  ctx.globalAlpha = alpha;
  ctx.font = size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(e, 0, 0);
  ctx.restore();
}

/* ---------- particles ---------- */
const particles = [];
const MAX_TRAIL = REDUCED ? 60 : 160;

function spawnParticle(x, y, glyph, opts = {}){
  if (particles.length > MAX_TRAIL + 60) return;
  particles.push({
    x, y, glyph,
    vx: opts.vx !== undefined ? opts.vx : rand(-40, 40),
    vy: opts.vy !== undefined ? opts.vy : rand(-90, -30),
    size: opts.size !== undefined ? opts.size : rand(14, 26),
    life: opts.life !== undefined ? opts.life : rand(0.7, 1.3),
    age: 0, spin: rand(-2, 2), angle: rand(0, 6.28),
    grav: opts.grav || 0
  });
}

function updateParticles(dt){
  for (let i = particles.length - 1; i >= 0; i--){
    const p = particles[i];
    p.age += dt;
    if (p.age > p.life){ particles.splice(i, 1); continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.angle += p.spin * dt;
    drawEmoji(p.glyph, p.x, p.y, p.size, p.angle, false, 1 - p.age / p.life);
  }
}
