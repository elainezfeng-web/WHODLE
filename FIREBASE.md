# Visitor counter

**Status: live.** The Firestore database exists, `firestore.rules` is published, and the
counter renders on both pages (`OPERATORS ON FILE: N`). This file is the setup and repair
runbook for project `whodle-6725a` — use it if the counter ever disappears or the project
is rebuilt. **There is no sign-in** and no authorized-domain list to maintain.

If the counter is hidden, the browser console names the reason; jump to
[troubleshooting](#troubleshooting). Typical causes are unpublished rules, a missing
database, or an offline network:

```
POST https://firestore.googleapis.com/.../documents:runAggregationQuery   403
[counter] could not register this visitor: permission-denied
[counter] unavailable: permission-denied
```

- **Fast path:** [Part 1](#part-1-console-only-no-installs) — about 3 minutes, no installs.
- **Repeatable path:** [Part 2](#part-2-cli-rules-deploys) — install the CLI once, then
  `firebase deploy --only firestore:rules` whenever the rules change.

---

## What the counter actually is

- Each browser gets a **random 32-character id** in `localStorage`
  (`whodle:visitor-id`), and that id is the document id in the `visitors` collection.
- The number on screen is a **server-side count** over that collection
  (`getCountFromServer`), not a "+1" field.
- Therefore the worst a client can do is add **its own row**. There is no number to
  overwrite, no way to delete rows, and no way to touch someone else's row.
- Rows are created only if missing (`getDoc` first), so reloading never adds a second
  row — and if you wipe the collection, every returning browser re-adds itself instead
  of staying missing forever.
- The rules allow **public read** (that is what makes the count query work) and
  **create-only**, with a 32-hex id, one field, and one server timestamp.
- No accounts, no emails, no uid. Just a random id and a timestamp.

It is decoration. If anything is misconfigured or offline, `counter.js` logs a warning
and the counter stays hidden; the game is unaffected.

---

## Part 1: Console only (no installs)

Open <https://console.firebase.google.com/project/whodle-6725a/overview> and check that
the project picker in the top bar says **whodle-6725a**.

### 1. Create the Firestore database

1. Left sidebar: **Build → Firestore Database** → **Create database**.
2. Edition: **Standard**.
3. Location: pick the region closest to your players (e.g. `asia-southeast1` or
   `nam5`). **This cannot be changed later**, but it does not matter for a counter.
4. Mode: **Production mode** (we publish real rules in the next step).
5. **Create**.

### 2. Publish the rules

1. Still in **Firestore Database**, open the **Rules** tab.
2. Select everything in the editor, delete it, and paste the whole contents of
   [`firestore.rules`](firestore.rules) — starting with `rules_version = '2';`.
3. **Publish**. It compiles in a few seconds; changes can take up to a minute to apply.

> The rules are what allow a browser to read the count and add exactly one shaped row.
> Without them the database is locked and the counter stays hidden
> (`permission-denied`).

### 3. Check it

1. Reload the page.
2. Landing page should show **`OPERATORS ON FILE: 1`** at the bottom; the game page
   shows the same line in the HUD at the bottom-right of the CRT room.
3. Console should have no Firebase errors. A `[counter] ...` warning means the rules
   are not published yet or the database does not exist — see
   [troubleshooting](#troubleshooting).
4. In **Firestore Database → Data** you should see `visitors` → one document with a
   32-character hex id, containing `firstSeen`.

Reload again: the count must stay the same, because the id is reused and the row already
exists. Open a private window: it becomes `2`. Close it and reload in the normal window:
still `2` — the row is permanent by design.

---

## Part 2: CLI rules deploys

Useful because the rules live in the repo and you can redeploy them without copying and
pasting. Requires **Node.js 20+** (which brings npm). This machine has neither yet, so
install Node LTS from <https://nodejs.org> first.

```powershell
node --version                                  # v20.x or newer
npm install -g firebase-tools
firebase --version

cd "C:\Users\Elaine Feng\Documents\WHODLE"
firebase login                                  # browser opens; use the Google account that owns whodle-6725a
firebase use whodle-6725a                       # .firebaserc already defaults to this
firebase deploy --only firestore:rules
```

A good deploy prints:

```
i  deploying firestore
i  firestore: checking firestore.rules for compilation errors...
✔  firestore: rules file firestore.rules compiled successfully
✔  Deploy complete!
```

`firebase.json` already points at `firestore.rules`, so only the rules file is uploaded;
nothing else in the project is touched.

**The CLI cannot create the database** — that is Part 1, step 1. Once it exists, a rules
change is a one-line deploy.

Optional: test rules locally before deploying:

```powershell
firebase emulators:start --only firestore
```

The emulator needs **Java 11+**. It lets you exercise reads/writes without touching the
live project, but it is not required.

---

## Troubleshooting

Find the exact wording in the browser console (F12 → Console) and match the row.

| What you see | Meaning | Fix |
| --- | --- | --- |
| `permission-denied` / `Missing or insufficient permissions` (a `403` on `runAggregationQuery` is the same thing) | Rules not published, or published to another project | Part 1 step 2; check the project id in the console top bar, then republish and wait a minute |
| `not-found` on the counter calls | The Firestore database has not been created | Part 1 step 1 |
| `[counter] could not register this visitor` but the number still appears | The count is readable but writes are denied — almost always the same rules problem | Republish the rules; the rules must allow `create` on `visitors` |
| Counter shows, but your visit never adds a row | Your id already has a row (correct), or storage is blocked so no id is created | Check **Firestore → Data → visitors**; test in a private window; allow site data for the domain |
| Counter never appears, console is clean | Opened via `file://`, or Firebase blocked by an extension/network | Serve over `http://localhost:8000` or the live site |
| `Failed to fetch dynamically imported module` | `gstatic.com` unreachable | Counter stays hidden, game still works; retry on another network |
| Rules editor won't publish | Paste started mid-file / missing header, or the `matches()` pattern lost its escaping | Paste the **entire** `firestore.rules`, including `rules_version = '2';` |
| Number doesn't change when you reload | Expected — the id is stable and the row already exists | Test in a private window or clear site data |

Every failure is non-fatal by design: `counter.js` catches it, warns once, and leaves the
`[data-visitor-count]` elements hidden.

---

## Verify from the console (optional)

Firestore → **Data** → `visitors` shows one row per browser. You can also check the
public read from the browser's devtools:

```js
fetch('https://firestore.googleapis.com/v1/projects/whodle-6725a/databases/(default)/documents/visitors?key=AIzaSyD2OdirC_0jkkEDQdFSwjxaOXx3ejyxv18')
  .then(r => r.json())
  .then(d => console.log(d.documents?.length ?? d.error?.status));
```

That is exactly the data the site can read: random ids and timestamps, nothing else.

---

## What it costs

Firestore's free Spark tier covers **50,000 document reads, 20,000 writes and 1 GiB per
day**. Here:

- Each new browser = 1 read (`getDoc`) + 1 write, once.
- Each returning page view = 2 reads: one `getDoc` to confirm the row exists, one for
  the count (aggregation queries are billed roughly one read per 1,000 documents
  counted).

So tens of thousands of page views per day still fit in the free tier.

---

## Why this is safe (threat model)

- **No authentication is involved.** The API key is public, which is normal for Firebase
  web apps; it identifies the project, and the rules decide what is allowed.
- **The count can't be set directly.** There is no counter field; the number is computed
  by the server from the row count.
- **Rows are immutable.** `update` and `delete` are denied, so nobody can edit or remove
  a row. A create must use a 32-hex id, exactly one field, and the current server time.
- **The id is not a person.** It is 128 random bits generated in the browser. It is not
  derived from anything, and it is only stored locally, so it can't identify a visitor
  across sites or across devices.
- **Public read is intentional.** Anyone can list random ids and timestamps. There is no
  other data in the collection.
- **Known limit: scripted creates.** With no auth, nothing ties a row to a real browser,
  so a script can POST creates in a loop and inflate the count. Anonymous auth had the
  same practical limit (it can create unlimited accounts). The number is decoration. If
  it ever matters, the real fix is **App Check** (reCAPTCHA Enterprise) with Firestore
  enforcement, or moving registration into a Cloud Function that rate-limits by IP —
  not adding accounts back.

### Optional hardening

1. **Restrict the API key** — Google Cloud Console → APIs & Services → Credentials →
   the browser key → Application restrictions → HTTP referrers, adding your domains.
   Add `http://localhost:8000/*` too, or local testing breaks.
2. **App Check** — Firebase → App Check → register the web app with reCAPTCHA
   Enterprise, then set Firestore to **Enforced**. This makes scripted writes much
   harder, at the cost of another site key to manage.

Neither is needed for the counter to work.

---

## Resetting the number

Firestore Database → Data → `visitors` → three-dot menu → **Delete collection**. The
rules only restrict the client SDKs; the console always has full access. Returning
browsers re-add themselves on their next visit (their id is still in localStorage), and a
brand-new browser starts the collection again.

To reset only *your* browser, clear site data for the domain. That discards the stored
id, so you get a fresh row and are counted as a new visitor.
