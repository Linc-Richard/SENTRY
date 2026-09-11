/* ============================================================
   SENTRY — app.js
   ------------------------------------------------------------
   Bootstrap + application shell wiring:
     • boot splash + initial navigation
     • mobile drawer sidebar
     • global search with cross-view results
     • notifications dropdown (derived from the log feed)
     • profile menu, keyboard shortcuts, footer shield
   Everything the shell needs from the store/logs is initialised
   here after all view modules have registered themselves.
   ============================================================ */
(function () {
  const S = window.Sentry = window.Sentry || {};
  const Data = S.Data;

  /* ---------- boot ---------- */
  function boot() {
    const bootEl = document.getElementById("boot");
    const hold = 850;

    S.Logs.init();          // load or seed the activity feed
    S.Settings.load();      // apply persisted display preferences
    S.Sim.start();          // start the live (simulated) activity engine

    buildSearchIndex();
    updateShield();
    refreshBadge();
    wireShell();

    window.setTimeout(() => {
      bootEl.style.opacity = "0";
      bootEl.style.transition = "opacity .4s ease";
      window.setTimeout(() => bootEl.remove(), 420);
      S.Router.navigate("overview");
    }, hold);
  }

  /* ---------- footer shield ---------- */
  function updateShield() {
    const el = document.getElementById("footShield");
    if (el) el.textContent = S.Metrics.compute().score + "%";
  }
  S.on("app:refresh-shell", updateShield);
  S.on("progress:updated", updateShield);

  /* ==========================================================
     MOBILE DRAWER
     ========================================================== */
  function wireShell() {
    const menuBtn = document.getElementById("menuBtn");
    const backdrop = document.getElementById("backdrop");
    const sidebar = document.getElementById("sidebar");

    function setOpen(open) {
      document.body.classList.toggle("sidebar-open", open);
      const kb = document.querySelector(".menu-btn");
      if (kb) kb.setAttribute("aria-expanded", String(open));
      backdrop.hidden = !open;
    }

    menuBtn.addEventListener("click", () => setOpen(!document.body.classList.contains("sidebar-open")));
    backdrop.addEventListener("click", () => setOpen(false));

    // close the drawer whenever a view is opened from it
    S.on("ui:mobile-close", () => setOpen(false));
    S.on("ui:close-panels", () => setOpen(false));

    /* ---------- global keyboard shortcuts ---------- */
    let gSeen = false;
    document.addEventListener("keydown", (e) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(e.target.tagName) ||
                     e.target.isContentEditable;
      if (e.key === "Escape") return;   // handled by ui.js (close panels)
      if (e.key === "?") { e.preventDefault(); openSpell(); return; }
      if (e.key === "/" && !typing) { e.preventDefault(); focusSearch(); return; }
      if (!typing && e.key.toLowerCase() === "g") { gSeen = true; setTimeout(() => gSeen = false, 1200); return; }
      if (!typing && e.key.toLowerCase() === "n" && gSeen) { gSeen = false; S.Router.navigate("network"); }
    });

    /* ---------- profile menu ---------- */
    const profileBtn = document.getElementById("profileBtn");
    const profileDD = document.getElementById("profileDropdown");
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = profileDD.hidden;
      profileDD.hidden = !open;
      profileBtn.setAttribute("aria-expanded", String(open));
      notifDD.hidden = true;
      notifBtn.setAttribute("aria-expanded", "false");
    });
    profileDD.querySelectorAll(".dd-item").forEach(btn => {
      btn.addEventListener("click", () => { profileDD.hidden = true; profileBtn.setAttribute("aria-expanded", "false"); });
    });
    profileDD.querySelector('[data-action="help"]').addEventListener("click", openSpell);
    profileDD.querySelector('[data-action="about"]').addEventListener("click", openAbout);
    profileDD.querySelector('[data-action="signout"]').addEventListener("click", () => {
      S.toast("Demo session — no real account. Everything stays local.", "info");
    });

    /* ---------- notifications ---------- */
    const notifBtn = document.getElementById("notifBtn");
    const notifDD = document.getElementById("notifDropdown");
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = notifDD.hidden;
      notifDD.hidden = !open;
      notifBtn.setAttribute("aria-expanded", String(open));
      profileDD.hidden = true;
      profileBtn.setAttribute("aria-expanded", "false");
      if (open) {
        renderNotifications();
        Logs.markAllRead();
        refreshBadge();
      }
    });
    document.getElementById("markReadBtn").addEventListener("click", () => { Logs.markAllRead(); refreshBadge(); });
    S.on("logs:updated", (ev) => {
      refreshBadge();
      if (ev && (ev.sev === "high" || ev.sev === "critical")) {
        S.toast("High-severity signal: " + ev.msg, "warn");
        if (notifDD && !notifDD.hidden) renderNotifications();
      }
    });

    // clicking outside any dropdown closes it
    document.addEventListener("click", () => { profileDD.hidden = true; notifDD.hidden = true; });
    S.on("ui:close-panels", () => { profileDD.hidden = true; notifDD.hidden = true; hideSearch(); closeSpell(); });
  }

  /* small facade for unread notification state */
  const Logs = {
    unreadCount() {
      const readSerial = SentryStore.getReadSerial();
      return S.Logs.alerts().filter(a => a.serial > readSerial).length;
    },
    markAllRead() {
      const all = S.Logs.all();
      const max = all.length ? all[all.length - 1].serial : 0;
      SentryStore.saveReadSerial(max);
    }
  };

  function refreshBadge() {
    const unread = Logs.unreadCount();
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    badge.hidden = unread === 0;
    badge.textContent = unread;
  }

  function renderNotifications() {
    const list = document.getElementById("notifList");
    const items = S.Logs.alerts().slice(0, 10);
    if (!items.length) { list.innerHTML = '<div class="dd-empty">No high-severity signals yet.</div>'; return; }
    list.innerHTML = "";
    items.forEach(l => {
      const page = document.createElement("button");
      page.type = "button";
      page.className = "dd-item";
      page.innerHTML =
        '<div style="display:flex;gap:10px;align-items:flex-start">' +
        '<span style="color:' + (l.sev === "critical" ? "var(--red)" : "var(--amber)") + '">' +
        S.icon(l.sev === "critical" ? "alert" : "alert", 15) + "</span>" +
        '<span><b style="text-transform:uppercase;letter-spacing:.04em;font-size:.72rem">' + l.type + "</b><br>" +
        S.esc(l.msg) + '<br><span style="font-size:.7rem;color:var(--dim)">' + S.relTime(l.ts) + "</span></span></div>";
      page.addEventListener("click", () => S.Router.navigate("logs"));
      list.appendChild(page);
    });
  }

  /* ==========================================================
     GLOBAL SEARCH
     ========================================================== */
  let searchIndex = [];

  function buildSearchIndex() {
    searchIndex = [];
    S.Router.NAV.forEach(v => searchIndex.push({ cat: "Views", icon: v.icon, label: v.label, sub: "Jump to section", goto: v.id }));
    Data.challenges.forEach(c => searchIndex.push({ cat: "Challenges", icon: c.icon, label: c.title, sub: c.topic + " · " + c.points + " pts", goto: "challenges", cid: c.id }));
    Data.lessons.forEach(l => searchIndex.push({ cat: "Lessons", icon: l.icon, label: l.title, sub: l.topic + " · " + l.minutes + " min", goto: "learning" }));
    Data.devices.forEach(d => searchIndex.push({ cat: "Devices", icon: d.type, label: d.label, sub: d.ip + " · " + d.status, goto: "network" }));
    S.Logs.all().slice(-6).forEach(l => searchIndex.push({ cat: "Recent logs", icon: "list", label: l.msg, sub: l.type + " · " + l.sev, goto: "logs" }));
  }

  function focusSearch() { document.getElementById("searchInput").focus(); document.getElementById("searchInput").select(); }

  function hideSearch() {
    const res = document.getElementById("searchResults");
    res.hidden = true;
    document.getElementById("searchClear").style.display = "none";
  }

  function renderSearchResults(query) {
    const q = query.toLowerCase();
    const res = document.getElementById("searchResults");
    res.innerHTML = "";
    if (!q) { hideSearch(); return; }
    const matches = [];
    const seen = {};
    searchIndex.forEach(entry => {
      if (matches.length >= 12 || seen[entry.label + entry.cat]) return;
      if ((entry.label + " " + entry.sub).toLowerCase().indexOf(q) !== -1) {
        seen[entry.label + entry.cat] = true;
        matches.push(entry);
      }
    });
    if (!matches.length) {
      res.innerHTML = '<div class="search-empty">No results for "' + S.esc(query) + '".</div>';
      res.hidden = false;
      return;
    }
    let lastCat = null;
    matches.forEach(m => {
      if (m.cat !== lastCat) {
        res.appendChild(S.el("div", { class: "search-group", text: m.cat }));
        lastCat = m.cat;
      }
      const item = S.el("button", { class: "search-item", type: "button", "data-goto": m.goto }, [
        S.el("span", { class: "si-ic", html: S.icon(m.icon, 14) }),
        S.el("span", { text: m.label }),
        S.el("span", { class: "si-k", text: m.sub })
      ]);
      item.addEventListener("click", () => {
        hideSearch();
        document.getElementById("searchInput").value = "";
        S.Router.navigate(m.goto);
        if (m.goto === "challenges" && m.cid) S.Challenges.open(m.cid);
      });
      res.appendChild(item);
    });
    res.hidden = false;
  }

  function wireSearch() {
    const input = document.getElementById("searchInput");
    const res = document.getElementById("searchResults");
    const clearBtn = document.getElementById("searchClear");

    input.addEventListener("input", () => {
      clearBtn.style.display = input.value ? "block" : "none";
      renderSearchResults(input.value);
    });
    clearBtn.addEventListener("click", () => { input.value = ""; hideSearch(); input.focus(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideSearch();
      if (e.key === "Enter") {
        const first = res.querySelector(".search-item");
        if (first) first.click();
      }
    });
    // keep open while interacting with results
    res.addEventListener("click", (e) => e.stopPropagation());
  }

  /* ==========================================================
     HELP & ABOUT PANELS
     ========================================================== */
  function openSpell() {
    document.getElementById("spellBackdrop").hidden = false;
  }
  function closeSpell() {
    document.getElementById("spellBackdrop").hidden = true;
  }
  document.getElementById("spellClose").addEventListener("click", closeSpell);
  document.getElementById("spellBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "spellBackdrop") closeSpell();
  });

  async function openAbout() {
    const cancel = document.getElementById("modalCancel");
    cancel.style.display = "none";
    await S.confirm(
      "About SENTRY",
      "A simulated Security Operations Centre dashboard — a portfolio project.\n\nAll devices, logs, challenges and terminal output are generated locally in your browser. Nothing scans networks, executes system commands or sends data anywhere. No external libraries, no build step.",
      "Close"
    );
    cancel.style.display = "";
  }

  /* initiator */
  wireSearch();

  // boot once the whole DOM + every module is ready
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();