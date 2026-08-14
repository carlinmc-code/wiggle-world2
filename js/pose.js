'use strict';
/* Wiggle World - pose tracking via TensorFlow.js MoveNet. v2.1
   Two detectors: SinglePose Lightning (fast, default) and MultiPose
   Lightning with tracking (up to 4 people, toggled from the dock).
   Each tracked person gets smoothed keypoints under a stable ID, so
   siblings keep their own characters as they move around. */

const Pose = {
  detSingle: null, detMulti: null,
  mode: 'single',                 // 'single' | 'multi'
  ready: false, failed: false, loading: false, multiLoading: false,
  people: new Map(),              // id -> { pts: {name:{x,y,c}}, lastSeen }
  inferMs: 20, skipFrames: 0, frame: 0,
  MIN_C: 0.3, MAX_PEOPLE: 4,

  async init(){
    if (this.loading || this.ready || this.failed) return;
    this.loading = true;
    try {
      if (typeof tf === 'undefined' || typeof poseDetection === 'undefined')
        throw new Error('pose libraries not loaded');
      await tf.ready();
      this.detSingle = await poseDetection.createDetector(
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

  async enableMulti(){
    if (this.detMulti || this.multiLoading || this.failed) return this.detMulti;
    this.multiLoading = true;
    try {
      this.detMulti = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
          enableTracking: true, trackerType: poseDetection.TrackerType.BoundingBox }
      );
    } catch (err){
      console.warn('Multi-pose model failed to load:', err);
    }
    this.multiLoading = false;
    return this.detMulti;
  },

  async setMode(mode){
    this.mode = mode;
    if (mode === 'multi' && !this.detMulti) await this.enableMulti();
    this.people.clear();
  },

  detector(){
    return (this.mode === 'multi' && this.detMulti) ? this.detMulti : this.detSingle;
  },

  async update(video, W, H, t){
    const det = this.detector();
    if (!this.ready || !det || !video || video.readyState < 2) return;
    this.frame++;
    if (this.skipFrames && this.frame % (this.skipFrames + 1) !== 0) return;
    const t0 = performance.now();
    let poses;
    try { poses = await det.estimatePoses(video); }
    catch (err){ return; }
    this.inferMs = this.inferMs * 0.8 + (performance.now() - t0) * 0.2;
    // Adapt: multi is heavier; skip frames sooner if this device is slow
    this.skipFrames = this.inferMs > (this.mode === 'multi' ? 34 : 42) ? 1 : 0;

    if (!poses) poses = [];
    const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
    // Strongest people first, capped
    poses.sort((a, b) => (b.score || 0) - (a.score || 0));
    poses = poses.slice(0, this.mode === 'multi' ? this.MAX_PEOPLE : 1);

    poses.forEach((pose, i) => {
      const id = this.mode === 'multi' ? (pose.id !== undefined ? pose.id : 'p' + i) : 0;
      let person = this.people.get(id);
      if (!person){ person = { pts: {}, lastSeen: 0 }; this.people.set(id, person); }
      let any = false;
      for (const kp of pose.keypoints){
        const name = kp.name || kp.part;
        const sx = (1 - kp.x / vw) * W;   // mirrored to match the screen
        const sy = (kp.y / vh) * H;
        const prev = person.pts[name];
        if (kp.score >= this.MIN_C){
          any = true;
          if (prev){
            const a = 0.45;
            prev.x += (sx - prev.x) * a; prev.y += (sy - prev.y) * a; prev.c = kp.score;
          } else person.pts[name] = { x: sx, y: sy, c: kp.score };
        } else if (prev) prev.c *= 0.9;
      }
      if (any) person.lastSeen = t;
    });

    // prune people who left the frame
    for (const [id, person] of this.people)
      if (t - person.lastSeen > 1.5) this.people.delete(id);
  },

  peopleList(t){
    const out = [];
    for (const [id, person] of this.people)
      if (t - person.lastSeen < 1.2) out.push({ id, pts: person.pts });
    // stable order so characters don't shuffle
    out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return out;
  },

  seen(t){
    if (!this.ready) return false;
    for (const p of this.people.values()) if (t - p.lastSeen < 1.2) return true;
    return false;
  },

  ptsGet(pts, name){
    const p = pts[name];
    return (p && p.c >= this.MIN_C * 0.6) ? p : null;
  },

  // Every tracked person's hands, head, and feet count as wiggle points
  injectPoints(points, t){
    if (!this.ready) return;
    for (const person of this.peopleList(t || 1e9)){
      for (const name of ['left_wrist', 'right_wrist', 'nose', 'left_ankle', 'right_ankle']){
        const p = this.ptsGet(person.pts, name);
        if (p && points.length < 200) points.push({ x: p.x, y: p.y, s: 1 });
      }
    }
  }
};
