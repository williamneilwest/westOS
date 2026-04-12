function getBackend({ session = false } = {}) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return session ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function safeParse(raw) {
  if (typeof raw !== 'string') {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function unwrapStoredValue(key, parsed, backend) {
  if (!parsed || typeof parsed !== 'object' || parsed.__westosStorage !== true) {
    return parsed;
  }

  if (parsed.expiresAt && Number(parsed.expiresAt) <= Date.now()) {
    try {
      backend?.removeItem(key);
    } catch {
      // Ignore cleanup failures.
    }
    return null;
  }

  return parsed.value ?? null;
}

export function get(key, options = {}) {
  const backend = getBackend(options);
  if (!backend) {
    return null;
  }

  try {
    const raw = backend.getItem(key);
    if (raw == null) {
      return null;
    }

    const parsed = safeParse(raw);
    return unwrapStoredValue(key, parsed, backend);
  } catch {
    return null;
  }
}

export function set(key, value, options = {}) {
  const backend = getBackend(options);
  if (!backend) {
    return;
  }

  try {
    if (value === undefined) {
      backend.removeItem(key);
      return;
    }

    if (options.ttlMs) {
      backend.setItem(
        key,
        JSON.stringify({
          __westosStorage: true,
          value,
          expiresAt: Date.now() + Number(options.ttlMs),
        })
      );
      return;
    }

    backend.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

export function remove(key, options = {}) {
  const backend = getBackend(options);
  if (!backend) {
    return;
  }

  try {
    backend.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function clearAll() {
  for (const backend of [getBackend(), getBackend({ session: true })]) {
    if (!backend) {
      continue;
    }

    try {
      backend.clear();
    } catch {
      // Ignore storage failures.
    }
  }
}

export function clearNamespace(prefix) {
  for (const backend of [getBackend(), getBackend({ session: true })]) {
    if (!backend) {
      continue;
    }

    try {
      const keys = [];
      for (let index = 0; index < backend.length; index += 1) {
        const key = backend.key(index);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }

      keys.forEach((key) => backend.removeItem(key));
    } catch {
      // Ignore storage failures.
    }
  }
}

export function getWithTTL(key, options = {}) {
  return get(key, options);
}

export function setWithTTL(key, value, ttlMs, options = {}) {
  set(key, value, { ...options, ttlMs });
}

export const storage = {
  get,
  set,
  remove,
  clearAll,
  clearNamespace,
  getWithTTL,
  setWithTTL,
};
