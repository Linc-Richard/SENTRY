/* ============================================================
   SENTRY — challenges.js
   ------------------------------------------------------------
   Security Challenges view + the shared progress store.

   S.Progress owns the user's achievements (completed challenges,
   earned points, lessons read, attempt counts) and persists them
   through SentryStore. Everything else reads from it.
   ============================================================ */
(function () {
  const S = window.Sentry = window.Sentry || {};
  const Data = S.Data;

  /* ==========================================================
     PROGRESS STORE (shared with learning + app shell)
     ========================================================== */
  const Progress = {
    get() { return SentryStore.getProgress(); },
    save(p) { SentryStore.saveProgress(p); },

    isComplete(cid) { return this.get().completed.includes(cid); },

    attempt(cid) {
      const p = this.get();
      p.attempts[cid] = (p.attempts[cid] || 0) + 1;
      this.save(p);
    },

    // Called once per challenge the first time it is solved.
    markComplete(cid, pts) {
      const p = this.get();
      if (!p.completed.includes(cid)) p.completed.push(cid);
      p.scores[cid] = Math.max(p.scores[cid] || 0, pts);
      this.save(p);
      this.emitUpdate();
    },

    markLessonRead(lid) {
      const p = this.get();
      if (!p.lessons.includes(lid)) { p.lessons.push(lid); this.save(p); this.emitUpdate(); }
    },

    isLessonRead(lid) { return this.get().lessons.includes(lid); },

    emitUpdate() {
      S.emit("progress:updated");
      S.emit("app:refresh-shell");   // footer shield + metrics depend on this
    }
  };
  S.Progress = Progress;

  /* ==========================================================
     ANSWER CHECKING
     ========================================================== */
  function norm(s) {
    return String(s).toLowerCase().replace(/\s+/g, " ").trim().replace(/[.,!?]$/g, "");
  }

  function checkChoice(ch, chosenId) {
    return chosenId === ch.correct;
  }

  function checkText(ch, value) {
    const v = norm(value);
    return ch.accept.some(a => norm(a) === v);
  }

  const LEVEL_LABEL = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };

  /* ==========================================================
     VIEW state
     ========================================================== */
  const view = {
    id: "challenges",
    title: "Security Challenges",
    mode: "list",                // "list" | "detail"
    openId: null,
    _host: null,

    render(host) {
      this._host = host;
      this.redraw();
    },

    redraw() {
      if (!this._host) return;
      this._host.innerHTML = "";
      if (this.mode === "detail" && this.openId) renderDetail(this._host, this.openId);
      else renderList(this._host);
    },

    open(cid) { this.mode = "detail"; this.openId = cid; this.redraw(); },
    back()  { this.mode = "list"; this.openId = null; this.redraw(); }
  };

  /* ==========================================================
     LIST
     ========================================================== */
  function cardFor(ch) {
    const done = Progress.isComplete(ch.id);
    const card = S.el("button", {
      class: "challenge-card" + (done ? " done" : ""),
      type: "button", "aria-label": ch.title
    });
    card.innerHTML =
      '<span class="cc-top"><span class="cc-ic">' + S.icon(ch.icon, 16) + "</span>" +
      '<span class="cc-pts">+' + ch.points + " pts</span></span>" +
      '<span class="cc-title">' + S.esc(ch.title) + "</span>" +
      '<span class="cc-desc">' + S.esc(ch.desc) + "</span>" +
      '<span class="cc-foot"><span class="chip diff-' + ch.level + '">' + LEVEL_LABEL[ch.level] + "</span>" +
      (done ? '<span class="chip sev-low">' + S.icon("check", 11) + " complete</span>" : "<span>not started</span>") + "</span>";
    card.addEventListener("click", () => view.open(ch.id));
    return card;
  }

  function renderList(host) {
    const prog = Progress.get();
    const earned = Data.challenges.reduce((a, c) => a + (prog.scores[c.id] || 0), 0);
    const doneCount = prog.completed.length;

    host.appendChild(S.el("div", { class: "view-head" }, [
      S.el("div", {}, [
        S.el("h2", { text: "Security Challenges" }),
        S.el("p", { text: "Short, safe training exercises. Each first correct answer earns points that feed your security score." })
      ]),
      S.el("div", {}, [
        S.el("span", { class: "chip sev-" + (doneCount === Data.challenges.length ? "low" : "medium"), text: doneCount + "/" + Data.challenges.length + " complete · " + earned + " pts" })
      ])
    ]));

    const grid = S.el("div", { class: "challenge-grid" });
    Data.challenges.forEach(ch => grid.appendChild(cardFor(ch)));
    host.appendChild(grid);
  }

  /* ==========================================================
     DETAIL
     ========================================================== */
  function renderDetail(host, cid) {
    const ch = Data.challenges.find(c => c.id === cid);
    if (!ch) { view.back(); return; }

    const done = Progress.isComplete(ch.id);
    const prog = Progress.get();
    const attempts = prog.attempts[ch.id] || 0;

    host.appendChild(S.el("div", { class: "view-head challenge-detail" }, [
      S.el("div", {}, [
        S.el("button", { class: "btn ghost small", type: "button", id: "chBack" }, [S.el("span", { html: "← " }), S.el("span", { text: "All challenges" })]),
        S.el("h2", { style: "margin-top:12px", html: S.icon(ch.icon, 18) + " " + S.esc(ch.title) }),
        S.el("p", { html:
          '<span class="chip diff-' + ch.level + '">' + LEVEL_LABEL[ch.level] + "</span>" +
          '<span class="chip type">' + S.esc(ch.topic) + "</span>" +
          '<span class="chip type">+' + ch.points + " pts</span>" +
          (done ? '<span class="chip sev-low">' + S.icon("check", 11) + " completed</span>" : "")
        })
      ])
    ]));

    const card = S.el("div", { class: "card challenge-detail" }, [
      S.el("div", { class: "cd-block" }, [
        S.el("h4", { text: "Learning objective" }),
        S.el("div", { class: "obj-box", text: ch.objective })
      ]),
      S.el("div", { class: "cd-block" }, [
        S.el("h4", { text: "Scenario" }),
        S.el("div", { class: "obj-box", html: ch.prompt ? ch.prompt :
          (ch.type === "text" ? "Answer in your own words." : "Read the question and pick the best answer.") })
      ])
    ]);

    card.appendChild(questionArea(ch));
    card.appendChild(S.el("div", { class: "cd-block", id: "chFeedback" }));
    card.appendChild(S.el("div", { class: "cd-block", style: "color:var(--dim);font-size:.78rem" },
      S.el("span", { text: "Attempts: " + attempts })));
    host.appendChild(card);

    host.querySelector("#chBack").addEventListener("click", () => view.back());

    // terminal challenges keep listening for the flag command
    if (ch.type === "terminal") {
      S.offTermCmd && S.offTermCmd();
      S.offTermCmd = S.on("term:cmd", ({ cmd }) => {
        if (view.mode !== "detail" || view.openId !== ch.id) return;
        const clean = cmd.trim().toLowerCase();
        if (clean === "cat user.txt" && !Progress.isComplete(ch.id)) {
          completeChallenge(ch, host);
        }
      });
    }
  }

  /* Builds the interactive answer panel depending on challenge type. */
  function questionArea(ch) {
    if (ch.type === "choice") {
      const q = S.el("div", { class: "cd-block" }, [
        S.el("h4", { text: "Question" }),
        S.el("p", { style: "font-size:.92rem" }, [
          S.el("span", { text: ch.question })
        ]),
        ch.log ? S.el("pre", { class: "mono obj-box", style: "font-size:.78rem;overflow-x:auto;white-space:pre" }, [ch.log]) : null,
        S.el("div", { class: "q-options", id: "qOptions" }),
        S.el("div", { style: "margin-top:12px" }, [
          S.el("button", { class: "btn primary", type: "button", id: "chCheck", text: "Check answer" })
        ])
      ]);
      renderOptions(q, ch);
      return q;
    }

    if (ch.type === "text") {
      const q = S.el("div", { class: "cd-block" }, [
        S.el("h4", { text: "Question" }),
        S.el("p", { text: ch.question }),
        S.el("div", { class: "field" }, [
          S.el("input", { type: "text", id: "chText", placeholder: "Type your answer…", autocomplete: "off" }),
          S.el("div", { class: "hint", text: "Hint: " + (ch.hint || "") })
        ]),
        S.el("button", { class: "btn primary", type: "button", id: "chCheck", text: "Check answer" })
      ]);
      q.querySelector("#chCheck").addEventListener("click", () => {
        const val = q.querySelector("#chText").value.trim();
        if (!val) { S.toast("Type an answer first.", "warn"); return; }
        const result = checkText(ch, val);
        q.querySelector("#chCheck").disabled = true;
        q.querySelector("#chText").disabled = true;
        deliverResult(ch, result);
      });
      return q;
    }

    if (ch.type === "terminal") {
      const q = S.el("div", {});
      q.appendChild(S.el("h4", { text: "Solve it in the terminal" }));
      const host = S.el("div", {});
      S.Terminal.mount(host, { focus: true, title: "attrainee@sentry-lab-01: ~/labs — SIM SHELL" });
      q.appendChild(host);
      return q;
    }
    return S.el("p", { text: "Unknown challenge type." });
  }

  function renderOptions(q, ch) {
    const wrap = q.querySelector("#qOptions");
    wrap.innerHTML = "";
    ch.options.forEach(opt => {
      const label = S.el("label", { class: "q-option" }, [
        S.el("input", { type: "radio", name: "opt", value: opt.id }),
        S.el("span", { text: opt.text })
      ]);
      label.addEventListener("change", () => {
        wrap.querySelectorAll(".q-option").forEach(l => l.classList.remove("chosen"));
        label.classList.add("chosen");
        q.querySelector("#chCheck").disabled = false;
      });
      wrap.appendChild(label);
    });
    q.querySelector("#chCheck").disabled = true;
    q.querySelector("#chCheck").addEventListener("click", () => {
      const chosen = wrap.querySelector("input:checked");
      if (!chosen) return;
      const result = checkChoice(ch, chosen.value);
      markChoice(ch, wrap, chosen.value, result);
      deliverResult(ch, result);
    });
  }

  /* colour the options after an attempt */
  function markChoice(ch, wrap, chosenId, ok) {
    wrap.querySelectorAll(".q-option input").forEach(inp => {
      inp.disabled = true;
      const label = inp.closest(".q-option");
      if (inp.value === ch.correct) label.classList.add("correct");
      else if (inp.value === chosenId) label.classList.add("incorrect");
    });
  }

  /* shared result handling for choice & text */
  function deliverResult(ch, ok) {
    Progress.attempt(ch.id);
    const already = Progress.isComplete(ch.id);
    if (ok) {
      Progress.markComplete(ch.id, ch.points);
      const box = document.querySelector("#chFeedback");
      if (box) {
        box.innerHTML = '<div class="feedback ok"><span class="f-ic">' + S.icon("check", 16) + "</span>" +
          "<span><b>Correct.</b> +" + ch.points + " pts" + (already ? " (already earned earlier)" : " — first clear!") +
          "<br>" + S.esc(ch.explain) + "</span></div>";
      }
      S.toast("Correct — " + ch.title + " complete (+" + ch.points + " pts).", "success");
    } else {
      const box = document.querySelector("#chFeedback");
      if (box) box.innerHTML = '<div class="feedback no"><span class="f-ic">' + S.icon("alert", 16) + "</span>" +
        "<span><b>Not quite.</b> Have another look — " + S.esc(ch.hint || "frame the problem, then re-check your answer.") + "</span></div>";
      S.toast("Incorrect for " + ch.title + " — you can try again.", "warn");
    }
  }

  function completeChallenge(ch, host) {
    // attempt first, then mark complete (markComplete re-renders the view,
    // so the feedback below is written afterwards against fresh DOM)
    Progress.attempt(ch.id);
    Progress.markComplete(ch.id, ch.points);
    const fb = host.querySelector("#chFeedback");
    if (fb) fb.innerHTML = '<div class="feedback ok"><span class="f-ic">' + S.icon("check", 16) + "</span>" +
      "<span><b>Flag captured.</b> +" + ch.points + " pts — the shell read user.txt successfully.</span></div>";
    S.toast("Linux lab solved — flag retrieved!", "success");
  }

  // expose for search / quick links
  S.Challenges = {
    open: (id) => view.open(id),
    list: () => view.back(),
    view: view
  };

  // live refresh when progress changes from elsewhere
  S.on("progress:updated", () => {
    if (S.Router.currentId() === "challenges") view.redraw();
  });

  S.Router.register(view);
})();