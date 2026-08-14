'use strict';
/* Wiggle World - pose tracking via TensorFlow.js MoveNet (single pose).
   Runs fully on-device. Maps video keypoints to mirrored screen space,
   smooths them, and injects hand/head points into the Motion system so
   scene creatures react to actual body parts.
   If the model can't load (offline, old device), Pose.failed goes true
   and avatars fall back to a motion-following blob. */

const Pose = {
  detector: null, ready: false, failed: false, loading: false,
  pts: {},            // name -> {x, y, c} in screen coords, smoothed
  lastSeen: 0,        // seconds timestamp of last confident detection
  inferMs: 20, skipFrames: 0, frame: 0,
  MIN_C: 0.3,

  async init(){
    if (this.loading || this.ready || this.failed) return;
    this.loading = true;
    try {
      if (typeof tf === 'undefined' || typeof poseDetection === 'undefined')
        throw new Error('pose libraries not loaded');
      await tf.ready();
      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      this.ready = true;
    } catch (err){
      console.warn('Pose model unavailable, falling back to motion blob:', err);
      this.failed = true;
    }
    this.loading = false;
  },

  async update(video, W, H, t){
    if (!this.ready || !video || video.readyState < 2) return;
    this.frame++;
    if (this.skipFrames && this.frame % (this.skipFrames + 1) !== 0) return;
    const t0 = performance.now();
    let poses;
    try { poses = await this.detector.estimatePoses(video); }
    catch (err){ return; }
    this.inferMs = this.inferMs * 0.8 + (performance.now() - t0) * 0.2;
    // Adapt: if inference is slow on this device, run every other frame
    this.skipFrames = this.inferMs > 42 ? 1 : 0;

    if (!poses || !poses.length) return;
    const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
    let any = false;
    for (const kp of poses[0].keypoints){
      const name = kp.name || kp.part;
      const sx = (1 - kp.x / vw) * W;   // mirrored to match the screen
      const sy = (kp.y / vh) * H;
      const prev = this.pts[name];
      if (kp.score >= this.MIN_C){
        any = true;
        if (prev){
          const a = 0.45; // smoothing
          prev.x += (sx - prev.x) * a; prev.y += (sy - prev.y) * a; prev.c = kp.score;
        } else {
          this.pts[name] = { x: sx, y: sy, c: kp.score };
        }
      } else if (prev){
        prev.c *= 0.9; // fade confidence when lost
      }
    }
    if (any) this.lastSeen = t;
  },

  get(name){
    const p = this.pts[name];
    return (p && p.c >= this.MIN_C * 0.6) ? p : null;
  },

  seen(t){ return this.ready && (t - this.lastSeen) < 1.2; },

  // Push body-part points into Motion so creatures react to hands and head
  injectPoints(points){
    if (!this.ready) return;
    for (const name of ['left_wrist', 'right_wrist', 'nose', 'left_ankle', 'right_ankle']){
      const p = this.get(name);
      if (p && points.length < 160) points.push({ x: p.x, y: p.y, s: 1 });
    }
  }
};
