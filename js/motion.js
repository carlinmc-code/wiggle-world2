'use strict';
/* Wiggle World - frame-differencing motion tracker.
   Cheap, robust, works for any number of people. Drives particles and
   scene reactions. Pose keypoints get injected on top of these points. */

const Motion = {
  video: null,
  gw: 64, gh: 48, prev: null, off: null, octx: null,
  points: [], energy: 0, threshold: 26, ready: false, touchMode: false,
  touchPts: [],

  async startCamera(){
    this.video = document.getElementById('cam');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false
    });
    this.video.srcObject = stream;
    const prev = document.getElementById('preview');
    prev.srcObject = stream;
    await this.video.play();
    prev.play().catch(() => {});
    this.off = document.createElement('canvas');
    this.off.width = this.gw; this.off.height = this.gh;
    this.octx = this.off.getContext('2d', { willReadFrequently: true });
    this.ready = true;
  },

  sample(W, H){
    this.points.length = 0; this.energy = 0;
    if (this.touchMode){
      const now = performance.now();
      this.touchPts = this.touchPts.filter(p => now - p.t < 350);
      for (const p of this.touchPts) this.points.push({ x: p.x, y: p.y, s: 1 });
      this.energy = this.points.length ? 0.4 : 0;
      return;
    }
    if (!this.ready || this.video.readyState < 2) return;
    this.octx.drawImage(this.video, 0, 0, this.gw, this.gh);
    const data = this.octx.getImageData(0, 0, this.gw, this.gh).data;
    const n = this.gw * this.gh;
    if (!this.prev) this.prev = new Uint8ClampedArray(n);
    let hits = 0;
    for (let i = 0; i < n; i++){
      const j = i * 4;
      const gray = (data[j] * 3 + data[j + 1] * 4 + data[j + 2]) >> 3;
      const diff = Math.abs(gray - this.prev[i]);
      this.prev[i] = gray;
      if (diff > this.threshold){
        hits++;
        if (this.points.length < 140){
          const gx = i % this.gw, gy = (i / this.gw) | 0;
          // Mirror horizontally so movement matches the screen
          this.points.push({ x: (1 - gx / this.gw) * W, y: (gy / this.gh) * H, s: diff / 255 });
        }
      }
    }
    this.energy = Math.min(1, hits / (n * 0.12));
  },

  nearest(x, y, radius){
    const r2 = radius * radius; let best = null, bd = r2;
    for (const p of this.points){
      const dx = x - p.x, dy = y - p.y, d = dx * dx + dy * dy;
      if (d < bd){ bd = d; best = p; }
    }
    return best;
  }
};
