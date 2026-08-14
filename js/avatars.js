'use strict';
/* Wiggle World - avatar renderers.
   Every avatar is drawn from the same rig built out of Pose keypoints:
   head, shoulders, elbows, wrists, hips, knees, ankles.
   Types: 'scene' (per-scene character), 'stick', 'smiley', 'none'.
   If pose tracking is unavailable, a bouncy blob face follows the
   motion centroid so the feature still "works" everywhere. */

const Avatars = {
  type: 'scene',
  blob: { x: 0, y: 0, vx: 0, vy: 0 },

  /* ---------- rig helpers ---------- */
  buildRig(t){
    const g = n => Pose.get(n);
    const mid = (a, b) => (a && b) ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : (a || b);
    const LS = g('left_shoulder'), RS = g('right_shoulder');
    const LH = g('left_hip'), RH = g('right_hip');
    const nose = g('nose');
    const chest = mid(LS, RS), pelvis = mid(LH, RH);
    if (!chest) return null;
    const u = (LS && RS) ? Math.max(46, Math.min(230, Math.hypot(LS.x - RS.x, LS.y - RS.y))) : 90;
    const head = nose ? { x: nose.x, y: nose.y - u * 0.12 } : { x: chest.x, y: chest.y - u * 0.85 };
    return {
      t, u, head, chest, pelvis: pelvis || { x: chest.x, y: chest.y + u * 1.15 },
      LS, RS, LH, RH,
      LE: g('left_elbow'), RE: g('right_elbow'),
      LW: g('left_wrist'), RW: g('right_wrist'),
      LK: g('left_knee'), RK: g('right_knee'),
      LA: g('left_ankle'), RA: g('right_ankle')
    };
  },

  limb(ctx, a, b, w, color, wig = 0, ph = 0, t = 0){
    if (!a || !b) return;
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    if (wig){
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const off = Math.sin(t * 9 + ph) * wig;
      ctx.quadraticCurveTo(mx - dy / len * off, my + dx / len * off, b.x, b.y);
    } else {
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  },

  chain(ctx, pts, w, color, wig, t, ph){
    // Draw shoulder->elbow->wrist (or hip->knee->ankle) with graceful fallbacks
    const solid = pts.filter(Boolean);
    if (solid.length < 2) return;
    for (let i = 0; i < solid.length - 1; i++)
      this.limb(ctx, solid[i], solid[i + 1], w, color, wig, ph + i, t);
  },

  face(ctx, x, y, r, opts = {}){
    const eye = r * 0.16, ey = y - r * 0.12, ex = r * 0.38;
    ctx.fillStyle = opts.eye || '#101426';
    ctx.beginPath(); ctx.arc(x - ex, ey, eye, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(x + ex, ey, eye, 0, 6.28); ctx.fill();
    ctx.strokeStyle = opts.eye || '#101426'; ctx.lineWidth = Math.max(2.5, r * 0.09); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.45, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    if (opts.cheeks){
      ctx.fillStyle = 'rgba(255,120,150,.4)';
      ctx.beginPath(); ctx.arc(x - r * 0.55, y + r * 0.15, r * 0.16, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.55, y + r * 0.15, r * 0.16, 0, 6.28); ctx.fill();
    }
  },

  headCircle(ctx, x, y, r, fill, stroke){
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
    if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(3, r * 0.1); ctx.stroke(); }
  },

  torso(ctx, rig, color, widen = 1){
    const w = rig.u * 0.62 * widen;
    this.limb(ctx, rig.chest, rig.pelvis, w, color);
  },

  /* ---------- avatar types ---------- */
  drawStick(ctx, rig, palette){
    const c = palette.stick || '#FFFFFF';
    const t = rig.t, w = Math.max(7, rig.u * 0.14);
    this.chain(ctx, [rig.LS, rig.LE, rig.LW], w, c, 0, t, 0);
    this.chain(ctx, [rig.RS, rig.RE, rig.RW], w, c, 0, t, 2);
    this.chain(ctx, [rig.LH, rig.LK, rig.LA], w, c, 0, t, 4);
    this.chain(ctx, [rig.RH, rig.RK, rig.RA], w, c, 0, t, 6);
    this.limb(ctx, rig.chest, rig.pelvis, w, c);
    if (rig.LS && rig.RS) this.limb(ctx, rig.LS, rig.RS, w, c);
    const r = rig.u * 0.42;
    this.headCircle(ctx, rig.head.x, rig.head.y - r * 0.4, r, 'rgba(0,0,0,0)', c);
    this.face(ctx, rig.head.x, rig.head.y - r * 0.4, r, { eye: c });
    this.hands(ctx, rig, c);
  },

  drawSmiley(ctx, rig, palette){
    const t = rig.t, u = rig.u;
    const armW = Math.max(9, u * 0.17), wig = u * 0.3;
    const yellow = '#FFD24A', outline = '#E3A81E';
    // noodle limbs
    this.chain(ctx, [rig.LS, rig.LW], armW, yellow, wig, t, 0);
    this.chain(ctx, [rig.RS, rig.RW], armW, yellow, wig, t, 2.4);
    this.chain(ctx, [rig.LH, rig.LA], armW, yellow, wig * 0.6, t, 4.1);
    this.chain(ctx, [rig.RH, rig.RA], armW, yellow, wig * 0.6, t, 5.6);
    // gloves and boots
    this.hands(ctx, rig, '#FFFFFF', u * 0.16);
    for (const f of [rig.LA, rig.RA]) if (f){
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(f.x, f.y, u * 0.15, 0, 6.28); ctx.fill();
    }
    // giant head over the whole body center
    const hx = rig.head.x, hy = rig.head.y + u * 0.15, r = u * 0.85;
    this.headCircle(ctx, hx, hy, r, yellow, outline);
    this.face(ctx, hx, hy, r, { cheeks: true });
  },

  hands(ctx, rig, color, size){
    for (const h of [rig.LW, rig.RW]) if (h){
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(h.x, h.y, size || Math.max(6, rig.u * 0.12), 0, 6.28); ctx.fill();
    }
  },

  /* ---------- scene characters ---------- */
  drawDiver(ctx, rig){
    const t = rig.t, u = rig.u, suit = '#FF7A3D', dark = '#D95B22';
    this.chain(ctx, [rig.LS, rig.LE, rig.LW], u * 0.18, suit, 0, t, 0);
    this.chain(ctx, [rig.RS, rig.RE, rig.RW], u * 0.18, suit, 0, t, 2);
    this.chain(ctx, [rig.LH, rig.LK, rig.LA], u * 0.18, suit, 0, t, 4);
    this.chain(ctx, [rig.RH, rig.RK, rig.RA], u * 0.18, suit, 0, t, 6);
    // flippers
    for (const f of [rig.LA, rig.RA]) if (f){
      ctx.fillStyle = '#4ADE80';
      ctx.beginPath(); ctx.ellipse(f.x, f.y + u * 0.08, u * 0.28, u * 0.13, Math.sin(t * 6) * 0.2, 0, 6.28); ctx.fill();
    }
    this.torso(ctx, rig, suit);
    // tank
    ctx.fillStyle = '#C4CDD8';
    ctx.beginPath(); ctx.ellipse(rig.chest.x - u * 0.42, rig.chest.y + u * 0.2, u * 0.14, u * 0.4, 0.15, 0, 6.28); ctx.fill();
    const r = u * 0.44, hx = rig.head.x, hy = rig.head.y - r * 0.35;
    this.headCircle(ctx, hx, hy, r, '#FFD9B8', dark);
    // mask
    ctx.fillStyle = 'rgba(120,210,255,.85)'; ctx.strokeStyle = dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(hx - r * 0.7, hy - r * 0.5, r * 1.4, r * 0.62, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#101426';
    ctx.beginPath(); ctx.arc(hx - r * 0.32, hy - r * 0.2, r * 0.12, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + r * 0.32, hy - r * 0.2, r * 0.12, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#101426'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(hx, hy + r * 0.35, r * 0.28, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    // bubbles from the head
    if (Math.random() < 0.12) spawnParticle(hx + r * 0.8, hy - r * 0.4, '🫧', { vy: -70, life: 0.9, size: 14 });
    this.hands(ctx, rig, '#FFD9B8');
  },

  drawAstronaut(ctx, rig){
    const t = rig.t, u = rig.u, suit = '#F2F5F9', shade = '#B9C4D6';
    this.chain(ctx, [rig.LS, rig.LE, rig.LW], u * 0.2, suit, 0, t, 0);
    this.chain(ctx, [rig.RS, rig.RE, rig.RW], u * 0.2, suit, 0, t, 2);
    this.chain(ctx, [rig.LH, rig.LK, rig.LA], u * 0.2, suit, 0, t, 4);
    this.chain(ctx, [rig.RH, rig.RK, rig.RA], u * 0.2, suit, 0, t, 6);
    this.torso(ctx, rig, suit, 1.1);
    // chest panel
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.roundRect(rig.chest.x - u * 0.18, rig.chest.y + u * 0.05, u * 0.36, u * 0.3, 6); ctx.fill();
    ctx.fillStyle = '#FF6FA5'; ctx.fillRect(rig.chest.x - u * 0.12, rig.chest.y + u * 0.12, u * 0.1, u * 0.08);
    ctx.fillStyle = '#38BDF8'; ctx.fillRect(rig.chest.x + 2, rig.chest.y + u * 0.12, u * 0.1, u * 0.08);
    // helmet with face inside
    const r = u * 0.5, hx = rig.head.x, hy = rig.head.y - r * 0.3;
    this.headCircle(ctx, hx, hy, r, suit, shade);
    ctx.fillStyle = '#1b2a4a';
    ctx.beginPath(); ctx.arc(hx, hy, r * 0.72, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#FFD9B8';
    ctx.beginPath(); ctx.arc(hx, hy + r * 0.08, r * 0.5, 0, 6.28); ctx.fill();
    this.face(ctx, hx, hy + r * 0.08, r * 0.5);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx - r * 0.25, hy - r * 0.3, r * 0.22, 3.6, 5.2); ctx.stroke();
    // gloves
    this.hands(ctx, rig, '#FFFFFF', u * 0.15);
    if (Motion.energy > 0.3 && Math.random() < 0.15)
      spawnParticle(rig.pelvis.x, rig.pelvis.y + u * 0.5, '✨', { vy: 60, life: 0.5, size: 14 });
  },

  drawMonkey(ctx, rig){
    const t = rig.t, u = rig.u, fur = '#8B5A3C', belly = '#E8C9A8';
    this.chain(ctx, [rig.LS, rig.LE, rig.LW], u * 0.17, fur, 0, t, 0);
    this.chain(ctx, [rig.RS, rig.RE, rig.RW], u * 0.17, fur, 0, t, 2);
    this.chain(ctx, [rig.LH, rig.LK, rig.LA], u * 0.17, fur, 0, t, 4);
    this.chain(ctx, [rig.RH, rig.RK, rig.RA], u * 0.17, fur, 0, t, 6);
    // tail: curly line from the pelvis, waving with energy
    const p = rig.pelvis;
    ctx.strokeStyle = fur; ctx.lineWidth = u * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    const sway = Math.sin(t * 4) * u * 0.35;
    ctx.bezierCurveTo(p.x + u * 0.5, p.y + u * 0.2, p.x + u * 0.75 + sway, p.y - u * 0.3, p.x + u * 0.6 + sway, p.y - u * 0.65);
    ctx.stroke();
    this.torso(ctx, rig, fur);
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(rig.chest.x, (rig.chest.y + rig.pelvis.y) / 2, u * 0.2, u * 0.34, 0, 0, 6.28); ctx.fill();
    // head + ears
    const r = u * 0.45, hx = rig.head.x, hy = rig.head.y - r * 0.3;
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.arc(hx - r * 0.95, hy, r * 0.34, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + r * 0.95, hy, r * 0.34, 0, 6.28); ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.arc(hx - r * 0.95, hy, r * 0.18, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + r * 0.95, hy, r * 0.18, 0, 6.28); ctx.fill();
    this.headCircle(ctx, hx, hy, r, fur);
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(hx, hy + r * 0.15, r * 0.62, r * 0.55, 0, 0, 6.28); ctx.fill();
    this.face(ctx, hx, hy + r * 0.05, r * 0.7);
    this.hands(ctx, rig, belly);
  },

  drawDino(ctx, rig){
    const t = rig.t, u = rig.u, skin = '#5CB85C', dark = '#3E8E41', spike = '#FFD24A';
    this.chain(ctx, [rig.LS, rig.LE, rig.LW], u * 0.18, skin, 0, t, 0);
    this.chain(ctx, [rig.RS, rig.RE, rig.RW], u * 0.18, skin, 0, t, 2);
    this.chain(ctx, [rig.LH, rig.LK, rig.LA], u * 0.2, skin, 0, t, 4);
    this.chain(ctx, [rig.RH, rig.RK, rig.RA], u * 0.2, skin, 0, t, 6);
    // tail
    const p = rig.pelvis, sway = Math.sin(t * 3) * u * 0.25;
    ctx.strokeStyle = skin; ctx.lineWidth = u * 0.22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x - u * 0.6, p.y + u * 0.25, p.x - u * 0.95 - sway, p.y + u * 0.05);
    ctx.stroke();
    this.torso(ctx, rig, skin, 1.1);
    ctx.fillStyle = '#CDEBB0';
    ctx.beginPath(); ctx.ellipse(rig.chest.x, (rig.chest.y + rig.pelvis.y) / 2, u * 0.2, u * 0.36, 0, 0, 6.28); ctx.fill();
    // spikes along the spine
    ctx.fillStyle = spike;
    for (let i = 0; i < 4; i++){
      const k = i / 3, sx = rig.head.x + (rig.pelvis.x - rig.head.x) * k,
            sy = (rig.head.y - u * 0.25) + (rig.pelvis.y - rig.head.y + u * 0.25) * k;
      ctx.beginPath();
      ctx.moveTo(sx - u * 0.1, sy); ctx.lineTo(sx, sy - u * 0.2); ctx.lineTo(sx + u * 0.1, sy);
      ctx.closePath(); ctx.fill();
    }
    const r = u * 0.48, hx = rig.head.x, hy = rig.head.y - r * 0.25;
    this.headCircle(ctx, hx, hy, r, skin, dark);
    this.face(ctx, hx, hy, r, { cheeks: true });
    // nostrils
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(hx - r * 0.16, hy + r * 0.42, r * 0.06, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + r * 0.16, hy + r * 0.42, r * 0.06, 0, 6.28); ctx.fill();
    this.hands(ctx, rig, '#CDEBB0');
  },

  drawPenguin(ctx, rig){
    const t = rig.t, u = rig.u, body = '#20263B', belly = '#F7FAFF', orange = '#FF9330';
    // flipper arms (no elbows, penguins keep it simple)
    this.chain(ctx, [rig.LS, rig.LW], u * 0.2, body, u * 0.12, t, 0);
    this.chain(ctx, [rig.RS, rig.RW], u * 0.2, body, u * 0.12, t, 2);
    this.chain(ctx, [rig.LH, rig.LA], u * 0.16, body, 0, t, 4);
    this.chain(ctx, [rig.RH, rig.RA], u * 0.16, body, 0, t, 6);
    // orange feet
    for (const f of [rig.LA, rig.RA]) if (f){
      ctx.fillStyle = orange;
      ctx.beginPath(); ctx.ellipse(f.x, f.y + u * 0.06, u * 0.2, u * 0.1, 0, 0, 6.28); ctx.fill();
    }
    // egg-shaped body
    const cx = (rig.chest.x + rig.pelvis.x) / 2, cy = (rig.chest.y + rig.pelvis.y) / 2;
    const bh = Math.max(u * 0.9, Math.hypot(rig.chest.x - rig.pelvis.x, rig.chest.y - rig.pelvis.y) * 0.85);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(cx, cy, u * 0.5, bh, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(cx, cy + bh * 0.1, u * 0.34, bh * 0.75, 0, 0, 6.28); ctx.fill();
    const r = u * 0.44, hx = rig.head.x, hy = rig.head.y - r * 0.2;
    this.headCircle(ctx, hx, hy, r, body);
    ctx.fillStyle = belly;
    ctx.beginPath(); ctx.ellipse(hx, hy + r * 0.18, r * 0.6, r * 0.52, 0, 0, 6.28); ctx.fill();
    this.face(ctx, hx, hy + r * 0.05, r * 0.7);
    // beak
    ctx.fillStyle = orange;
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.16, hy + r * 0.32); ctx.lineTo(hx + r * 0.16, hy + r * 0.32);
    ctx.lineTo(hx, hy + r * 0.58); ctx.closePath(); ctx.fill();
    this.hands(ctx, rig, body, u * 0.13);
  },

  /* ---------- fallback blob when pose tracking is unavailable ---------- */
  drawBlob(ctx, t, dt, W, H){
    if (!Motion.points.length && !this.blob.x) return;
    let tx = this.blob.x || W / 2, ty = this.blob.y || H / 2;
    if (Motion.points.length){
      let sx = 0, sy = 0;
      for (const p of Motion.points){ sx += p.x; sy += p.y; }
      tx = sx / Motion.points.length; ty = sy / Motion.points.length;
    }
    const b = this.blob;
    if (!b.x){ b.x = tx; b.y = ty; }
    b.vx += (tx - b.x) * 8 * dt; b.vy += (ty - b.y) * 8 * dt;
    b.vx *= 0.86; b.vy *= 0.86;
    b.x += b.vx * dt * 8; b.y += b.vy * dt * 8;
    const squish = 1 + Math.min(0.25, (Math.abs(b.vx) + Math.abs(b.vy)) / 900);
    const r = 60;
    ctx.save();
    ctx.translate(b.x, b.y); ctx.scale(squish, 2 - squish);
    this.headCircle(ctx, 0, 0, r, '#FFD24A', '#E3A81E');
    this.face(ctx, 0, 0, r, { cheeks: true });
    ctx.restore();
  },

  /* ---------- main entry ---------- */
  render(ctx, sceneAvatar, t, dt, W, H){
    if (this.type === 'none') return;
    if (Pose.failed){ this.drawBlob(ctx, t, dt, W, H); return; }
    if (!Pose.seen(t)) return;
    const rig = this.buildRig(t);
    if (!rig) return;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    const kind = this.type === 'scene' ? sceneAvatar : this.type;
    if (kind === 'stick') this.drawStick(ctx, rig, { stick: '#FFFFFF' });
    else if (kind === 'smiley') this.drawSmiley(ctx, rig, {});
    else if (kind === 'diver') this.drawDiver(ctx, rig);
    else if (kind === 'astronaut') this.drawAstronaut(ctx, rig);
    else if (kind === 'monkey') this.drawMonkey(ctx, rig);
    else if (kind === 'dino') this.drawDino(ctx, rig);
    else if (kind === 'penguin') this.drawPenguin(ctx, rig);
    else this.drawSmiley(ctx, rig, {});
    ctx.restore();
  }
};
