'use strict';
/* Wiggle World - the five scenes. Each declares which scene character
   the child becomes when the avatar picker is set to Scene Character. */

class Scene {
  constructor(){ this.t = 0; }
  enter(){} update(dt){} trailGlyph(){ return '✨'; }
}

/* ---------- 1. Under the Sea ---------- */
class Ocean extends Scene {
  constructor(){
    super();
    this.name = 'Under the Sea'; this.icon = '🐠'; this.avatar = 'diver';
    this.fish = []; this.bubbles = []; this.jellies = []; this.weeds = [];
  }
  enter(){
    this.fish = Array.from({ length: 8 }, () => ({
      e: pick(['🐠','🐟','🐡','🦈','🐬']), x: rand(0, W), y: rand(H * 0.12, H * 0.75),
      vx: rand(30, 80) * pick([-1, 1]), vy: 0, wob: rand(0, 6), size: rand(44, 70), panic: 0
    }));
    this.jellies = Array.from({ length: 3 }, () => ({
      x: rand(W * 0.1, W * 0.9), y: rand(H * 0.15, H * 0.6), ph: rand(0, 6), glow: 0
    }));
    this.bubbles = Array.from({ length: 10 }, () => this.newBubble());
    this.weeds = Array.from({ length: 7 }, (_, i) => ({ x: (i + 0.5) * W / 7 + rand(-30, 30), h: rand(70, 150), ph: rand(0, 6) }));
  }
  newBubble(){ return { x: rand(0, W), y: H + rand(20, 300), r: rand(14, 30), v: rand(50, 110) }; }
  trailGlyph(){ return '🫧'; }
  update(dt){
    this.t += dt;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1287d8'); g.addColorStop(0.55, '#0a5aa0'); g.addColorStop(1, '#062f57');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#bfe9ff';
    for (let i = 0; i < 4; i++){
      const rx = W * (0.15 + i * 0.24) + Math.sin(this.t * 0.3 + i) * 40;
      ctx.beginPath(); ctx.moveTo(rx - 30, 0); ctx.lineTo(rx + 30, 0);
      ctx.lineTo(rx + 140, H); ctx.lineTo(rx - 140, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#e8c98f'; ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(0, H - 46);
    for (let x = 0; x <= W; x += 60) ctx.quadraticCurveTo(x + 30, H - 66, x + 60, H - 46);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    for (const w of this.weeds){
      ctx.strokeStyle = '#1f7a4d'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      const sway = Math.sin(this.t * 1.4 + w.ph) * 18;
      ctx.beginPath(); ctx.moveTo(w.x, H - 30);
      ctx.quadraticCurveTo(w.x + sway, H - 30 - w.h * 0.6, w.x + sway * 1.6, H - 30 - w.h);
      ctx.stroke();
    }
    drawEmoji('🐙', W * 0.12, H - 80 + Math.sin(this.t * 1.2) * 8, 76, Math.sin(this.t) * 0.1);
    drawEmoji('🦀', W * 0.85 + Math.sin(this.t * 0.7) * 40, H - 52, 46);
    for (const b of this.bubbles){
      b.y -= b.v * dt; b.x += Math.sin(this.t * 2 + b.r) * 20 * dt;
      const hit = Motion.nearest(b.x, b.y, b.r + 46);
      if (hit || b.y < -40){
        if (hit){
          Sound.pop();
          for (let k = 0; k < 6; k++) spawnParticle(b.x, b.y, '💧', { vy: rand(-120, 20), life: 0.5, size: 14 });
        }
        Object.assign(b, this.newBubble());
        continue;
      }
      ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#dff3ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.2, 0, 6.28);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    }
    for (const j of this.jellies){
      j.y += Math.sin(this.t * 0.9 + j.ph) * 12 * dt; j.x += Math.cos(this.t * 0.5 + j.ph) * 10 * dt;
      const hit = Motion.nearest(j.x, j.y, 90);
      if (hit && j.glow <= 0){ j.glow = 1; Sound.twinkle(); }
      if (j.glow > 0){
        ctx.save(); ctx.globalAlpha = j.glow * 0.5; ctx.fillStyle = '#ff9ce0';
        ctx.beginPath(); ctx.arc(j.x, j.y, 70, 0, 6.28); ctx.fill(); ctx.restore();
        j.glow -= dt * 1.2;
      }
      drawEmoji('🪼', j.x, j.y, 62, Math.sin(this.t + j.ph) * 0.15);
    }
    for (const f of this.fish){
      const hit = Motion.nearest(f.x, f.y, 130);
      if (hit && f.panic <= 0){
        f.panic = 1; Sound.bloop();
        const ang = Math.atan2(f.y - hit.y, f.x - hit.x);
        f.vx = Math.cos(ang) * 340; f.vy = Math.sin(ang) * 260;
        for (let k = 0; k < 5; k++) spawnParticle(f.x, f.y, '🫧', { life: 0.6 });
      }
      f.panic = Math.max(0, f.panic - dt);
      const cruise = (f.vx >= 0 ? 1 : -1) * rand(30, 80);
      f.vx += (cruise - f.vx) * dt * 0.8;
      f.vy += (0 - f.vy) * dt * 1.2;
      f.x += f.vx * dt; f.y += f.vy * dt + Math.sin(this.t * 2 + f.wob) * 14 * dt;
      if (f.x < -60) f.x = W + 60; if (f.x > W + 60) f.x = -60;
      f.y = clamp(f.y, H * 0.06, H * 0.8);
      drawEmoji(f.e, f.x, f.y, f.size, 0, f.vx > 0);
    }
  }
}

/* ---------- 2. Outer Space ---------- */
class Space extends Scene {
  constructor(){
    super(); this.name = 'Outer Space'; this.icon = '🚀'; this.avatar = 'astronaut';
    this.stars = []; this.planets = []; this.shooters = [];
    this.rocket = { x: 0, y: 0, tx: 0, ty: 0 };
  }
  enter(){
    this.stars = Array.from({ length: REDUCED ? 60 : 120 }, () => ({
      x: rand(0, W), y: rand(0, H), r: rand(1, 2.6), ph: rand(0, 6), burst: 0
    }));
    this.planets = [
      { e: '🪐', x: W * 0.2, y: H * 0.25, size: 110, wob: 0, ph: 0 },
      { e: '🌍', x: W * 0.78, y: H * 0.6, size: 90, wob: 0, ph: 2 },
      { e: '🌕', x: W * 0.6, y: H * 0.18, size: 70, wob: 0, ph: 4 }
    ];
    this.rocket.x = this.rocket.tx = W / 2; this.rocket.y = this.rocket.ty = H * 0.7;
    this.astro = { x: W * 0.35, y: H * 0.45, ph: rand(0, 6) };
    this.shooters = [];
  }
  trailGlyph(){ return '⭐'; }
  update(dt){
    this.t += dt;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1026'); g.addColorStop(1, '#1b1040');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const s of this.stars){
      const hit = Motion.nearest(s.x, s.y, 70);
      if (hit) s.burst = 1;
      s.burst = Math.max(0, s.burst - dt * 1.5);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.5 + s.ph));
      ctx.globalAlpha = clamp(tw + s.burst, 0, 1);
      ctx.fillStyle = s.burst > 0 ? '#fff7c2' : '#cfd8ff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r + s.burst * 3, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const p of this.planets){
      const hit = Motion.nearest(p.x, p.y, p.size * 0.8);
      if (hit && p.wob <= 0){ p.wob = 1; Sound.boing(); }
      p.wob = Math.max(0, p.wob - dt * 1.6);
      const squish = 1 + Math.sin(p.wob * 12) * p.wob * 0.18;
      drawEmoji(p.e, p.x, p.y + Math.sin(this.t * 0.5 + p.ph) * 10, p.size * squish, p.wob * 0.4);
    }
    const a = this.astro;
    a.x += Math.sin(this.t * 0.4 + a.ph) * 12 * dt; a.y += Math.cos(this.t * 0.3 + a.ph) * 10 * dt;
    const ahit = Motion.nearest(a.x, a.y, 100);
    drawEmoji('🧑‍🚀', a.x, a.y, 74, ahit ? Math.sin(this.t * 14) * 0.3 : Math.sin(this.t) * 0.12);
    if (Motion.points.length){
      let sx = 0, sy = 0;
      for (const p of Motion.points){ sx += p.x; sy += p.y; }
      this.rocket.tx = sx / Motion.points.length; this.rocket.ty = sy / Motion.points.length;
    }
    const r = this.rocket;
    r.x += (r.tx - r.x) * dt * 1.6; r.y += (r.ty - r.y) * dt * 1.6;
    const moving = Math.abs(r.tx - r.x) + Math.abs(r.ty - r.y) > 30;
    if (moving && Math.random() < 0.5) spawnParticle(r.x, r.y + 26, pick(['🔥','✨']), { vy: rand(40, 120), life: 0.5, size: 18 });
    drawEmoji('🚀', r.x, r.y, 78, Math.atan2(r.ty - r.y, r.tx - r.x) + Math.PI / 2 - Math.PI / 4);
    if (Motion.energy > 0.35 && Math.random() < 0.06 && this.shooters.length < 3){
      this.shooters.push({ x: rand(0, W * 0.4), y: rand(0, H * 0.3), vx: rand(500, 800), vy: rand(180, 320) });
      Sound.whoosh();
    }
    for (let i = this.shooters.length - 1; i >= 0; i--){
      const s = this.shooters[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      spawnParticle(s.x, s.y, '✨', { vx: 0, vy: 0, life: 0.4, size: 16 });
      drawEmoji('☄️', s.x, s.y, 44, Math.atan2(s.vy, s.vx));
      if (s.x > W + 60 || s.y > H + 60) this.shooters.splice(i, 1);
    }
  }
}

/* ---------- 3. Jungle Party ---------- */
class Jungle extends Scene {
  constructor(){
    super(); this.name = 'Jungle Party'; this.icon = '🦋'; this.avatar = 'monkey';
    this.butterflies = []; this.flowers = [];
  }
  enter(){
    this.butterflies = Array.from({ length: 7 }, () => ({
      e: pick(['🦋','🐝','🐞']), x: rand(0, W), y: rand(H * 0.1, H * 0.7),
      vx: rand(-40, 40), vy: rand(-20, 20), ph: rand(0, 6), panic: 0
    }));
    this.flowers = Array.from({ length: 8 }, (_, i) => ({
      e: pick(['🌺','🌻','🌷','🌸']), x: (i + 0.5) * W / 8 + rand(-24, 24),
      y: H - rand(40, 70), bloom: 0.4, target: 0.4
    }));
    this.parrot = { x: W * 0.82, y: H * 0.22, flap: 0 };
    this.monkey = { x: W * 0.1, y: H * 0.3, peek: 0 };
  }
  trailGlyph(){ return pick(['🍃','✨']); }
  update(dt){
    this.t += dt;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#8fd45f'); g.addColorStop(0.5, '#3f9e4f'); g.addColorStop(1, '#1c5e3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(12,60,35,.55)';
    for (let i = 0; i < 6; i++){
      const cx = i * W / 5, cy = -20 + Math.sin(this.t * 0.4 + i) * 8;
      ctx.beginPath(); ctx.arc(cx, cy, 150, 0, 6.28); ctx.fill();
    }
    drawEmoji('🌳', W * 0.9, H * 0.42, 200);
    drawEmoji('🌴', W * 0.06, H * 0.5, 190);
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fffbd0';
    ctx.beginPath(); ctx.arc(W * 0.5 + Math.sin(this.t * 0.3) * 60, H * 0.35, 130, 0, 6.28); ctx.fill();
    ctx.restore();
    const p = this.parrot;
    const phit = Motion.nearest(p.x, p.y, 110);
    if (phit && p.flap <= 0){ p.flap = 1; Sound.chirp(); setTimeout(() => Sound.chirp(), 120); }
    p.flap = Math.max(0, p.flap - dt * 1.4);
    drawEmoji('🦜', p.x, p.y + (p.flap ? Math.sin(this.t * 20) * 8 * p.flap : Math.sin(this.t * 1.2) * 5), 80, p.flap * 0.3);
    const m = this.monkey;
    m.peek += ((Motion.energy > 0.25 ? 1 : 0) - m.peek) * dt * 2;
    if (m.peek > 0.05) drawEmoji('🐵', m.x, m.y + (1 - m.peek) * 60, 70 * clamp(m.peek + 0.3, 0, 1));
    for (const f of this.flowers){
      const hit = Motion.nearest(f.x, f.y, 100);
      if (hit && f.target < 1){ f.target = 1; Sound.marimba(); }
      if (!hit && f.bloom >= 0.99) f.target = 0.55;
      f.bloom += (f.target - f.bloom) * dt * 3;
      drawEmoji(f.e, f.x, f.y, 34 + f.bloom * 44, Math.sin(this.t * 2 + f.x) * 0.06 * f.bloom);
    }
    for (const b of this.butterflies){
      const hit = Motion.nearest(b.x, b.y, 120);
      if (hit && b.panic <= 0){
        b.panic = 1; Sound.squeak();
        const ang = Math.atan2(b.y - hit.y, b.x - hit.x);
        b.vx = Math.cos(ang) * 300; b.vy = Math.sin(ang) * 240;
        spawnParticle(b.x, b.y, '✨', { life: 0.5 });
      }
      b.panic = Math.max(0, b.panic - dt);
      b.vx += (Math.sin(this.t * 1.3 + b.ph) * 40 - b.vx) * dt;
      b.vy += (Math.cos(this.t * 1.7 + b.ph) * 30 - b.vy) * dt;
      b.x = (b.x + b.vx * dt + W) % W;
      b.y = clamp(b.y + b.vy * dt, H * 0.05, H * 0.8);
      drawEmoji(b.e, b.x, b.y + Math.sin(this.t * 8 + b.ph) * 5, 42, Math.sin(this.t * 6 + b.ph) * 0.25);
    }
  }
}

/* ---------- 4. Dino Valley ---------- */
class Dinos extends Scene {
  constructor(){
    super(); this.name = 'Dino Valley'; this.icon = '🦕'; this.avatar = 'dino';
    this.eggs = []; this.babies = []; this.smoke = [];
  }
  enter(){
    this.eggs = Array.from({ length: 3 }, (_, i) => ({
      x: W * (0.3 + i * 0.2) + rand(-20, 20), y: H - 70, cracks: 0, wob: 0, hatched: false, cool: 0
    }));
    this.babies = [];
    this.smoke = [];
    this.bigDino = { x: -100, dir: 1 };
    this.ptero = { x: W + 80, y: H * 0.18 };
    this.volcano = { x: W * 0.82, puff: 0 };
  }
  trailGlyph(){ return pick(['🌿','✨']); }
  update(dt){
    this.t += dt;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffb35c'); g.addColorStop(0.5, '#ff8c6b'); g.addColorStop(1, '#7c4a3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawEmoji('🌞', W * 0.15, H * 0.16, 90, this.t * 0.1);
    const v = this.volcano;
    ctx.fillStyle = '#5b3a33';
    ctx.beginPath(); ctx.moveTo(v.x - 150, H); ctx.lineTo(v.x, H * 0.35); ctx.lineTo(v.x + 150, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6b4a'; ctx.beginPath();
    ctx.moveTo(v.x - 26, H * 0.37); ctx.lineTo(v.x, H * 0.3); ctx.lineTo(v.x + 26, H * 0.37); ctx.closePath(); ctx.fill();
    const vhit = Motion.nearest(v.x, H * 0.38, 140);
    if (vhit && v.puff <= 0){
      v.puff = 1; Sound.rumble();
      for (let k = 0; k < 8; k++)
        this.smoke.push({ x: v.x + rand(-16, 16), y: H * 0.34, r: rand(14, 26), vy: rand(-90, -50), vx: rand(-25, 25), a: 0.8 });
    }
    v.puff = Math.max(0, v.puff - dt * 0.6);
    if (Math.random() < 0.02) this.smoke.push({ x: v.x, y: H * 0.34, r: rand(10, 16), vy: -40, vx: rand(-10, 10), a: 0.5 });
    for (let i = this.smoke.length - 1; i >= 0; i--){
      const s = this.smoke[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.r += 14 * dt; s.a -= dt * 0.35;
      if (s.a <= 0){ this.smoke.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = s.a; ctx.fillStyle = '#d9cfc7';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = '#6a8f3f'; ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(0, H - 44);
    for (let x = 0; x <= W; x += 80) ctx.quadraticCurveTo(x + 40, H - 62, x + 80, H - 44);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    drawEmoji('🌿', W * 0.08, H - 56, 44); drawEmoji('🌿', W * 0.55, H - 54, 38);
    this.bigDino.x += 26 * this.bigDino.dir * dt;
    if (this.bigDino.x > W + 120) this.bigDino.dir = -1;
    if (this.bigDino.x < -120) this.bigDino.dir = 1;
    drawEmoji('🦕', this.bigDino.x, H - 130 + Math.sin(this.t * 3) * 5, 130, 0, this.bigDino.dir < 0);
    this.ptero.x -= 60 * dt;
    if (this.ptero.x < -100){ this.ptero.x = W + rand(100, 500); this.ptero.y = rand(H * 0.1, H * 0.3); }
    drawEmoji('🦅', this.ptero.x, this.ptero.y + Math.sin(this.t * 4) * 10, 54, 0, true);
    for (const e of this.eggs){
      if (e.hatched){
        if (e.respawn !== undefined){
          e.respawn -= dt;
          if (e.respawn <= 0){ e.hatched = false; e.cracks = 0; e.respawn = undefined; }
        }
        continue;
      }
      e.cool = Math.max(0, e.cool - dt);
      const hit = Motion.nearest(e.x, e.y, 90);
      if (hit && e.cool <= 0){
        e.cool = 0.8; e.cracks++; e.wob = 1; Sound.crack();
        if (e.cracks >= 3){
          e.hatched = true; e.respawn = 14;
          Sound.twinkle(); Sound.boing();
          this.babies.push({ e: pick(['🦖','🦕','🐉']), x: e.x, y: e.y, vx: rand(-60, 60), vy: -260, size: 54 });
          for (let k = 0; k < 10; k++) spawnParticle(e.x, e.y, pick(['✨','🥚']), { life: 0.8 });
        }
      }
      e.wob = Math.max(0, e.wob - dt * 2);
      drawEmoji('🥚', e.x, e.y, 62, Math.sin(this.t * 24) * e.wob * 0.3);
      if (e.cracks > 0 && !e.hatched){
        ctx.strokeStyle = '#8a6d3b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (let c = 0; c < e.cracks; c++){
          ctx.beginPath();
          ctx.moveTo(e.x - 14 + c * 12, e.y - 18);
          ctx.lineTo(e.x - 8 + c * 12, e.y - 6);
          ctx.lineTo(e.x - 16 + c * 12, e.y + 4);
          ctx.stroke();
        }
      }
    }
    for (const b of this.babies){
      b.vy += 700 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > H - 70){ b.y = H - 70; b.vy = -rand(180, 320); Sound.squeak(); }
      if (b.x < 40 || b.x > W - 40) b.vx *= -1;
      drawEmoji(b.e, b.x, b.y, b.size, 0, b.vx < 0);
    }
    if (this.babies.length > 5) this.babies.shift();
  }
}

/* ---------- 5. Snow Day ---------- */
class Snow extends Scene {
  constructor(){
    super(); this.name = 'Snow Day'; this.icon = '⛄'; this.avatar = 'penguin';
    this.flakes = []; this.penguins = [];
  }
  enter(){
    this.flakes = Array.from({ length: REDUCED ? 80 : 170 }, () => ({
      x: rand(0, W), y: rand(0, H), r: rand(2, 5), v: rand(30, 80), vx: 0, drift: rand(0, 6)
    }));
    this.penguins = Array.from({ length: 3 }, (_, i) => ({
      x: W * (0.25 + i * 0.25), y: H - 60, vx: rand(-30, 30), slide: 0, panic: 0
    }));
    this.snowman = { x: W * 0.5, y: H - 120, wob: 0 };
  }
  trailGlyph(){ return '❄️'; }
  update(dt){
    this.t += dt;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#a8d8f0'); g.addColorStop(0.6, '#7fb8e8'); g.addColorStop(1, '#e8f4fb');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f4fafd'; ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(0, H * 0.75);
    ctx.quadraticCurveTo(W * 0.3, H * 0.6, W * 0.55, H * 0.78);
    ctx.quadraticCurveTo(W * 0.8, H * 0.94, W, H * 0.72);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    drawEmoji('🌲', W * 0.12, H * 0.68, 120); drawEmoji('🌲', W * 0.9, H * 0.6, 100);
    drawEmoji('🏔️', W * 0.75, H * 0.42, 170);
    const sm = this.snowman;
    const shit = Motion.nearest(sm.x, sm.y, 120);
    if (shit && sm.wob <= 0){
      sm.wob = 1; Sound.boing(); Sound.twinkle();
      for (let k = 0; k < 8; k++) spawnParticle(sm.x, sm.y - 60, '❄️', { life: 0.9 });
    }
    sm.wob = Math.max(0, sm.wob - dt * 1.4);
    drawEmoji('⛄', sm.x, sm.y, 130, Math.sin(this.t * 16) * sm.wob * 0.25);
    for (const p of this.penguins){
      const hit = Motion.nearest(p.x, p.y, 110);
      if (hit && p.panic <= 0){
        p.panic = 1; Sound.squeak();
        p.vx = (p.x < hit.x ? -1 : 1) * 220; p.slide = 1;
      }
      p.panic = Math.max(0, p.panic - dt); p.slide = Math.max(0, p.slide - dt);
      p.vx += ((Math.sin(this.t * 0.6 + p.x) * 30) - p.vx) * dt * 0.9;
      p.x = clamp(p.x + p.vx * dt, 40, W - 40);
      const hop = p.slide > 0 ? 0 : Math.abs(Math.sin(this.t * 6 + p.x)) * 8;
      drawEmoji('🐧', p.x, p.y - hop, 60, p.slide > 0 ? (p.vx > 0 ? 1.2 : -1.2) : 0, p.vx > 0);
    }
    for (const f of this.flakes){
      const hit = Motion.nearest(f.x, f.y, 90);
      if (hit){
        const d = Math.max(20, Math.sqrt(dist2(f.x, f.y, hit.x, hit.y)));
        f.vx += ((f.x - hit.x) / d) * 900 * dt;
        f.v = Math.max(f.v, 100);
      }
      f.vx *= (1 - dt * 1.5);
      f.x += (f.vx + Math.sin(this.t + f.drift) * 20) * dt;
      f.y += f.v * dt;
      if (f.y > H + 8){ f.y = -8; f.x = rand(0, W); f.v = rand(30, 80); f.vx = 0; }
      if (f.x < -8) f.x = W + 8; if (f.x > W + 8) f.x = -8;
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
