/* ============================================================
   SENTRY — settings.js
   ------------------------------------------------------------
   Display preferences (theme/darkness, animations, glow) and a
   fully working "reset demo progress" that wipes LocalStorage.
   ============================================================ */
(function () {
  const S = window.Sentry = window.Sentry || {};

  const DEFAULTS = { theme: "dark", anim: true, glow: true };

  function apply(s) {
    s = Object.assign({}, DEFAULTS, s);
    document.body.dataset.theme = s.theme === "black" ? "black" : "dark";
    document.documentElement.classList.toggle("no-anim", s.anim === false);
    document.body.dataset.glow = s.glow === false ? "off" : "on";
    return s;
  }

  S.Settings = {
    get() { return Object.assign({}, DEFAULTS, SentryStore.getSettings() || {}); },
    save(s) { SentryStore.saveSettings(s); return apply(s); },
    load() { return apply(SentryStore.getSettings() || DEFAULTS); }
  };

  const view = {
    id: "settings",
    title: "Settings",

    render(host) {
      const current = S.Settings.get();

      host.appendChild(S.el("div", { class: "view-head" }, [
        S.el("div", {}, [
          S.el("h2", { text: "Settings" }),
          S.el("p", { text: "Tune the display and manage your demo progress. Preferences persist in this browser." })
        ])
      ]));

      const card = S.el("div", { class: "card settings-card" });

      // theme
      card.appendChild(setRow(
        "Theme", "Navy dark is the default; pure black for OLED screens",
        S.el("select", { id: "setTheme", "aria-label": "Theme" }, [
          S.el("option", { value: "dark", text: "Dark · navy default" }),
          S.el("option", { value: "black", text: "Pure black" })
        ])
      ));

      // animations
      card.appendChild(setRow(
        "Animations", "Soft transitions and live indicators",
        switchEl("setAnim", current.anim)
      ));

      // glow
      card.appendChild(setRow(
        "Glow effects", "Neon glow accents on cards and status dots",
        switchEl("setGlow", current.glow)
      ));

      // actions
      const actions = S.el("div", { style: "display:flex;gap:10px;flex-wrap:wrap;margin-top:18px" }, [
        S.el("button", { class: "btn primary", type: "button", id: "setSave" },
          [S.el("span", { html: S.icon("check", 14) }), S.el("span", { text: "Save preferences" })]),
        S.el("button", { class: "btn danger", type: "button", id: "setReset" },
          [S.el("span", { html: S.icon("refresh", 14) }), S.el("span", { text: "Reset demo progress" })])
      ]);
      card.appendChild(actions);
      host.appendChild(card);

      // set current values
      card.querySelector("#setTheme").value = current.theme;
      card.querySelector("#setAnim").checked = current.anim;
      card.querySelector("#setGlow").checked = current.glow;

      card.querySelector("#setSave").addEventListener("click", () => {
        const theme = card.querySelector("#setTheme").value;
        const anim = card.querySelector("#setAnim").checked;
        const glow = card.querySelector("#setGlow").checked;
        S.Settings.save({ theme: theme, anim: anim, glow: glow });
        S.toast("Preferences saved.", "success");
      });

      card.querySelector("#setReset").addEventListener("click", async () => {
        const ok = await S.confirm(
          "Reset all demo progress?",
          "This clears challenge scores, lessons, badges, logs and settings from LocalStorage. Everything regenerates fresh.",
          "Reset everything"
        );
        if (!ok) return;
        SentryStore.resetAll();
        location.reload();
      });
    }
  };

  function setRow(title, desc, control) {
    return S.el("div", { class: "set-row" }, [
      S.el("div", { class: "k" }, [S.el("b", { text: title }), S.el("span", { text: desc })]),
      control
    ]);
  }

  function switchEl(id, checked) {
    const label = S.el("label", { class: "switch" }, [
      S.el("input", { type: "checkbox", id: id, value: "1" }),
      S.el("span", { class: "trk", "aria-hidden": "true" })
    ]);
    label.querySelector("input").checked = !!checked;
    return label;
  }

  S.Router.register(view);
})();