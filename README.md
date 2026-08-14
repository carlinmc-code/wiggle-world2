# Wiggle World

A camera motion game for little kids. Runs at https://wiggle-world.raisedcurious.com

Wave, wiggle, and dance in front of the camera to make five scenes come alive.
The child can appear on screen as a scene character (diver, astronaut, monkey,
baby dino, penguin), a stick figure, or a wiggly smiley, tracked by on-device
pose detection. Nothing is recorded or uploaded.

## Structure

- `index.html` - shell, setup screen, avatar picker
- `css/style.css` - all styles
- `js/util.js` - canvas globals, helpers, particle system
- `js/audio.js` - WebAudio synth sounds
- `js/motion.js` - frame-differencing motion tracker (drives scene reactions)
- `js/pose.js` - TensorFlow.js MoveNet wrapper (drives avatars)
- `js/avatars.js` - avatar renderers
- `js/scenes.js` - the five scenes
- `js/main.js` - game loop and UI wiring

## Deploy

Push to `main`. Cloudflare Pages (project: wiggle-world) auto-deploys.
No build step. Pose model loads from jsDelivr CDN at runtime.

v2.1.0 - multi-person mode: dock toggle 👤/👥 switches between SinglePose (fast) and MultiPose Lightning with tracking (up to 4 people; person 1 = scene character, 2 = smiley, 3-4 = colored stick figures)
