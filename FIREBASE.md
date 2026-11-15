# Turning on the visitor counter

The counter is already coded (`counter.js`, `firestore.rules`) and points at the Firebase
project `whodle-6725a`. **But nothing is switched on in the project yet**, so right now
the counter stays hidden and the browser console shows this pair of errors:

```
POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=...   400
POST https://firestore.googleapis.com/.../documents:runAggregationQuery  403
[counter] could not register this visitor: auth/configuration-not-found
[counter] unavailable: permission-denied
```

That is expected. You need to do three things, once, in the Firebase console. After that
it works forever with no maintenance.

- **Fast path:** [Part 1](#part-1-console-only-no-installs) — about 5 minutes, no installs.
- **Repeatable path:** [Part 2](#part-2-cli-rules-deploys) — install the CLI once, then
  `firebase deploy --only firestore:rules` whenever the rules change.

---

## What the counter actually is

- Each browser signs in anonymously and gets **one document** in the `visitors`
  collection, keyed by its Firebase uid.
- The number on screen is a **server-side count** over that collection
  (`getCountFromServer`), not a "+1" field.
- Therefore the worst a client can do is add **its own single row**. There is no number
  to overwrite, no way to delete rows, and no way to touch someone else's row.
- The rules allow **public read** (that is what makes the count query work, even signed
  out) and **create-only, at your own uid, with one server timestamp** in it.
- The collection stores no personal data: a random auth uid as the document id and a
  `firstSeen` timestamp.

It is decoration. If anything is misconfigured or offline, `counter.js` logs a warning
and the counter stays hidden; the game is unaffected.

---

## Part 1: Console only (no installs)

Open <https://console.firebase.google.com/project/whodle-6725a/overview> and check that
the project picker in the top bar says **whodle-6725a**.

### 1. Enable anonymous sign-in

1. Left sidebar: **Build → Authentication**.
2. **Get started** (first visit only).
3. **Sign-in method** tab → click **Anonymous** → toggle **Enable** → **Save**.

Without this step, sign-in returns `400` / `auth/operation-not-allowed` and nobody is
counted. The count still displays for everyone, because reading it doesn't need an
account.

### 2. Create the Firestore database

1. Left sidebar: **Build → Firestore Database** → **Create database**.
2. Edition: **Standard**.
3. Location: pick the region closest to your players (e.g. `asia-southeast1` or
   `nam5`). **This cannot be changed later**, but it does not matter for a counter.
4. Mode: **Production mode** (we publish real rules in the next step).
5. **Create**.

### 3. Publish the rules

1. Still in **Firestore Database**, open the **Rules** tab.
2. Select everything in the editor, delete it, and paste the whole contents of
   [`firestore.rules`](firestore.rules) — starting with `rules_version = '2';`.
3. **Publish**. It compiles in a few seconds; changes can take up to a minute to apply.

> The rules are what allow a browser to read the count and add exactly one row.
> Without them the database is locked and the counter stays hidden
> (`permission-denied`).

### 4. Authorize the deployed domain (only for the live site)

`localhost` and `*.firebaseapp.com` are authorized by default. If you host on GitHub
Pages, add the bare domain:

1. **Authentication → Settings → Authorized domains → Add domain**.
2. For `https://elainezfeng-web.github.io/WHODLE/` enter **`elainezfeng-web.github.io`**
   — no `https://`, no path, no trailing slash.

### 5. Check it

1. Reload the page, then reload once more (the auth SDK retries cleanly).
2. Landing page should show **`OPERATORS ON FILE: 1`** at the bottom; the game page
   shows the same line in the HUD at the bottom-right of the CRT room.
3. Console should have no Firebase errors. A `[counter] ...` warning means step 1 or 3
   is not done yet — see [troubleshooting](#troubleshooting).
4. In **Firestore Database → Data** you should see `visitors` → one document whose id is
   your anonymous uid, containing `firstSeen`.

Reload again: the count must stay the same (the row already exists). Open a private
window: it becomes `2`, then goes back to `1`/`2` depending on which windows are open —
that is the one-row-per-browser behaviour working.

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

**The CLI cannot enable Anonymous auth or create the database** — those are Part 1,
steps 1 and 2. Once they are done, a rules change is a one-line deploy.

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
| `400` on `accounts:signUp` | Anonymous sign-in is disabled | Part 1 step 1, then reload |
| `auth/operation-not-allowed` | Anonymous sign-in is disabled | Part 1 step 1 |
| `auth/configuration-not-found` | The project has no identity config yet — same cause as above | Part 1 step 1 |
| `auth/unauthorized-domain` | The page's domain isn't on the auth allow-list | Part 1 step 4 (`localhost` is allowed by default) |
| `permission-denied` / `Missing or insufficient permissions` (a `403` on `RunAggregationQuery` is the same thing) | Rules not published, or published to another project | Part 1 step 3; check the project id in the console top bar, then republish and wait a minute |
| Counter shows, but your visit never adds a row | The rules were published before your document existed, or your row already exists | Check **Firestore → Data → visitors**; delete your row to retest |
| Counter never appears, console is clean | Opened via `file://`, or Firebase blocked by an extension/network | Serve over `http://localhost:8000` or the live site |
| `Failed to fetch dynamically imported module` | `gstatic.com` unreachable | Counter stays hidden, game still works; retry on another network |
| Rules editor won't publish | Paste started mid-file / missing header | Paste the **entire** `firestore.rules`, including `rules_version = '2';` |
| Number doesn't change when you reload | Expected — your uid is stable and the row already exists | Test in a private window or clear site data |

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

That is exactly the data the site can read: uids and timestamps, nothing else.

---

## What it costs

Firestore's free Spark tier covers **50,000 document reads, 20,000 writes and 1 GiB per
day**. Here:

- Each new browser = 1 write, ever.
- Each page view = 1 read for the count (aggregation queries are billed roughly one read
  per 1,000 documents counted).
- Anonymous auth is free.

So tens of thousands of page views per day still fit in the free tier. No billing
account is needed unless you attach one.

---

## Why this is safe (threat model)

- **The API key is public and that is normal.** It only identifies the project; the rules
  decide what is allowed. Hiding it would not add security.
- **The count can't be set directly.** There is no counter field; the number is computed
  by the server from the row count.
- **Rows are immutable.** `update` and `delete` are denied, and a row may only be created
  at the caller's own uid with a single server timestamp. Nobody can edit or remove
  someone else's row, and nobody can add a second one.
- **No personal data is stored.** A random Firebase auth uid plus a timestamp. The
  uid is not an email, name, or IP.
- **Known limit: scripted sign-ups.** A determined person can create fresh anonymous
  accounts and add one row each, inflating the number. That is true of any client-side
  visitor counter; this number is decoration. If it ever matters, the options are
  App Check (reCAPTCHA Enterprise) with Firestore enforcement, or moving registration
  into a Cloud Function that rate-limits by IP.

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
rules only restrict the client SDKs; the console always has full access. The next
visitor recreates the collection and the count starts at 1.

To reset only *your* browser, clear site data for the domain (this discards the
anonymous uid, so you get counted again as a new visitor).
