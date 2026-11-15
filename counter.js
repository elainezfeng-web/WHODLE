/* ============================================================
   Firebase visitor counter
   ============================================================

   One row per browser in `visitors` (anonymous auth keeps the uid
   stable), and the total is a server-side count over that collection.
   That means the number cannot be inflated by poking a counter field:
   the most a client can add is its own single row.

   Any element with [data-visitor-count] shows the total; the attribute
   value is the label, e.g.
       <p data-visitor-count="OPERATORS ON FILE" hidden></p>

   The counter is decoration. If Firebase is unreachable, the rules are
   not deployed yet, or the page is opened from file://, it stays hidden.
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
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

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

const VISITORS = 'visitors';   // collection holding one doc per browser

async function start() {
    // Anonymous auth needs a real origin; skip when the file is opened directly.
    if (location.protocol === 'file:') return;

    const targets = document.querySelectorAll('[data-visitor-count]');
    if (!targets.length) return;

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Registering needs an account; reading the count does not. So a failed
    // sign-in (e.g. Anonymous auth not enabled yet) only means this browser is
    // missing from the total - everyone still sees the number.
    try {
        // Stable per-browser identity, so returning visitors are not re-counted.
        const { user } = await signInAnonymously(getAuth(app));

        // Register this visitor once. Existing rows are left untouched
        // (and the rules forbid updating them).
        const ref = doc(db, VISITORS, user.uid);
        if (!(await getDoc(ref)).exists()) {
            await setDoc(ref, { firstSeen: serverTimestamp() });
        }
    } catch (err) {
        console.warn('[counter] could not register this visitor:', err && (err.code || err.message));
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
