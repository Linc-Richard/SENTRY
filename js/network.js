/* ============================================================
   SENTRY — network.js
   ------------------------------------------------------------
   Network Monitor view + the shared live activity simulator
   (S.Sim). All devices, links and events are strictly local and
   simulated — nothing scans a real network or executes system
   commands.
   ============================================================ */
(function () {
  const S = window.Sentry = window.Sentry || {};
  const Data = S.Data;

  /* ==========================================================
     SHARED SIMULATION ENGINE
     Runs constantly once booted. Keeps a short traffic history
     for the dashboard sparkline and occasionally appends a fake
     security event to the activity log.
     ========================================================== */
  const Sim = {
    history: [],
    MAX: 48,
    _timer: null,

    start() {
      if (this._timer) return;
      if (!this.history.length) {
        for (let i = 0; i < this.MAX; i++) this.history.push(25 + Math.random() * 60);
      }
      this._timer = setInterval(() => this.tick(), 2200);
    },

    stop() { clearInterval(this._timer); this._timer = null; },

    tick() {
      if (document.hidden) return; // don't churn in the background tab
      const spawned = Math.random() < 0.45;
      let sample = 30 + Math.random() * 55 + (spawned ? 35 : 0);
      sample = Math.min(100, sample);
      this.history.push(Math.round(sample));
      if (this.history.length > this.MAX) this.history.shift();

      if (spawned) {
        const ev = Data.genEvent();
        S.Logs.add(ev);   // S.Logs is defined in logs.js (loaded + ready by boot time)
      }
      S.emit("sim:tick", { sample: sample });
    },

    historyCopy() { return this.history.slice(); }
  };
  S.Sim = Sim;

  /* ---------- device → icon ---------- */
  const typeIcon = {
    router: "network", firewall: "shield", server: "server",
    database: "database", workstation: "monitor", laptop: "laptop", sensor: "radar"
  };

  let selectedId = null;
  let animTimer = null;

  /* ==========================================================
     TOPOLOGY SVG — clickable nodes, subtle animated packets
     ========================================================== */
  function topoSvg() {
    const svg = S.el("svg", {
      class: "topo", viewBox: "0 0 100 56",
      role: "img", "aria-label": "Simulated network topology diagram"
    });

    // connections
    Data.topology.forEach(pair => {
      const a = Data.getDevice(pair[0]), b = Data.getDevice(pair[1]);
      if (!a || !b) return;
      svg.appendChild(S.el("line", {
        class: "topo-link", x1: a.topo.x, y1: a.topo.y, x2: b.topo.x, y2: b.topo.y
      }));
    });

    // nodes
    Data.devices.forEach(d => {
      const g = S.el("g", { class: "topo-node", "data-id": d.id, tabindex: "0", role: "button",
        "aria-label": d.label + ", " + d.status });
      g.appendChild(S.el("circle", { class: "main " + d.status + (selectedId === d.id ? " selected" : ""),
        cx: d.topo.x, cy: d.topo.y, r: 4.7 }));
      g.appendChild(S.el("text", { x: d.topo.x, y: d.topo.y + 8.6, "text-anchor": "middle" },
        [d.label]));
      g.addEventListener("click", () => select(d.id));
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(d.id); } });
      svg.appendChild(g);
    });

    // packet dots, moved by animatePackets()
    const packetEls = [];
    for (let i = 0; i < 7; i++) packetEls.push(S.el("circle", { class: "topo-packet", r: 0.65 }));
    packetEls.forEach(p => svg.appendChild(p));
    svg.__packets = packetEls;
    return svg;
  }

  function animatePackets(svg) {
    if (animTimer) { clearInterval(animTimer); animTimer = null; }
    const links = Data.topology.map(pair => {
      const a = Data.getDevice(pair[0]), b = Data.getDevice(pair[1]);
      if (!a || !b) return null;
      return { ax: a.topo.x, ay: a.topo.y, bx: b.topo.x, by: b.topo.y, online: a.status === "online" && b.status === "online" };
    }).filter(Boolean);

    const pkts = svg.__packets.map(() => ({ li: null, t: 0 }));
    animTimer = setInterval(() => {
      if (document.hidden || !svg.isConnected) return;
      pkts.forEach((p, i) => {
        if (p.li === null || p.t >= 1) {
          // (re)assign to a random link, prefer online ones 4:1
          const pool = links.filter(l => l.online);
          const all = links.length ? links : pool;
          const pick = pool.length && Math.random() < 0.8 ? pool : all;
          p.li = pick[(Math.random() * pick.length) | 0] || links[0];
          p.t = 0;
        }
        p.t += 0.04;
        const L = p.li;
        const x = L.ax + p.t * (L.bx - L.ax);
        const y = L.ay + p.t * (L.by - L.ay);
        const el = pkts[i];
        el.setAttribute("cx", x.toFixed(2));
        el.setAttribute("cy", y.toFixed(2));
        el.style.display = L.online ? "" : "none";
      });
    }, 90);
  }

  /* ==========================================================
     DEVICE GRID
     ========================================================== */
  function deviceGrid() {
    const grid = S.el("div", { class: "device-grid", role: "list" });
    Data.devices.forEach(d => {
      const off = d.status !== "online";
      const card = S.el("button", {
        class: "device-card" + (off ? " offline" : "") + (selectedId === d.id ? " selected" : ""),
        type: "button", role: "listitem",
        "aria-pressed": String(selectedId === d.id),
        "aria-label": d.label + ", " + d.status
      });
      card.innerHTML =
        '<span class="dc-top"><span class="dc-ic">' + S.icon(typeIcon[d.type] || "server", 16) + "</span>" +
        '<span class="dot ' + (off ? "offline" : "online") + '"></span></span>' +
        '<span class="dc-name">' + S.esc(d.label) + '</span>' +
        '<span class="dc-role">' + S.esc(d.role) + "</span>" +
        '<span class="dc-meta">' +
          '<span class="mono">' + d.ip + "</span>" +
        "</span>" +
        '<span class="dc-meta">' +
          '<span>CPU <b>' + d.cpu + "%</b></span>" +
          '<span>MEM <b>' + d.mem + "%</b></span>" +
        "</span>";
      card.addEventListener("click", () => select(d.id));
      grid.appendChild(card);
    });
    return grid;
  }

  /* ==========================================================
     DEVICE DETAIL PANEL
     ========================================================== */
  function devicePanel() {
    const panel = S.el("div", { class: "card device-panel" });
    const d = Data.getDevice(selectedId);

    if (!d) {
      panel.innerHTML =
        '<div class="empty-state" style="padding:30px 12px"><div class="es-ic">' +
        S.icon("network", 22) + "</div><h3>No device selected</h3>" +
        "<p>Click a node on the map or a device card to inspect it.</p></div>";
      return panel;
    }

    const off = d.status !== "online";
    const chip = '<span class="chip ' + (off ? "sev-high" : "sev-low") + '">' + d.status + "</span>";

    const head = S.el("div", {}, [
      S.el("div", { class: "card-title" }, [
        S.el("h3", { html: S.icon(typeIcon[d.type] || "server", 15) + " " + S.esc(d.label) + " " + chip }),
        S.el("span", { class: "sub mono", text: d.ip })
      ])
    ]);

    const actions = S.el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px" }, [
      S.el("button", { type: "button", class: "btn small " + (off ? "primary" : "danger"), id: "devToggle" },
        [S.el("span", { text: off ? "Reconnect" : "Isolate" })]),
      S.el("button", { type: "button", class: "btn small", id: "devPing" },
        [S.el("span", { html: S.icon("network", 13) }), S.el("span", { text: "Ping" })]),
      S.el("button", { type: "button", class: "btn small ghost", id: "devLogs", "data-goto": "logs" },
        [S.el("span", { text: "Open logs" })])
    ]);
    actions.querySelector("#devLogs").addEventListener("click", () => S.Router.navigate("logs"));

    actions.querySelector("#devToggle").addEventListener("click", () => toggleStatus(d, off));
    actions.querySelector("#devPing").addEventListener("click", () => {
      const out = panel.querySelector("#devConsole");
      out.insertAdjacentHTML("beforeend",
        '<div class="cnsl-row"><span class="when">now</span><span class="what mono good">reply from ' + d.ip +
        ': icmp_seq=1 ttl=63 time=1.2 ms (simulated)</span></div>');
      out.scrollTop = out.scrollHeight;
      S.toast("Ping to " + d.ip + " — 0% loss.", "success");
    });

    const bars = (label, pct, hi) =>
      '<div class="detail-row"><span class="k">' + label + '</span>' +
      '<span class="v"><span class="busy' + (hi ? " hi" : "") + '"><span style="width:' + pct + '%"></span></span> ' + pct + "%</span></div>";

    const detail = S.el("div", {}, [
      S.el("h4", { class: "card-title", text: "Details" }),
      S.el("div", { html:
        '<div class="detail-row"><span class="k">Role</span><span class="v">' + S.esc(d.role) + "</span></div>" +
        '<div class="detail-row"><span class="k">OS</span><span class="v">' + S.esc(d.os) + "</span></div>" +
        '<div class="detail-row"><span class="k">MAC</span><span class="v">' + S.esc(d.mac) + "</span></div>" +
        '<div class="detail-row"><span class="k">Uptime</span><span class="v">' + S.esc(d.uptime) + "</span></div>" +
        bars("CPU", d.cpu, d.cpu > 55) + bars("Memory", d.mem, d.mem > 65) + bars("Disk", d.disk, d.disk > 70)
      }),
      S.el("h4", { class: "card-title", text: "Open ports" }),
      S.el("div", { class: "ports-grid", html: d.ports.map(p =>
        '<div class="port-row"><b>' + S.esc(p.port) + '</b><span>' + S.esc(p.service) + "</span>" +
        '<span class="st-' + p.state + '">' + p.state + "</span></div>").join("")
      }),
      S.el("h4", { class: "card-title", text: "Console · " + d.label }),
      S.el("div", { class: "event-list", id: "devConsole", style: "max-height:190px", html:
        consoleRows(d.id) + (consoleRows(d.id) ? "" : '<div class="slot-hint" style="padding:8px 0">No events for this device yet.</div>')
      })
    ]);

    panel.append(head, actions, detail);
    return panel;
  }

  function consoleRows(deviceId) {
    return S.Logs.all().filter(l => l.device === deviceId).slice(-8).reverse().map(l =>
      '<div class="cnsl-row"><span class="when">' + S.relTime(l.ts) + '</span>' +
      '<span class="what">' + S.esc(l.msg) + '</span></div>'
    ).join("");
  }

  /* ==========================================================
     SELECTION + STATUS ACTIONS
     ========================================================== */
  function select(id) {
    selectedId = id;
    S.emit("net:select", id);
  }

  function toggleStatus(d, currentlyOff) {
    d.status = currentlyOff ? "online" : "offline";
    const ev = {
      type: currentlyOff ? "RECONNECT" : "ISOLATE",
      sev: currentlyOff ? "low" : "high",
      device: d.id,
      msg: currentlyOff ? d.label + " restored to the network by operator."
                         : d.label + " isolated by operator for inspection."
    };
    S.Logs.add(ev);
    S.toast(ev.msg, currentlyOff ? "success" : "warn");
    S.Metrics._invalidate = true;
    S.emit("net:refresh");
    S.emit("progress:updated");
  }

  /* ==========================================================
     VIEW
     ========================================================== */
  const view = {
    id: "network",
    title: "Network Monitor",

    render(host) {
      host.appendChild(S.el("div", { class: "view-head" }, [
        S.el("div", {}, [
          S.el("h2", { text: "Network Monitor" }),
          S.el("p", { text: "Every device, link and log line is simulated locally. Select a node to inspect it." })
        ])
      ]));

      // loading state: brief "scan" for realism
      const wrap = S.el("div", { class: "net-wrap" });
      wrap.innerHTML = '<div class="scan-line"><span class="spinner"></span> scanning virtual network…</div>';
      host.appendChild(wrap);

      setTimeout(() => {
        wrap.innerHTML = "";
        wrap.appendChild(view.buildNet());
        view.bindLive();
        animatePackets(view.svgEl);   // animation only runs while this node is attached
      }, 700);
    },

    buildNet() {
      const svg = topoSvg();
      const topoCard = S.el("div", { class: "card topo-card" }, [
        S.el("div", { class: "card-title" }, [
          S.el("h3", { text: "Topology" }),
          S.el("span", { class: "sub", text: "click a node to inspect" })
        ]),
        svg
      ]);

      const split = S.el("div", { class: "net-split" }, [
        S.el("div", {}, [
          S.el("div", { class: "card-title", style: "margin-bottom:10px" }, [
            S.el("h3", { text: "Devices" })
          ]),
          view.gridEl = deviceGrid()
        ]),
        view.panelEl = devicePanel()
      ]);

      const root = S.el("div", {}, [topoCard, split]);
      view.svgEl = svg;
      return root;
    },

    bindLive() {
      // refresh device grid + panel selections when things change
      const refresh = () => {
        const wrap = document.querySelector(".net-wrap");
        if (!wrap) return;
        const gridHost = wrap.querySelector(".device-grid");
        const panelHost = wrap.querySelector(".device-panel");
        if (gridHost) gridHost.replaceWith(deviceGrid());
        if (panelHost) panelHost.replaceWith(devicePanel());
        const svg = wrap.querySelector("svg.topo");
        if (svg) svg.replaceWith(topoSvg());
      };
      view.offRefresh = S.on("net:refresh", refresh);
      animatePackets(view.svgEl);
    },

    onShow() {
      if (!view.svgEl || !view.svgEl.isConnected) return;
      animatePackets(view.svgEl);
      // refresh the panel console when the log feed changes while visible
      view.offLogs = S.on("logs:updated", () => {
        if (S.Router.currentId() !== "network") return;
        const wrap = document.querySelector(".net-wrap");
        const panelHost = wrap && wrap.querySelector(".device-panel");
        if (panelHost) panelHost.replaceWith(devicePanel());
        const gridHost = wrap && wrap.querySelector(".device-grid");
        if (gridHost) gridHost.replaceWith(deviceGrid());
      });
    },

    onHide() {
      if (animTimer) { clearInterval(animTimer); animTimer = null; }
      if (view.offLogs) view.offLogs();
      if (view.offRefresh) view.offRefresh();
    }
  };

  // selecting from anywhere (grid or topology) refreshes highlights
  S.on("net:select", () => {
    if (S.Router.currentId() !== "network") return;
    const wrap = document.querySelector(".net-wrap");
    if (!wrap) return;
    const gridHost = wrap.querySelector(".device-grid");
    const panelHost = wrap.querySelector(".device-panel");
    const oldSvg = wrap.querySelector("svg.topo");
    if (gridHost) gridHost.replaceWith(deviceGrid());
    if (panelHost) panelHost.replaceWith(devicePanel());
    if (oldSvg) { view.svgEl = topoSvg(); oldSvg.replaceWith(view.svgEl); animatePackets(view.svgEl); }
  });

  S.Router.register(view);
})();