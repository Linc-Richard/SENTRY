/* ============================================================
   SENTRY — ui.js
   ------------------------------------------------------------
   Shared UI utilities: icon factory, toast notifications, a small
   confirm dialog, a tiny event bus and formatting helpers used
   across every view.
   ============================================================ */
(function () {
  const S = window.Sentry = window.Sentry || {};

  /* ---------- inline SVG icon set (24x24 outline style) ---------- */
  const ICONS = {
    dash:     '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
    network:  '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.5 11 15.5 6.2M8.5 13l7 4.8"/>',
    shield:   '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    book:     '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    settings: '<line x1="4" y1="6" x2="20" y2="6"/><circle cx="14" cy="6" r="2.2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="9" cy="12" r="2.2"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="16" cy="18" r="2.2"/>',
    search:   '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>',
    bell:     '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
    key:      '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.8 12.2 8.7-8.7"/><path d="m15.5 7.5 3 3"/><path d="m18.5 4.5 2 2"/>',
    bug:      '<ellipse cx="12" cy="12" rx="6" ry="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M6 8.5H2.5M6 13H2.5M17.5 8.5H21M17.5 13H21M6.5 18.5 3.5 21M17.5 18.5 20.5 21M6.5 5.5 3.5 3M17.5 5.5 20.5 3"/>',
    lock:     '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    wifi:     '<path d="M5 12.6a11 11 0 0 1 14 0"/><path d="M8.5 16a6 6 0 0 1 7 0"/><path d="M2 8.9a15 15 0 0 1 20 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none"/>',
    award:    '<circle cx="12" cy="9" r="6"/><path d="m9 14.5-1.5 7L12 19l4.5 2.5L15 14.5"/>',
    bolt:     '<path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/>',
    list:     '<line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="0.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="0.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="0.5" fill="currentColor" stroke="none"/>',
    server:   '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><circle cx="7" cy="7" r="0.6" fill="currentColor" stroke="none"/><circle cx="7" cy="17" r="0.6" fill="currentColor" stroke="none"/>',
    cpu:      '<rect x="5.5" y="5.5" width="13" height="13" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 1.5v4M15 1.5v4M9 18.5v4M15 18.5v4M1.5 9h4M1.5 15h4M18.5 9h4M18.5 15h4"/>',
    laptop:   '<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M1.5 20h21c-.6-2-2-3.5-4-3.5H5.5c-2 0-3.4 1.5-4 3.5z"/>',
    monitor:  '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8.5 20h7M12 16v4"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    radar:    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none"/><path d="M12 12 18 6M12 12 16 16.5"/>',
    refresh:  '<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>',
    chevronr: '<polyline points="9 6 15 12 9 18"/>',
    x:        '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    check:    '<polyline points="20 6 9 17 4 12"/>',
    alert:    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    filter:   '<path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    logout:   '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    info:     '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 12v4"/>',
    play:     '<polygon points="6 4 20 12 6 20 6 4"/>',
    globe:    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
  };

  S.icon = function (name, size) {
    size = size || 16;
    var body = ICONS[name] || ICONS.info;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
  };
  S.hasIcon = function (name) { return !!ICONS[name]; };

  /* ---------- DOM helper ---------- */
  S.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "dataset") Object.assign(node.dataset, attrs[k]);
        else if (attrs[k] === false || attrs[k] === null) node.removeAttribute(k);
        else node.setAttribute(k, attrs[k]);
      });
    }
    var list = Array.isArray(children) ? children : (children == null ? [] : [children]);
    list.forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  };

  S.esc = function (str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ---------- tiny event bus ---------- */
  const listeners = {};
  S.on = function (name, fn) {
    (listeners[name] = listeners[name] || []).push(fn);
    // returns an unsubscribe function so views can clean up cleanly
    return function off() {
      const arr = listeners[name];
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i !== -1) arr.splice(i, 1);
    };
  };
  S.emit = function (name, data) {
    (listeners[name] || []).slice().forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });
  };

  /* ---------- formatting ---------- */
  S.fmtTime = function (iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  S.fmtDateTime = function (iso) {
    const d = new Date(iso);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  S.relTime = function (iso) {
    const secs = Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000));
    if (secs < 60) return secs + "s ago";
    const mins = Math.round(secs / 60);
    if (mins < 60) return mins + "m ago";
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return Math.round(hrs / 24) + "d ago";
  };

  /* ---------- toast notifications ---------- */
  S.toast = function (message, type) {
    const stack = document.getElementById("toasts");
    type = type || "info";
    const t = S.el("div", { class: "toast " + type, role: "status" }, [
      S.el("span", { class: "t-ic", html: S.icon(type === "success" ? "check" : type === "error" ? "alert" : type === "warn" ? "alert" : "info", 16) }),
      S.el("span", { text: message })
    ]);
    stack.appendChild(t);
    const kill = () => {
      t.classList.add("leaving");
      setTimeout(() => t.remove(), 260);
    };
    t.addEventListener("click", kill);
    setTimeout(kill, 4200);
  };

  /* ---------- confirm dialog (promise based) ---------- */
  S.confirm = function (title, text, confirmLabel) {
    const bk = document.getElementById("modalBackdrop");
    const titleEl = document.getElementById("modalTitle");
    const textEl = document.getElementById("modalText");
    const okBtn = document.getElementById("modalConfirm");
    const cancelBtn = document.getElementById("modalCancel");
    okBtn.textContent = confirmLabel || "Confirm";

    return new Promise(function (resolve) {
      titleEl.textContent = title;
      textEl.textContent = text;
      bk.hidden = false;
      const fin = (val) => {
        bk.hidden = true;
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKey);
        resolve(val);
      };
      const onOk = () => fin(true);
      const onCancel = () => fin(false);
      const onKey = (e) => { if (e.key === "Escape") onCancel(); };
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKey);
      okBtn.focus();
    });
  };

  /* ---------- close any open panels helper (used by Esc) ---------- */
  S.closeAllPanels = function () {
    S.emit("ui:close-panels");
  };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") S.closeAllPanels();
  });

  S.debounce = function (fn, wait) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  };
})();