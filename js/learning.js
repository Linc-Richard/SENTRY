/* ============================================================
   SENTRY — learning.js
   ------------------------------------------------------------
   Learning Center: beginner-friendly lessons with read tracking,
   an earned-badge gallery, and a quick-launch card for the
   Virtual Terminal.
   ============================================================ */
(function () {
  const S = window.Sentry = window.Sentry || {};
  const Data = S.Data;
  const Progress = S.Progress;

  /* badge criteria — computed fresh whenever anything changes */
  function earnedBadges() {
    const p = Progress.get();
    const m = S.Metrics.compute();
    const rules = {
      first:    p.completed.length >= 1,
      shell:    p.completed.includes("linux-lab"),
      analyst:  p.completed.includes("log-analysis"),
      scholar:  p.lessons.length >= Data.lessons.length,
      guardian: p.completed.length >= Data.challenges.length,
      elite:    m.score >= 75
    };
    return Data.badges.map(b => ({ id: b.id, icon: b.icon, title: b.title, desc: b.desc, earned: !!rules[b.id] }));
  }

  /* ==========================================================
     VIEW
     ========================================================== */
  const view = {
    id: "learning",
    title: "Learning Center",
    mode: "list",
    openId: null,
    _host: null,

    render(host) { this._host = host; this.redraw(); },

    redraw() {
      if (!this._host) return;
      this._host.innerHTML = "";
      if (this.mode === "detail" && this.openId) renderLesson(this._host, this.openId);
      else renderList(this._host);
    },

    openLesson(id) { this.mode = "detail"; this.openId = id; this.redraw(); },
    back() { this.mode = "list"; this.openId = null; this.redraw(); }
  };

  /* ---------- lesson cards ---------- */
  function lessonCard(l) {
    const read = Progress.isLessonRead(l.id);
    const card = S.el("button", { class: "lesson-card" + (read ? " read" : ""), type: "button" });
    card.appendChild(S.el("span", { class: "lc-ic", html: S.icon(l.icon, 17) }));
    card.appendChild(S.el("span", {}, [
      S.el("span", { class: "lc-title", text: l.title }),
      S.el("span", { class: "lc-meta", html: "~" + l.minutes + " min read · " + S.esc(l.topic) })
    ]));
    card.appendChild(S.el("span", { class: "lc-check", html: read ? S.icon("check", 16) : S.icon("chevronr", 16) }));
    card.addEventListener("click", () => view.openLesson(l.id));
    return card;
  }

  function renderList(host) {
    const read = Progress.get().lessons.length;

    host.appendChild(S.el("div", { class: "view-head" }, [
      S.el("div", {}, [
        S.el("h2", { text: "Learning Center" }),
        S.el("p", { text: "Short, plain-English readings for the fundamentals. Mark a lesson as read to earn progress — and badges." })
      ]),
      S.el("span", { class: "chip sev-" + (read === Data.lessons.length ? "low" : "medium"), text: read + "/" + Data.lessons.length + " lessons read" })
    ]));

    const list = S.el("div", { class: "lesson-list" });
    Data.lessons.forEach(l => list.appendChild(lessonCard(l)));
    host.appendChild(list);

    // quick-launch card for the virtual terminal
    const term = S.el("div", { class: "card", style: "margin-top:16px;display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap" }, [
      S.el("div", {}, [
        S.el("h3", { style: "margin:0 0 2px", text: "Virtual Terminal" }),
        S.el("span", { class: "lc-meta", text: "Practise safe demo commands in the sandbox — nothing executes on your machine." })
      ]),
      S.el("button", { class: "btn primary small", type: "button", id: "openTerm" },
        [S.el("span", { html: S.icon("terminal", 14) }), S.el("span", { text: "Open terminal" })])
    ]);
    term.querySelector("#openTerm").addEventListener("click", () => S.Router.navigate("terminal"));
    host.appendChild(term);

    // badges
    const badges = earnedBadges();
    host.appendChild(S.el("div", { class: "card-title", style: "margin-top:24px" }, [
      S.el("h3", { text: "Badges" }),
      S.el("span", { class: "sub", text: badges.filter(b => b.earned).length + "/" + badges.length + " earned" })
    ]));
    const bg = S.el("div", { class: "badge-grid" });
    badges.forEach(b => {
      bg.appendChild(S.el("div", { class: "badge-card" + (b.earned ? "" : " locked"), title: b.desc }, [
        S.el("div", { class: "bd-ic", html: S.icon(b.icon, 20) }),
        S.el("div", { class: "bd-title", text: b.title }),
        S.el("div", { class: "bd-desc", text: b.desc })
      ]));
    });
    host.appendChild(bg);
  }

  /* ---------- lesson reading view ---------- */
  function renderLesson(host, id) {
    const l = Data.lessons.find(x => x.id === id);
    if (!l) { view.back(); return; }
    const read = Progress.isLessonRead(id);

    host.appendChild(S.el("div", { class: "view-head" }, [
      S.el("div", {}, [
        S.el("button", { class: "btn ghost small", type: "button", id: "lesBack" },
          [S.el("span", { html: "← " }), S.el("span", { text: "Learning Center" })]),
        S.el("h2", { style: "margin-top:12px", text: l.title }),
        S.el("p", { text: "~" + l.minutes + " min read · " + l.topic })
      ]),
      (read ? S.el("span", { class: "chip sev-low", html: S.icon("check", 11) + " read" }) : null)
    ]));

    const reading = S.el("div", { class: "card" }, [
      S.el("div", { class: "reading" })
    ]);

    const body = reading.querySelector(".reading");
    l.sections.forEach(sec => {
      if (sec.heading) body.appendChild(S.el("h4", { text: sec.heading }));
      (sec.body || []).forEach(p => body.appendChild(S.el("p", { text: p })));
      if (sec.list && sec.list.length) {
        const ul = S.el("ul");
        sec.list.forEach(item => ul.appendChild(S.el("li", { html: item })));
        body.appendChild(ul);
      }
    });

    const foot = S.el("div", { style: "margin-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap" }, [
      S.el("button", {
        class: "btn " + (read ? "ghost" : "primary"), type: "button",
        id: "lesDone", disabled: !!read
      }, [S.el("span", { text: read ? "Lesson complete" : "Mark as read" })]),
      S.el("button", { class: "btn small", type: "button", id: "lesNext" },
        [S.el("span", { text: "Next lesson →" })])
    ]);
    if (read) foot.querySelector("#lesDone").disabled = true;
    body.appendChild(foot);

    body.querySelector("#lesDone").addEventListener("click", () => {
      Progress.markLessonRead(id);
      S.toast("Lesson '" + l.title + "' marked as read.", "success");
    });
    body.querySelector("#lesNext").addEventListener("click", () => {
      const idx = Data.lessons.findIndex(x => x.id === id);
      const next = Data.lessons[(idx + 1) % Data.lessons.length];
      view.openLesson(next.id);
    });

    host.querySelector("#lesBack").addEventListener("click", () => view.back());
    host.appendChild(reading);
  }

  // refresh badges/progress live when something else updates progress
  S.on("progress:updated", () => {
    if (S.Router.currentId() === "learning") view.redraw();
  });

  // expose for quick links / tests
  S.Learning = { view: view };

  S.Router.register(view);
})();