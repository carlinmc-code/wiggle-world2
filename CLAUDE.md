# Wiggle World v2 (wiggle-world2.raisedcurious.com)

Camera motion game for little kids on TV/iPad. Multi-file: index.html, css/style.css,
js/{util,audio,motion,pose,avatars,scenes,main}.js. Push to main -> Cloudflare Pages
auto-deploys (project: wiggle-world2). On-device only: never upload/record camera data,
and keep the privacy line on the setup screen true.

## Architecture
- motion.js: frame-diff tracker (all people, drives scene reactions + particle trail).
- pose.js: TF.js MoveNet. detSingle (default) + detMulti (lazy, dock toggle, <=4 people,
  stable IDs). Keypoints smoothed per person; hands/head/feet injected as motion points.
- avatars.js: rig built from keypoints; kinds: scene chars (diver/astronaut/monkey/dino/
  penguin/beekeeper), stick, smiley, blob fallback when pose fails.
- scenes.js: 6 scenes; each declares icon/name/avatar; reactions via Motion.nearest.

## Hard-won rules
1. drawEmoji SIGNATURE HERE: drawEmoji(emoji, x, y, size, angle, flip, alpha) - NO ctx arg.
   Passing ctx renders "[object CanvasRenderingContext2D]" as giant pulsing text
   (shipped bug once). raisedcurious-play uses the ctx-first signature - never copy
   calls between repos.
2. CACHE-BUSTERS: index.html loads every local asset with ?v=X.Y.Z. BUMP ON EVERY DEPLOY
   or iPads serve stale JS against fresh HTML (shipped bug once).
3. Rig size is clamped to min(230, W*0.24) so close-range phones don't get screen-filling
   avatars. Keep any new avatar drawing proportional to rig.u.
4. iOS zoom guards live at the end of main.js; the dock is overflow-x scrollable with a
   <=760px media query. Test at 390px and 1280px widths.
5. Sounds: soft synth only (audio.js). Scene reactions need cooldowns so nothing strobes.

## Required checks before any push
- node --check all js files.
- Run the strict-canvas regression: mock ctx that throws on non-string fillText and
  non-finite transforms; render every avatar kind from a synthetic rig at 1280x720 AND
  390x844; tick every scene 300 frames. (Recreate as test/strict.js if missing.)
- Bump ?v= in index.html + add a README version line, every deploy.

## Adding a scene
New class in scenes.js (icon, name, avatar), add to scenes[] in main.js (keyboard range
is already scenes.length), add avatar renderer + dispatch in avatars.js if a new kind.
