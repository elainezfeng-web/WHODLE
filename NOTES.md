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
      the game uses (9.2 MB -> 3.3 MB)
- [x] Profile dossier shows every usable section of the record: current role, location,
      connection/follower counts, role/degree/skill counts, summary (`about`), education
      (`education_summary`), skills (`skills_list`) and a career span derived from
      `experiences`. Rows hide themselves when that profile has no data for them.
      Employers from the work history are deliberately NOT listed: the answer is one of
      them, so showing them would give the round away.
- [x] Visitor counter on Firebase (Firestore + anonymous auth), see below
- [x] Responsive: on narrow screens the screen design resolution shrinks with the
      projected CRT so text stays readable (single-column options, compact profile)
- [x] All tuning numbers live in `CONFIG` (app.js) and `SCENE` (office3d.js)

## Visitor counter (Firebase)

How it works: each browser signs in anonymously, gets one document in the `visitors`
collection, and the number shown is a server-side count over that collection. A client
can therefore add at most its own single row, so the total can't be inflated by writing
to a counter field.

It is decoration: if Firebase is unreachable, the rules aren't deployed, or the page is
opened from `file://`, the counter stays hidden and the game is unaffected. Reading the
count does not require an account, so even before Anonymous auth is enabled the number
shows - it just won't include that browser.

One-time setup in the Firebase console (project `whodle-6725a`), full walkthrough in
[`FIREBASE.md`](FIREBASE.md):
1. **Authentication → Sign-in method → Anonymous → Enable.** Without this, sign-in
   returns a 400 and new visitors aren't added to the count.
2. **Firestore Database → Create database** (production mode is fine, rules are
   supplied below).
3. Deploy the rules: `firebase deploy --only firestore:rules`, or paste
   `firestore.rules` into **Firestore Database → Rules → Publish**.
4. If the site is on GitHub Pages, add its domain under
   **Authentication → Settings → Authorized domains** (localhost is already allowed).

Optional hardening: in Google Cloud Console → APIs & Services → Credentials, restrict
the browser API key to your own domains. The key is public by design; the rules are
what protect the data.

## What's next
- [ ] Check the office framing / lighting on a real monitor and phone
- [ ] Add a proper "boot sequence" before question 1
- [ ] Shareable result card
- [ ] Sound design for the office room itself (hum, fan)
- [ ] Pull the CRT closer on portrait phones so less scrolling is needed
- [ ] Rank the daily result against the counter ("top 12% today")

## Files that matter
- `game.html` — 3D office page (overlay, HUD, CRT effects, debug menu)
- `office3d.js` — Three.js scene, camera fit, projected overlay alignment
- `app.js` — game logic, rounds, report, debug menu, audio/particles
- `style.css` — CRT/office theme
- `profiles_data.js` — embedded game data (`window.PROFILES_DATA`), generated from
  `profiles_full.json` with only the fields the game reads
- `profiles_full.json` — full repaired dataset (source for the projection)
- `counter.js` — Firebase visitor counter (loaded as a module on both pages)
- `firestore.rules` — security rules for the visitor collection
- `FIREBASE.md` — step-by-step setup (console + CLI), verification, troubleshooting,
  cost and threat model for the visitor counter
- `firebase.json`, `.firebaserc` — Firebase CLI deploy config
- `index.html` — landing page
