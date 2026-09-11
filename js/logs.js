/* ============================================================
   SENTRY — logs.js
   ------------------------------------------------------------
   Activity Logs view + the shared in-memory log store (S.Logs)
   that the simulator and device actions append to. Logs persist
   (capped) via SentryStore so they survive reloads.
   ============================================================ */
(function () {
  const S = window.Sentry = window.Sentry || {};
  const Data = S.Data;

  /* ==========================================================
     LOG STORE
     ========================================================== */
  const Logs = {
    _logs: [],

    init() {
      const stored = SentryStore.getLogs();
      if (stored && stored.length) { this._logs = stored; return; }
      this._logs = Data.buildInitialLogs(Data.buildInitialLogs.length);
      this.save();
    },

    save() {
      if (this._logs.length > 250) this._logs = this._logs.slice(-250);
      SentryStore.saveLogs(this._logs);
    },

    all() { return this._logs.slice(); },

    nextSerial() {
      return this._logs.length ? this._logs[this._logs.length - 1].serial + 1 : 1;
    },

    // Called by the simulator and by manual device actions.
    add(ev) {
      this._logs.push({
        serial: this.nextSerial(),
        ts: new Date().toISOString(),
        type: ev.type, sev: ev.sev, device: ev.device, msg: ev.msg
      });
      this.save();
      S.emit("logs:updated", ev);
    },

    clearAll() {
      this._logs = Data.buildInitialLogs(Data.buildInitialLogs.length);
      this.save();
      S.emit("logs:updated");
    },

    // notifications: recent high/critical signals
    alerts() {
      return this._logs.filter(l => l.sev === "high" || l.sev === "critical").reverse();
    }
  };
  S.Logs = Logs;

  /* ==========================================================
     VIEW
     ========================================================== */
  const state = { q: "", sev: "all", dev: "all" };
  let tableHost = null;   // container that holds the live table

  function filtered() {
    const all = Logs.all().slice().reverse(); // newest first
    return all.filter(l => {
      if (state.sev !== "all" && l.sev !== state.sev) return false;
      if (state.dev !== "all" && l.device !== state.dev) return false;
      if (state.q) {
        const hay = (l.msg + " " + l.type + " " + (Data.getDevice(l.device) || {}).label).toLowerCase();
        if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
      }
      return true;
    });
  }

  function drawTable() {
    if (!tableHost) return;
    const rows = filtered();
    const wrap = document.querySelector(".log-table-wrap");

    if (!rows.length) {
      wrap.innerHTML = '<div class="empty-state"><div class="es-ic">' + S.icon("list", 22) + "</div>" +
        "<h3>No matching events</h3><p>Adjust the filters or wait for the simulator to generate new activity.</p></div>";
      return;
    }

    const table = S.el("div", { class: "table-wrap" }, [
      S.el("table", {}, [
        S.el("thead", {}, [S.el("tr", {}, [
          ["Time", "time"], ["Source", ""], ["Type", ""], ["Severity", ""], ["Message", ""]
        ].map(([t]) => S.el("th", { text: t })))]),
        S.el("tbody", {}, rows.map(l => {
          const dev = Data.getDevice(l.device);
          return S.el("tr", {}, [
            S.el("td", { class: "mono", text: S.fmtDateTime(l.ts) }),
            S.el("td", { text: dev ? dev.label : l.device }),
            S.el("td", { class: "mono", text: l.type }),
            S.el("td", {}, [S.el("span", { class: "chip sev-" + l.sev, text: l.sev })]),
            S.el("td", { text: l.msg })
          ]);
        }))
      ])
    ]);
    wrap.innerHTML = "";
    wrap.appendChild(table);
  }

  const view = {
    id: "logs",
    title: "Activity Logs",

    render(host) {
      host.appendChild(S.el("div", { class: "view-head" }, [
        S.el("div", {}, [
          S.el("h2", { text: "Activity Logs" }),
          S.el("p", { text: "A simulated event stream from the virtual network. Search and filter to find what you're after." })
        ]),
        S.el("span", { class: "chip type", text: Logs.all().length + " events captured" })
      ]));

      const toolbar = S.el("div", { class: "card log-toolbar", style: "margin-bottom:16px" }, [
        S.el("div", { class: "field log-sel" }, [
          S.el("div", { class: "icwrap" }, [
            S.icon("search", 14),
            S.el("input", { type: "search", id: "logQ", placeholder: "Search events…", "aria-label": "Search log events" })
          ])
        ]),
        S.el("div", { class: "field", style: "min-width:150px" }, [
          S.el("select", { id: "logSev", "aria-label": "Filter by severity" }, [
            ["all", "All severities"], ["low", "Low"], ["medium", "Medium"], ["high", "High"], ["critical", "Critical"]
          ].map(o => S.el("option", { value: o[0], text: o[1] })))
        ]),
        S.el("div", { class: "field", style: "min-width:170px" }, [
          S.el("select", { id: "logDev", "aria-label": "Filter by source" }, [
            ["all", "All sources"]
          ].concat(Data.devices.map(d => [d.id, d.label])).map(o => S.el("option", { value: o[0], text: o[1] })))
        ]),
        S.el("button", { class: "btn ghost small", type: "button", id: "logReset", text: "Reset filters" })
      ]);

      const tableWrap = S.el("div", { class: "log-table-wrap" });
      host.append(toolbar, tableWrap);
      tableHost = tableWrap;
      drawTable();

      // wire filters
      toolbar.querySelector("#logQ").addEventListener("input", S.debounce(() => {
        state.q = toolbar.querySelector("#logQ").value;
        drawTable();
      }, 180));
      toolbar.querySelector("#logSev").addEventListener("change", (e) => { state.sev = e.target.value; drawTable(); });
      toolbar.querySelector("#logDev").addEventListener("change", (e) => { state.dev = e.target.value; drawTable(); });
      toolbar.querySelector("#logReset").addEventListener("click", () => {
        state.q = ""; state.sev = "all"; state.dev = "all";
        toolbar.querySelector("#logQ").value = "";
        toolbar.querySelector("#logSev").value = "all";
        toolbar.querySelector("#logDev").value = "all";
        drawTable();
        S.toast("Filters cleared.", "info");
      });
    },

    onShow() {
      // keep the table live while this view is visible
      view.off = S.on("logs:updated", () => {
        if (S.Router.currentId() === "logs") drawTable();
      });
    },

    onHide() { if (view.off) view.off(); }
  };

  S.Router.register(view);
})();