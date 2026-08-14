'use strict';
/* Wiggle World - main shell. Wires the UI, runs the loop, and lets the
   child pick how they show up on screen. v2.0.0 */

const scenes = [new Ocean(), new Space(), new Jungle(), new Dinos(), new Snow()];
const AVATAR_CYCLE = ['scene', 'stick', 'smiley', 'none'];
const AVATAR_LABELS = { scene: 'Scene Character', stick: 'Stick Figure', smiley: 'Wiggly Smiley', none: 'Just Sparkles' };
const AVATAR_ICONS = { scene: '🎭', stick: '🖍️', smiley: '😄', none: '✨' };
let current = 0, autoSwitch = false, autoTimer = 0, running = false, lastT = 0, elapsed = 0;

/* ---------- saved settings (this runs on a real site, storage is fine) ---------- */
function save(k, v){ try { localStorage.setItem('ww_' + k, v); } catch (e) {} }
function load(k){ try { return localStorage.getItem('ww_' + k); } catch (e) { return null; } }

function toast(msg, ms = 2600){
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

function setScene(i){
  current = (i + scenes.length) % scenes.length;
  particles.length = 0;
  scenes[current].enter();
  document.querySelectorAll('.scenebtn').forEach((b, k) => b.classList.toggle('active', k === current));
  const nameEl = document.getElementById('sceneName');
  nameEl.textContent = scenes[current].icon + ' ' + scenes[current].name;
  nameEl.classList.add('flash');
  clearTimeout(nameEl._t);
  nameEl._t = setTimeout(() => nameEl.classList.remove('flash'), 2200);
  Sound.twinkle();
}

function setAvatar(type, announce){
  Avatars.type = type;
  save('avatar', type);
  document.querySelectorAll('.avbtn').forEach(b => b.classList.toggle('active', b.dataset.av === type));
  const btn = document.getElementById('avatarBtn');
  if (btn) btn.textContent = AVATAR_ICONS[type];
  if (announce) toast(AVATAR_ICONS[type] + ' ' + AVATAR_LABELS[type]);
}

/* ---------- main loop ---------- */
function loop(t){
  if (!running) return;
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t; elapsed += dt;

  Motion.sample(W, H);
  Pose.update(Motion.video, W, H, elapsed);   // async; updates tracked people when ready
  Pose.injectPoints(Motion.points, elapsed);  // everyone's hands and heads count as wiggle points

  scenes[current].update(dt);
  Avatars.render(ctx, scenes[current].avatar, elapsed, dt, W, H);

  if (particles.length < MAX_TRAIL){
    for (let i = 0; i < Motion.points.length; i += 6){
      const p = Motion.points[i];
      if (Math.random() < 0.5)
        spawnParticle(p.x, p.y, scenes[current].trailGlyph(), { life: rand(0.5, 1), size: rand(12, 22) });
    }
  }
  updateParticles(dt);

  if (autoSwitch){
    autoTimer += dt;
    if (autoTimer > 90){ autoTimer = 0; setScene(current + 1); }
  }
  requestAnimationFrame(loop);
}

/* ---------- UI wiring ---------- */
const dock = document.getElementById('dock');
scenes.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'scenebtn'; b.textContent = s.icon; b.title = s.name;
  b.addEventListener('click', () => { setScene(i); autoTimer = 0; });
  dock.insertBefore(b, dock.firstChild);
});

let uiTimer;
function showUI(){
  document.body.classList.add('ui-visible');
  clearTimeout(uiTimer);
  uiTimer = setTimeout(() => {
    document.body.classList.remove('ui-visible');
    document.getElementById('settings').classList.remove('open');
  }, 5000);
}
['pointermove', 'pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, showUI));

canvas.addEventListener('pointerdown', e => Motion.touchPts.push({ x: e.clientX, y: e.clientY, t: performance.now() }));
canvas.addEventListener('pointermove', e => {
  if (e.buttons || e.pointerType === 'touch') Motion.touchPts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
});

async function start(touchMode){
  Sound.init();
  if (Sound.ctx && Sound.ctx.state === 'suspended') Sound.ctx.resume();
  Motion.touchMode = touchMode;
  if (!touchMode){
    try { await Motion.startCamera(); }
    catch (err){
      document.getElementById('setupErr').style.display = 'block';
      return;
    }
  }
  document.getElementById('setup').style.display = 'none';
  running = true; lastT = performance.now();
  setScene(0);
  requestAnimationFrame(loop);
  showUI();

  // Load the pose model in the background; the game is already playable
  if (!touchMode && Avatars.type !== 'none'){
    toast('✨ Waking up the magic mirror...', 4000);
    Pose.init().then(() => {
      if (Pose.ready){
        toast('🪞 Magic mirror ready! Strike a pose!');
        if (load('multi') === '1') setMulti(true, false);
      }
      else if (Pose.failed) toast('Avatar tracking unavailable here, sparkles still work!');
    });
  }
}

document.getElementById('startBtn').addEventListener('click', () => start(false));
document.getElementById('touchBtn').addEventListener('click', () => start(true));

document.querySelectorAll('.avbtn').forEach(b =>
  b.addEventListener('click', () => setAvatar(b.dataset.av, false)));

document.getElementById('avatarBtn').addEventListener('click', () => {
  const next = AVATAR_CYCLE[(AVATAR_CYCLE.indexOf(Avatars.type) + 1) % AVATAR_CYCLE.length];
  setAvatar(next, true);
  if (next !== 'none' && !Pose.ready && !Pose.loading && !Motion.touchMode) Pose.init();
});

async function setMulti(on, announce){
  const btn = document.getElementById('multiBtn');
  btn.textContent = on ? '👥' : '👤';
  btn.classList.toggle('on', on);
  save('multi', on ? '1' : '0');
  if (on && Pose.ready && !Pose.detMulti && announce) toast('👥 Inviting everyone in...', 3000);
  await Pose.setMode(on ? 'multi' : 'single');
  if (announce){
    if (on) toast(Pose.detMulti ? '👥 Everyone can play! Up to 4 wigglers' : 'Multi mode unavailable on this device');
    else toast('👤 Solo mode');
  }
}
document.getElementById('multiBtn').addEventListener('click', () => setMulti(Pose.mode !== 'multi', true));

document.getElementById('fsBtn').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
});
document.getElementById('previewBtn').addEventListener('click', e => {
  document.body.classList.toggle('show-preview');
  e.currentTarget.classList.toggle('on');
});
document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('settings').classList.toggle('open');
  showUI();
});
document.getElementById('sens').addEventListener('input', e => {
  Motion.threshold = 70 - Number(e.target.value);
  save('sens', e.target.value);
});
document.getElementById('autoToggle').addEventListener('click', e => {
  autoSwitch = !autoSwitch; autoTimer = 0;
  e.currentTarget.classList.toggle('on', autoSwitch);
});
document.getElementById('soundToggle').addEventListener('click', e => {
  Sound.on = !Sound.on;
  e.currentTarget.classList.toggle('on', Sound.on);
});
window.addEventListener('keydown', e => {
  const n = Number(e.key);
  if (n >= 1 && n <= 5){ setScene(n - 1); autoTimer = 0; }
  if (e.key === 'a' || e.key === 'A') document.getElementById('avatarBtn').click();
});

/* ---------- restore saved settings ---------- */
(function restore(){
  const av = load('avatar');
  if (av && AVATAR_CYCLE.includes(av)) setAvatar(av, false);
  else setAvatar('scene', false);
  const s = load('sens');
  if (s){ document.getElementById('sens').value = s; Motion.threshold = 70 - Number(s); }
})();
