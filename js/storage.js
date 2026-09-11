/* ============================================================
   SENTRY — storage.js
   ------------------------------------------------------------
   Tiny safe wrapper around localStorage. Everything the dashboard
   remembers is namespaced under "sentry.*". If localStorage is
   unavailable (private mode, file restrictions), the app falls
   back to in-memory storage so it never crashes.
   ============================================================ */
(function () {
  const PREFIX = "sentry.";

  const KEYS = {
    progress: PREFIX + "progress",     // challenge scores + completed + lessons
    settings: PREFIX + "settings",     // theme / display preferences
    logs:     PREFIX + "logs",         // simulated activity log (tail only)
    readSerial: PREFIX + "readSerial"  // notification read watermark
  };

  let memory = {};                     // fallback store
  let available = false;

  try {
    const t = "__sentry_test__";
    localStorage.setItem(t, "1");
    localStorage.removeItem(t);
    available = true;
  } catch (e) {
    available = false;
  }

  function read(key, fallback) {
    try {
      const raw = available ? localStorage.getItem(key) : memory[key];
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    const raw = JSON.stringify(value);
    if (available) {
      try { localStorage.setItem(key, raw); } catch (e) { available = false; }
    }
    memory[key] = raw;
  }

  function remove(key) {
    if (available) { try { localStorage.removeItem(key); } catch (e) {} }
    delete memory[key];
  }

  window.SentryStore = {
    KEYS: KEYS,
    getProgress: () => read(KEYS.progress, { scores: {}, completed: [], lessons: [], attempts: {} }),
    saveProgress: (p) => write(KEYS.progress, p),
    getSettings: () => read(KEYS.settings, null),
    saveSettings: (s) => write(KEYS.settings, s),
    getLogs: () => read(KEYS.logs, null),
    saveLogs: (l) => write(KEYS.logs, l),
    getReadSerial: () => read(KEYS.readSerial, 0),
    saveReadSerial: (n) => write(KEYS.readSerial, n),
    resetAll: () => { Object.keys(KEYS).forEach(k => remove(KEYS[k])); }
  };
})();