/* ============================================================
   SENTRY — dashboard.js
   ------------------------------------------------------------
   Overview dashboard.
   Also hosts the shared security-score engine (S.Metrics) which
   other views lean on for the footer shield + the Elite badge.
   ============================================================ */
(function () {
  const S = window.Sentry = window.Sentry || {};
  const Data = S.Data;

  /* ---------- security score engine ---------- */
  S.Metrics = {
    compute() {
      const progress = S.Progress ? S.Progress.get() : { completed: [], lessons: [] };
      const devices = Data.devices;
      const online = devices.filter(d => d.status === "online").length;

      const health = Math.round((online / devices.length) * 100);
      const totalPts = Data.challenges.reduce((a, c) => a + c.points, 0);
      const earnedPts = Data.challenges.reduce((a, c) => a + (progress.scores[c.id] || 0), 0);
      const challengesPct = totalPts ? Math.round((earnedPts / totalPts) * 100) : 0;
      const lessonsPct = Math.round((progress.lessons.length / Data.lessons.length) * 100);
      const hygiene = Math.round((challengesPct + lessonsPct) / 2);

      // weighted — system health matters most in a SOC view
      const score = Math.round(health * 0.4 + challengesPct * 0.3 + lessonsPct * 0.2 + hygiene * 0.1);

      return {
        score, health, challengesPct, lessonsPct, hygiene,
        online, total: devices.length,
        challengesDone: progress.completed.length, challengesTotal: Data.challenges.length,
        lessonsDone: progress.lessons.length, lessonsTotal: Data.lessons.length,
        earnedPts, totalPts
      };
    }
  };

  /* ---------- sparkline helpers ---------- */
  const RING_C = 2 * Math.PI * 44; // 44-radius ring circumference

  function ringSVG(score) {
    const color = score >= 80 ? "#00e07a" : score >= 50 ? "#00e5ff" : "#ffb020";
    const filled = (score / 100) * RING_C;
    return '<svg class="score-ring" viewBox="0 0 104 104" role="img" aria-label="Security score ' + score + ' of 100">' +
      '<circle class="ring-track" cx="52" cy="52" r="44"></circle>' +
      '<circle class="ring-fill" cx="52" cy="52" r="44" stroke="' + color + '" ' +
      'stroke-dasharray="' + filled.toFixed(2) + ' ' + RING_C.toFixed(2) + '" ' +
      'transform="rotate(-90 52 52)"></circle>' +
      '<text class="ring-label" x="52" y="50" text-anchor="middle">' + score + '</text>' +
      '<text class="ring-sub" x="52" y="59" text-anchor="middle">/ 100</text></svg>';
  }

  function barRow(k, v, cls) {
    return '<div class="bar-row"><span class="k">' + k + '</span>' +
      '<div class="progress"><span style="width:' + v + '%"></span></div>' +
      '<span class="v">' + v + '%</span></div>';
  }

  function sparkline(points) {
    const w = 300, h = 120, pad = 6;
    if (!points.length) return '<p class="slot-hint">Waiting for traffic…</p>';
    const max = Math.max(...points, 1);
    const step = (w - pad * 2) / (points.length - 1);
    const xy = points.map((p, i) => {
      const x = pad + i * step;
      const y = h - pad - (p / max) * (h - pad * 2);
      return [x.toFixed(1), y.toFixed(1)];
    });
    const line = xy.map((pt, i) => (i ? "L" : "M") + pt[0] + " " + pt[1]).join(" ");
    const area = line + " L" + (w - pad) + " " + (h - pad) + " L" + pad + " " + (h - pad) + " Z";
    const last = xy[xy.length - 1];
    return '<svg class="spark-box" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#00e5ff" stop-opacity=".25"/><stop offset="1" stop-color="#00e5ff" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="spark-area" d="' + area + '"></path>' +
      '<path class="spark-line" d="' + line + '"></path>' +
      '<circle class="spark-gdot" cx="' + last[0] + '" cy="' + last[1] + '" r="2.5"></circle></svg>';
  }

  /* ---------- view ---------- */
  const view = {
    id: "overview",
    title: "Overview",

    render(host) {
      const m = S.Metrics.compute();

      // ---- stat cards ----
      const stat = (icon, val, lbl, del) =>
        '<div class="card stat-card"><div class="ic">' + S.icon(icon, 18) + "</div>" +
        '<div class="val">' + val + '</div><div class="lbl">' + lbl + "</div>" +
        (del ? '<div class="delta">' + del + "</div>" : "") + "</div>";

      const eventsToday = S.Logs.all().filter(l => Date.now() - new Date(l.ts) < 86400000).length;

      const head = S.el("div", { class: "view-head" }, [
        S.el("div", {}, [
          S.el("h2", { text: "Command overview" }),
          S.el("p", { text: "A live snapshot of your simulated organisation — training, endpoints and recent signals." })
        ]),
        S.el("div", {}, [ S.el("button", { class: "btn ghost small", type: "button", id: "dashRefresh" }, ["Refresh"]) ])
      ]);

      const stats = S.el("div", {
        class: "grid grid-4",
        html: stat("shield", m.online + "/" + m.total, "Active virtual devices", "Online endpoints, gateway & servers") +
              stat("bolt", m.challengesDone + "/" + m.challengesTotal, "Completed challenges", m.earnedPts + "/" + m.totalPts + " points earned") +
              stat("book", m.lessonsDone + "/" + m.lessonsTotal, "Learning progress", m.lessonsPct + "% of curriculum read") +
              stat("alert", eventsToday, "Events · last 24 h", "Simulated activity feed")
      });

      // ---- hero: score + breakdown ----
      const breakdown = S.el("div", { class: "card breakdown" }, [
        S.el("div", { class: "card-title" }, [
          S.el("h3", { text: "Score breakdown" }),
          S.el("span", { class: "sub", text: "weighted composite" })
        ]),
        S.el("div", { html:
          barRow("System health", m.health) +
          barRow("Challenges", m.challengesPct) +
          barRow("Lessons", m.lessonsPct) +
          barRow("Best practice", m.hygiene) })
      ]);

      const scoreCard = S.el("div", { class: "card hero-score" }, [
        S.el("div", { html: ringSVG(m.score) }),
        S.el("div", { class: "lbl", text: "Security score · target 80" })
      ]);
      scoreCard.appendChild(S.el("div", {
        class: "slot-hint",
        html: m.score >= 80 ? "Strong posture. Keep watching the logs."
                            : "Complete labs & lessons to raise the score."
      }));

      const hero = S.el("div", { class: "dash-hero" }, [scoreCard, breakdown]);

      // ---- network activity + recent events ----
      const activity = S.el("div", { class: "card" }, [
        S.el("div", { class: "card-title" }, [
          S.el("h3", { text: "Network activity" }),
          S.el("span", { class: "sub", id: "dashActivitySub" })
        ]),
        S.el("div", { class: "spark-wrap" })
      ]);
      const drawSpark = () => {
        const pts = S.Sim.historyCopy();
        activity.querySelector(".spark-wrap").innerHTML = sparkline(pts);
        activity.querySelector("#dashActivitySub").textContent =
          "last " + pts.length + " samples · live";
      };

      const recent = S.el("div", { class: "card" }, [
        S.el("div", { class: "card-title" }, [
          S.el("h3", { text: "Recent security events" }),
          S.el("button", { class: "linkbtn", "data-goto": "logs", text: "View all →" })
        ]),
        S.el("div", { class: "event-list", id: "dashEvents" })
      ]);
      const drawEvents = () => {
        recent.querySelector("#dashEvents").innerHTML = eventRows(
          S.Logs.all().slice(-5).reverse()
        ) || emptyChip();
      };

      const activity2 = S.el("div", { class: "grid grid-2" }, [activity, recent]);

      // ---- network status + next step ----
      const statusRows = [
        ["Edge Gateway", "online"], ["Perimeter firewall", "online"],
        ["IDS signatures", m.health >= 90 ? "current" : "pending"],
        ["Backup schedule", "armed for 02:00"], ["VPN endpoint", "reachable"]
      ].map(r => '<div class="net-status-row"><span class="dot ' + (r[1] !== "pending" ? "online" : "warn") + '"></span>' +
        '<span class="k">' + r[0] + "</span><span class='mono' style='margin-left:auto'>" + r[1] + "</span></div>").join("");

      const netStatus = S.el("div", { class: "card" }, [
        S.el("div", { class: "card-title" }, [S.el("h3", { text: "Network status" })]),
        S.el("div", { html: statusRows })
      ]);

      const next = S.el("div", { class: "card" }, [
        S.el("div", { class: "card-title" }, [S.el("h3", { text: "Next recommended step" })]),
        nextStepEl()
      ]);

      // ---- assemble ----
      host.append(head, stats, hero, activity2, S.el("div", { class: "grid grid-2" }, [netStatus, next]));

      drawSpark();
      drawEvents();

      // ---- interactions ----
      host.querySelector("[data-goto=logs]").addEventListener("click", () => S.Router.navigate("logs"));
      host.querySelector("#dashRefresh").addEventListener("click", () => {
        S.toast("Feed refreshed — " + S.Sim.history().length + " samples loaded.", "success");
        drawSpark();
      });

      // live updates handled in onShow/onHide below
      const unSpark = S.on("sim:tick", () => { if (S.Router.currentId() === "overview") drawSpark(); });
      const unLogs = S.on("logs:updated", () => {
        if (S.Router.currentId() === "overview") drawEvents();
      });
      view.__clean = () => { unSpark(); unLogs(); };
    },

    onHide() { if (view.__clean) view.__clean(); }
  };

  /* recent-events rendering, shared with other spots */
  function eventRows(list) {
    return list.map(l => {
      const dev = Data.getDevice(l.device);
      const hm = l.sev === "high" || l.sev === "critical";
      return '<div class="ev-row"><div class="ev-ic ' + (hm ? l.sev : "") + '">' +
        S.icon(hm ? "alert" : "bell", 15) + "</div>" +
        '<div class="ev-m"><b>' + S.esc(l.msg) + "</b>" +
        '<div class="ev-mt">' + S.esc(dev ? dev.label : l.device) + " · " + l.type + " · " + S.relTime(l.ts) + "</div></div></div>";
    }).join("");
  }
  function emptyChip() {
    return '<div class="empty-state" style="padding:24px">' +
      '<p>No events match yet.</p></div>';
  }

  function nextStepEl() {
    const prog = S.Progress.get();
    const firstTodo = Data.challenges.find(c => !prog.completed.includes(c.id));
    const lessonTodo = Data.lessons.find(l => !prog.lessons.includes(l.id));
    if (firstTodo) {
      const b = S.el("button", { class: "btn primary", "data-goto": "challenges" },
        [S.el("span", { html: S.icon(firstTodo.icon, 15) }), S.el("span", { text: "Take on: " + firstTodo.title })]);
      const box = S.el("div", { class: "obj-box", html:
        "<b>Training gap.</b> You haven't cleared <b>" + S.esc(firstTodo.title) +
        "</b> yet — " + firstTodo.points + " pts on the table." });
      box.appendChild(S.el("div", { style: "margin-top:12px" }, [b]));
      return box;
    }
    if (lessonTodo) {
      const b = S.el("button", { class: "btn", "data-goto": "learning" },
        [S.el("span", { text: "Read: " + lessonTodo.title })]);
      const box = S.el("div", { class: "obj-box", html: "<b>Deepen your base.</b> Finish the <b>" + S.esc(lessonTodo.title) + "</b> lesson." });
      box.appendChild(S.el("div", { style: "margin-top:12px" }, [b]));
      return box;
    }
    return S.el("div", { class: "obj-box", html: "<b>All caught up.</b> Curriculum complete — drop by the <b>Activity Logs</b> to keep watching the feed." });
  }

  // attach the shared recent-events renderer
  S.sharedEvents = eventRows;

  S.Router.register(view);
})();