/* ============================================================
   Server-only diagnostic: is the AI key working?
   ============================================================

   GET/POST /api/key-test

   Calls getKey(), then checks the key against OpenAI's /v1/models
   endpoint. Returns ONLY status flags - never the key or token.
   If OpenAI rejects the key, refreshes once via invalidateKey()
   and retries, then stops (no loop).

   Safe to leave deployed; delete this file when you're done testing.
   ============================================================ */

'use strict';

const { getKey, invalidateKey, sendKeyError } = require('../server/minddo-key');

async function checkOpenAI(key) {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout ? AbortSignal.timeout(10_000) : undefined
        });
        // Drain the body but never log it or the key.
        await response.arrayBuffer();
        return response.status;
    } catch {
        return 0; // network failure
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Use GET or POST.' });
    }

    try {
        let key = await getKey();
        let status = await checkOpenAI(key);

        if (status === 401) {
            // OpenAI says the key is stale/invalid. One refresh, no retry loop.
            invalidateKey();
            key = await getKey();
            status = await checkOpenAI(key);
        }

        if (status === 0) {
            return res.status(502).json({
                ok: false,
                error: 'The AI provider could not be reached.',
                providerStatus: 0
            });
        }

        if (status !== 200) {
            return res.status(502).json({
                ok: false,
                error: 'The AI key was rejected by the AI provider.',
                providerStatus: status
            });
        }

        // Status only. No key, no token, no provider response body.
        return res.status(200).json({
            ok: true,
            keygen: 'ok',
            openai: 'ok',
            providerStatus: 200
        });
    } catch (err) {
        // error.message -> visitor, error.fix -> server log. No retry.
        sendKeyError(res, err);
    }
};
