/* ============================================================
   MindDo key helper - SERVER ONLY
   ============================================================

   Never import this file from browser code. It reads the secret
   KEYGEN_TOKEN from .env, calls the MindDo key service, caches the
   returned apiKey until expiresAt, and never prints either value.

   Node 18+ (built-in fetch / AbortSignal; no npm packages).
   ============================================================ */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

if (typeof window !== 'undefined') {
    throw new Error('minddo-key.js is server-only and must never be loaded in a browser');
}

const CONFIG = {
    envPath: path.resolve(__dirname, '..', '.env'),  // project-root .env (server secret)
    expirySkewMs: 60_000,   // refresh a minute early so a key can't expire mid-call
    timeoutMs: 10_000       // give up on a stuck keygen request
};

class KeygenError extends Error {
    constructor(message, fix) {
        super(message);
        this.name = 'KeygenError';
        this.fix = fix; // server-side diagnostic only - never sent to the browser
    }
}

let cached = { apiKey: null, expiresAt: 0 };
let pending = null;

// Minimal .env reader; values set by the host (process.env) win over the file.
function envValue(name) {
    if (process.env[name]) return process.env[name];
    let text;
    try { text = fs.readFileSync(CONFIG.envPath, 'utf8'); }
    catch { return null; }
    for (const line of text.split(/\r?\n/)) {
        const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
        if (m && m[1] === name) return m[2].replace(/^['"]|['"]$/g, '');
    }
    return null;
}

// Accepts an ISO date string, epoch milliseconds, or epoch seconds.
function expiresAtMs(value) {
    if (typeof value === 'number') return value > 1e12 ? value : value * 1000;
    if (typeof value === 'string' && value.trim()) {
        const n = Number(value);
        if (Number.isFinite(n)) return n > 1e12 ? n : n * 1000;
        return Date.parse(value);
    }
    return NaN;
}

async function loadKey() {
    const url = envValue('KEYGEN_URL');
    const token = envValue('KEYGEN_TOKEN');
    if (!url || !token || url === 'paste-here' || token === 'paste-here') {
        throw new KeygenError(
            'AI features are not set up yet.',
            'Fill KEYGEN_URL and KEYGEN_TOKEN in the server .env file, then restart the server.'
        );
    }

    let response;
    try {
        response = await fetch(url.replace(/\/+$/, '') + '/api/lookup-key', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout ? AbortSignal.timeout(CONFIG.timeoutMs) : undefined
        });
    } catch {
        throw new KeygenError(
            'The AI key service could not be reached.',
            'Check server network access to KEYGEN_URL and that the keygen service is running.'
        );
    }

    let reply;
    try { reply = await response.json(); }
    catch { reply = null; }

    if (!response.ok || (reply && reply.error)) {
        const message = (reply && reply.error && reply.error.message)
            || 'The AI key service rejected the request.';
        const fix = (reply && reply.error && reply.error.fix)
            || 'Check the keygen service status and the KEYGEN_URL / KEYGEN_TOKEN values in .env.';
        throw new KeygenError(message, fix);
    }

    const apiKey = reply && reply.apiKey;
    const expiresAt = expiresAtMs(reply && reply.expiresAt);
    if (typeof apiKey !== 'string' || !apiKey || !Number.isFinite(expiresAt)) {
        throw new KeygenError(
            'The AI key service returned an incomplete reply.',
            'The /api/lookup-key JSON must contain apiKey and expiresAt (ISO date or epoch).'
        );
    }

    cached = { apiKey, expiresAt };
    return apiKey;
}

// Returns a usable key. At most one HTTP call per invocation; no retry loop.
async function getKey() {
    if (cached.apiKey && Date.now() < cached.expiresAt - CONFIG.expirySkewMs) {
        return cached.apiKey;
    }
    if (pending) return pending;   // concurrent callers share one request
    pending = loadKey();
    try { return await pending; }
    finally { pending = null; }
}

// Call once when OpenAI rejects the cached key with 401. The next getKey()
// then asks the keygen service for a fresh one.
function invalidateKey() {
    cached = { apiKey: null, expiresAt: 0 };
}

// Use in a server route's catch block: sends only error.message to the
// visitor, logs error.fix on the server, and never retries.
function sendKeyError(res, err) {
    const message = (err && err.message) || 'AI features are unavailable right now.';
    const fix = (err && err.fix) || 'Check the keygen service and the server .env configuration.';
    console.error('[minddo] ' + fix);
    if (res && typeof res.status === 'function' && typeof res.json === 'function') {
        res.status(502).json({ error: message });
    }
    return message;
}

module.exports = { getKey, invalidateKey, sendKeyError, KeygenError };
