/* ============================================================
   Firebase visitor counter
   ============================================================

   One row per browser in `visitors`, and the total is a server-side
   count over that collection. That means the number cannot be inflated
   by poking a counter field: the most a client can add is its own row.

   There is no sign-in. Each browser gets a random id in localStorage,
   and that id is the document id. The rules can validate the row's
   shape (32 hex chars, one server timestamp, no updates) but not who
   wrote it - see firestore.rules for what that does and doesn't stop.

   Any element with [data-visitor-count] shows the total; the attribute
   value is the label, e.g.
       <p data-visitor-count="OPERATORS ON FILE" hidden></p>

   The counter is decoration. If Firebase is unreachable, the rules are
   not deployed yet, storage is blocked, or the page is opened from
   file://, it stays hidden.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    getCountFromServer,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

// Public web config. Safe to ship - access is enforced by firestore.rules,
// not by hiding these values.
const firebaseConfig = {
    apiKey: "AIzaSyD2OdirC_0jkkEDQdFSwjxaOXx3ejyxv18",
    authDomain: "whodle-6725a.firebaseapp.com",
    projectId: "whodle-6725a",
    storageBucket: "whodle-6725a.firebasestorage.app",
    messagingSenderId: "108409863303",
    appId: "1:108409863303:web:bc9a51f2a7fd465be2cc22"
};

const VISITORS = 'visitors';          // collection holding one doc per browser
const ID_KEY = 'whodle:visitor-id';   // random per browser, survives reloads

// 32 lowercase hex characters, which is the pattern firestore.rules checks.
// getRandomValues() works on plain http too, unlike crypto.randomUUID().
function randomId() {
    return [...crypto.getRandomValues(new Uint8Array(16))]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// Returns a stable id for this browser, or null when storage is unavailable
// (in that case we can't honour "one row per browser", so we don't register).
function visitorId() {
    try {
        const existing = localStorage.getItem(ID_KEY);
        if (existing) return existing;
        const id = randomId();
        localStorage.setItem(ID_KEY, id);
        return id;
    } catch {
        return null;
    }
}

async function start() {
    // Needs a real origin; skip when the file is opened directly.
    if (location.protocol === 'file:') return;

    const targets = document.querySelectorAll('[data-visitor-count]');
    if (!targets.length) return;

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const id = visitorId();

    // Register this browser once. getDoc() keeps reloads - and a wiped
    // collection - from adding a second row for the same id.
    if (id) {
        try {
            const ref = doc(db, VISITORS, id);
            if (!(await getDoc(ref)).exists()) {
                await setDoc(ref, { firstSeen: serverTimestamp() });
            }
        } catch (err) {
            console.warn('[counter] could not register this visitor:', err && (err.code || err.message));
        }
    }

    const { count } = (await getCountFromServer(collection(db, VISITORS))).data();

    targets.forEach((el) => {
        el.textContent = `${el.dataset.visitorCount}: ${count.toLocaleString()}`;
        el.hidden = false;
    });
}

start().catch((err) => {
    // Never let the counter break the game.
    console.warn('[counter] unavailable:', err && (err.code || err.message));
});
