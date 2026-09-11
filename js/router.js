/* ============================================================
   SENTRY — router.js
   ------------------------------------------------------------
   Minimal hash-free view router. Views self-register with
   { title, render(container), onShow(), onHide() } and the
   router swaps them inside #viewContent. Because the sidebar
   and the views reference each other, routing is exposed as
   S.Router.navigate(...).
   ============================================================ */
(function () {
  const S = window.Sentry = window.Sentry || {};

  // Sidebar order. Each entry: id, label, icon, shortcut key.
  const NAV = [
    { id: "overview",   label: "Overview",            icon: "dash",     key: "1" },
    { id: "network",    label: "Network Monitor",     icon: "network",  key: "2" },
    { id: "challenges", label: "Security Challenges", icon: "shield",   key: "3" },
    { id: "learning",   label: "Learning Center",     icon: "book",     key: "4" },
    { id: "logs",       label: "Activity Logs",       icon: "list",     key: "5" },
    { id: "settings",   label: "Settings",            icon: "settings", key: "6" }
  ];

  const views = {};
  const navBtns = {};
  let current = null;

  S.Router = {
    NAV: NAV,

    /* Views register themselves, e.g. from dashboard.js */
    register(view) {
      views[view.id] = view;
    },

    navigate(id) {
      if (!views[id]) { console.warn("Unknown view:", id); return; }
      if (current && current === views[id]) { return; }
      if (current && current.onHide) current.onHide();
      current = views[id];

      const host = document.getElementById("viewContent");
      host.innerHTML = "";
      host.scrollTop = 0;

      const titleEl = document.getElementById("pageTitle");
      titleEl.textContent = current.title;

      // highlight the matching nav item (terminal has no nav item)
      Object.keys(navBtns).forEach(nid => {
        const active = nid === id;
        navBtns[nid].classList.toggle("active", active);
        if (active) navBtns[nid].setAttribute("aria-current", "page");
        else navBtns[nid].removeAttribute("aria-current");
      });

      // close the off-canvas sidebar on mobile after navigating
      S.emit("ui:mobile-close");
      S.emit("router:nav", id);

      current.render(host);
      if (current.onShow) current.onShow();
    },

    currentId() { return current ? current.id : null; }
  };

  /* ---------- sidebar construction ---------- */
  function buildNav() {
    const navEl = document.getElementById("sidebarNav");
    NAV.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-item";
      btn.innerHTML = S.icon(item.icon, 17) +
        '<span class="nav-label">' + item.label + "</span>" +
        '<span class="nav-keys">' + item.key + "</span>";
      btn.setAttribute("aria-label", item.label);
      btn.addEventListener("click", () => S.Router.navigate(item.id));
      navEl.appendChild(btn);
      navBtns[item.id] = btn;
    });

    // keyboard shortcuts 1–6 jump straight to a section
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      const item = NAV.find(n => n.key === e.key);
      if (item) { e.preventDefault(); S.Router.navigate(item.id); }
    });
  }

  document.addEventListener("DOMContentLoaded", buildNav);
})();