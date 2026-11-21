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
- [x] Visitor counter on Firebase (Firestore only, no accounts) — live, one row per browser
- [x] Responsive: on narrow screens the screen design resolution shrinks with the
      projected CRT so text stays readable (single-column options, compact profile)
- [x] All tuning numbers live in `CONFIG` (app.js) and `SCENE` (office3d.js)

## Visitor counter (Firebase)

How it works: each browser gets a random 32-character id in `localStorage`, which is the
document id in the `visitors` collection. The number shown is a server-side count over
that collection, so a client can add at most its own single row and the total can't be
inflated by writing to a counter field. No accounts: the rules check the row's shape
(32 hex chars, one server timestamp, no updates), not who wrote it.

It is decoration: if Firebase is unreachable, the rules aren't deployed, storage is
blocked, or the page is opened from `file://`, the counter stays hidden and the game is
unaffected. Reading the count needs no identity either.

One-time setup in the Firebase console (project `whodle-6725a`), full walkthrough in
[`FIREBASE.md`](FIREBASE.md):
1. **Firestore Database → Create database** (production mode is fine, rules are
   supplied below).
2. Deploy the rules: `firebase deploy --only firestore:rules`, or paste
   `firestore.rules` into **Firestore Database → Rules → Publish**.

Optional hardening: in Google Cloud Console → APIs & Services → Credentials, restrict
the browser API key to your own domains. The key is public by design; the rules are
what protect the data.

## AI key (MindDo)

The AI key never lives in this repo or in the browser. **Server code gets it from
`getKey()`** in `server/minddo-key.js` (Node 18+, no npm packages). The helper reads
`KEYGEN_URL` and `KEYGEN_TOKEN` from the server's `.env`, POSTs to
`KEYGEN_URL + /api/lookup-key` with `Authorization: Bearer KEYGEN_TOKEN`, caches the
returned `apiKey` until `expiresAt`, and requests a new one when it expires or OpenAI
rejects it (call `invalidateKey()` once on a 401, then `getKey()` again).

`.env` is git-ignored. Fill in the two values yourself, then restart the server;
environment variables set by the host win over the file, which is how a serverless
deploy should supply them. Never paste the token into chat or commit it. The key and
token are never printed or sent to the page - only server code may load this module.

Typical server route:

```js
const { getKey, invalidateKey, sendKeyError } = require('./server/minddo-key');

app.post('/api/chat', async (req, res) => {
    try {
        let key = await getKey();
        let answer = await askOpenAI(key, req.body.prompt);
        if (answer.status === 401) {          // OpenAI says the key is invalid
            invalidateKey();
            key = await getKey();             // exactly one refresh, no loop
            answer = await askOpenAI(key, req.body.prompt);
        }
        res.json({ reply: answer.text });
    } catch (err) {
        sendKeyError(res, err);               // error.message to user, error.fix to log
    }
});
```

When a request fails, the reply has `error.message` and `error.fix`. `sendKeyError()`
sends only `error.message` to the visitor and logs `error.fix` on the server; there is no
retry loop.

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
- `counter.js` — Firebase visitor counter (localStorage id, no accounts)
- `firestore.rules` — security rules for the visitor collection
- `FIREBASE.md` — step-by-step setup (console + CLI), verification, troubleshooting,
  cost and threat model for the visitor counter
- `firebase.json`, `.firebaserc` — Firebase CLI deploy config
- `.env` — local secrets for the AI key service (git-ignored; you fill it in)
- `server/minddo-key.js` — server-only helper; `getKey()` returns the current AI key
- `index.html` — landing page
