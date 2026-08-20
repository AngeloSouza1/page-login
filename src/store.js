const crypto = require('crypto');

const store = new Map();
const DEFAULT_TTL_MS = 90_000;
const MAX_ATTEMPTS = 60;

function sweep() {
  const now = Date.now();
  for (const [token, entry] of store) {
    if (entry.expiresAt < now) store.delete(token);
  }
}
setInterval(sweep, 30_000).unref();

function createChallenge(type, answer, extra = {}, ttlMs = DEFAULT_TTL_MS) {
  const token = crypto.randomUUID();
  store.set(token, {
    type,
    answer,
    extra,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
    consumed: false,
  });
  return token;
}

function getChallenge(token, type) {
  if (!token) return null;
  const entry = store.get(token);
  if (!entry) return null;
  if (entry.type !== type) return null;
  if (entry.consumed) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(token);
    return null;
  }
  return entry;
}

function verify(token, type, isCorrectFn) {
  const entry = getChallenge(token, type);
  if (!entry) return { ok: false, reason: 'expired_or_invalid' };

  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    store.delete(token);
    return { ok: false, reason: 'too_many_attempts' };
  }

  const correct = isCorrectFn(entry);
  if (correct) {
    entry.consumed = true;
    return { ok: true };
  }
  return { ok: false, reason: 'wrong' };
}

module.exports = { createChallenge, getChallenge, verify };
