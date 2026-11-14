# WHODLE Notes

## How to run it
1. Open `index.html` in a browser (double-click, or use "Open with" browser)
2. Works on desktop (mouse + keyboard) and mobile (tap)
3. No build step - plain HTML, CSS, JavaScript

Tip: the 3D page pulls Three.js from a CDN, so it needs a network connection the
first time. To serve it locally:
`python -m http.server 8000` in this folder, then open http://localhost:8000/game.html

## Where it's published
- Local: `C:\Users\Elaine Feng\Documents\WHODLE\index.html`
- GitHub: https://github.com/elainezfeng-web/WHODLE

## What's done
- [x] Landing page — CRT boot screen with WHODLE logo, date, instructions, ID photos, PLAY
- [x] Game page is a 3D FNAF-style night-shift office (Three.js): desk, keyboard, mug,
      desk lamp, posters, security camera, wall clock, floating dust
- [x] The game UI lives on the CRT monitor in the room: the HTML screen surface is
      projected onto the 3D screen plane every resize, so text stays crisp
- [x] CRT styling: amber phosphor, scanlines, vignette, flicker, static, power-on flash,
      CAM 01 HUD, live timestamp
- [x] 5 questions per shift with round indicator
- [x] Multiple-choice guessing with feedback (shake, particles, squash/stretch, SFX)
- [x] Answer with mouse click, tap, or number keys 1-4 (Tab + Enter also works)
- [x] Final report with total/average guesses and per-question breakdown
- [x] Secret debug menu: type `JOB` to play any date
- [x] Date-seeded RNG so every day gives the same five questions
- [x] Data: legitimate LinkedIn profiles only, names redacted to initials,
      profiles need >= 2 workplaces (1,681 profiles)
- [x] Distractors picked from simhash-similar profiles (Hamming < 25)
- [x] Data cleanup: repaired double-encoded UTF-8 (the stray `Â` characters that were
      also breaking exact-answer matching) and trimmed the embedded fields to the ones
      the game uses (9.2 MB -> 2.7 MB)
- [x] Responsive: on narrow screens the screen design resolution shrinks with the
      projected CRT so text stays readable (single-column options, compact profile)
- [x] All tuning numbers live in `CONFIG` (app.js) and `SCENE` (office3d.js)

## What's next
- [ ] Check the office framing / lighting on a real monitor and phone
- [ ] Add a proper "boot sequence" before question 1
- [ ] More clue variety (education, skills, location)
- [ ] Shareable result card
- [ ] Sound design for the office room itself (hum, fan)
- [ ] Pull the CRT closer on portrait phones so less scrolling is needed

## Files that matter
- `game.html` — 3D office page (overlay, HUD, CRT effects, debug menu)
- `office3d.js` — Three.js scene, camera fit, projected overlay alignment
- `app.js` — game logic, rounds, report, debug menu, audio/particles
- `style.css` — CRT/office theme
- `profiles_data.js` — embedded game data (`window.PROFILES_DATA`)
- `index.html` — landing page
