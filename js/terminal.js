/* ============================================================
   SENTRY — terminal.js
   ------------------------------------------------------------
   Virtual terminal ("SENTRY Sim Shell") used for training labs.

   SAFETY BOUNDARY: this is a demo program, not a shell. It only
   ever reads from an in-memory dictionary of predefined output
   and it never runs or passes through any real operating-system
   command. Unknown commands are politely refused.

   It is available as a standalone view and embedded inside the
   Linux-lab challenge.
   ============================================================ */
(function () {
  const S = window.Sentry = window.Sentry || {};
  const Data = S.Data;

  /* ---------- shared session state ---------- */
  const session = {
    lines: [],     // rendered lines, persists across navigation
    hist: []       // previous commands, for up/down arrow recall
  };

  /* ---------- virtual filesystem (fully simulated) ---------- */
  const USER_FLAG = (Data.challenges.find(c => c.id === "linux-lab") || {}).files["cat user.txt"] || "";

  const FILES = {
    "about.txt": "SENTRY Sim Shell v1.0 — an educational sandbox.\nEvery command below is simulated. Nothing touches your real computer.",
    "readme.txt": "Tasks:\n  1. list files       -> ls\n  2. read user.txt    -> cat user.txt\n\nType `help` for available commands.",
    "user.txt": USER_FLAG,
    "notes/draft.txt": "Reminder: rotate service passwords every 90 days."
  };
  const SHOWN_FILES = ["about.txt", "readme.txt", "user.txt", "notes/"];

  const HOSTS = {
    localhost: "127.0.0.1",
    gateway:   "10.0.0.1",
    firewall:  "10.0.0.2",
    web:       "10.0.1.10",
    db:        "10.0.1.11"
  };

  /* ---------- tiny IO abstraction ---------- */
  let mountNode = null;

  function print(text, cls) {
    const line = { text: text, cls: cls || "" };
    session.lines.push(line);
    if (session.lines.length > 300) session.lines.shift();
    if (mountNode) {
      const div = document.createElement("div");
      div.className = "term-line " + line.cls;
      div.innerHTML = line.text;          // trusted, generated internally
      mountNode.appendChild(div);
      mountNode.scrollTop = mountNode.scrollHeight;
    }
  }

  function renderHistory() {
    if (!mountNode) return;
    mountNode.innerHTML = "";
    session.lines.forEach(l => {
      const div = document.createElement("div");
      div.className = "term-line " + l.cls;
      div.innerHTML = l.text;
      mountNode.appendChild(div);
    });
    mountNode.scrollTop = mountNode.scrollHeight;
  }

  /* ---------- command dispatch ---------- */
  function execute(raw) {
    raw = raw.trim();
    if (!raw) return;
    session.hist.push(raw);
    S.emit("term:cmd", { cmd: raw });

    const [cmd, ...argsA] = raw.split(/\s+/);
    const args = argsA.join(" ").trim();
    const c = cmd.toLowerCase();

    print('<span class="ps1">attrainee@sentry-lab-01</span>:<span class="ic">~</span>$ ' + S.esc(raw), "cmd");

    switch (c) {
      case "help":
        print("Available demo commands: help, about, version, whoami, id, hostname,");
        print("pwd, ls, cat &lt;file&gt;, echo, date, uptime, uname, ps, ifconfig,");
        print("ping &lt;host&gt;, history, clear, exit.");
        break;
      case "about":   print(FILES["about.txt"], "out"); break;
      case "version": print("SENTRY Sim Shell 1.0.0 (educational)", "out"); break;
      case "whoami":  print("attrainee", "out"); break;
      case "id":      print("uid=1000(attrainee) gid=1000(attrainee) groups=100(users)", "out"); break;
      case "hostname":print("sentry-lab-01", "out"); break;
      case "pwd":     print("/home/attrainee", "out"); break;
      case "uname":   print("Linux sentry-lab-01 6.1.0-sentry x86_64 GNU/Linux", "out"); break;
      case "date":    print(new Date().toString(), "out"); break;
      case "uptime":  print(" 16:42:11 up 3 days,  4:19,  1 user,  load average: 0.08, 0.11, 0.10", "out"); break;
      case "echo":    print(args, "out"); break;
      case "history": session.hist.slice(-20).forEach((h, i) => print("  " + (i + 1) + "  " + h, "out")); break;
      case "clear":   session.lines = []; renderHistory(); break;
      case "exit":    print("logout — session closed. See you next shift.", "out");
                      S.toast("Demo shell session ended.", "info"); break;

      case "ls": {
        const dir = args === "notes" ? ["draft.txt"] : SHOWN_FILES;
        print(dir.join("    "), "out");
        break;
      }
      case "cat": {
        if (!args) { print("usage: cat <file>", "err"); break; }
        const content = FILES[args];
        if (content === undefined) { print("cat: " + S.esc(args) + ": No such file or directory (simulated)", "err"); break; }
        print(content.replace(/\n/g, "<br>"), content.indexOf("FLAG") !== -1 ? "flag" : "out");
        break;
      }
      case "ps":
        print("   PID TTY          TIME CMD", "out");
        print("  1577 ?        00:00:04 sshd", "out");
        print("  1638 ?        00:00:00 systemd-logind", "out");
        print("  2201 ?        00:01:12 node /srv/sentry-api", "out");
        print("  2244 ?        00:00:31 postgres", "out");
        break;
      case "ifconfig":
        print("eth0: flags=4163<UP,BROADCAST,RUNNING>  mtu 1500 (simulated)", "out");
        print("        inet 10.0.2.30  netmask 255.255.255.0  broadcast 10.0.2.255", "out");
        print("        ether 02:42:ac:11:00:1e  txqueuelen 1000", "out");
        break;
      case "ping": {
        const target = args || "localhost";
        const ip = HOSTS[target.toLowerCase()] || "203.0.113." + (30 + (Date.now() % 200));
        print("PING " + S.esc(target) + " (" + ip + ") 56(84) bytes of data.", "out");
        [2, 3, 5].forEach((ms, i) => setTimeout(() => {
          print("64 bytes from " + ip + ": icmp_seq=" + (i + 1) + " ttl=63 time=" + ms + "." + (i * 11 % 10) + " ms", "good");
          if (i === 2) print("--- " + S.esc(target) + " ping statistics ---", "out");
        }, 400 * (i + 1)));
        break;
      }
      case "sudo":
      case "rm":
      case "curl":
      case "nc":
      case "nmap":
      case "ssh":
        print("denied: that command is not part of the training sandbox.", "err");
        print("This terminal only accepts the whitelisted demo commands.", "err");
        break;

      default:
        print("bash: " + S.esc(c) + ": command not found (demo). Type `help` to list the safe commands.", "err");
    }
  }

  /* ---------- mounting ---------- */
  function mount(root, opts) {
    opts = opts || {};

    const bar = S.el("div", { class: "term-bar" }, [
      S.el("span", { class: "term-dots", html: "<i></i><i></i><i></i>" }),
      S.el("span", { class: "term-title", text: opts.title || "attrainee@sentry-lab-01: ~ — SIM SHELL" }),
      S.el("button", { class: "btn small ghost", type: "button", id: "termClear" },
        [S.el("span", { text: "clear" })])
    ]);

    const body = S.el("div", { class: "term-body" });
    mountNode = body;
    renderHistory();

    if (opts.welcome) {
      if (!session.lines.length) {
        print("SENTRY Sim Shell — training sandbox. Use `help` for safe demo commands.<br>&nbsp;");
      }
    }

    const pfx = '<span class="ps1">attrainee@sentry-lab-01</span>:<span class="ic">~</span>$ ';
    const input = S.el("input", {
      class: "term-input", type: "text", "aria-label": "Terminal input",
      autocomplete: "off", spellcheck: "false"
    });
    const inputRow = S.el("div", { class: "term-input-row" }, [
      S.el("span", { html: pfx }), input
    ]);

    const hintbar = S.el("div", { class: "term-hintbar", html:
      "safe commands: help · ls · cat &lt;file&gt; · ping &lt;host&gt; · ps · ifconfig · echo · clear · exit" });

    // command entry
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        execute(input.value);
        input.value = "";
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (session.hist.length) input.value = session.hist[session.hist.length - 1];
      }
    });

    bar.querySelector("#termClear").addEventListener("click", () => {
      session.lines = [];
      renderHistory();
      input.focus();
    });

    const card = S.el("div", { class: "card term-card" }, [bar, body, inputRow, hintbar]);
    root.appendChild(card);

    if (opts.focus !== false) input.focus();

    return {
      focus: () => input.focus(),
      run: execute,
      clear: () => { session.lines = []; renderHistory(); }
    };
  }

  function makeSession() {
    return {
      lines: session.lines,
      hist: session.hist,
      clear: () => { session.lines = []; if (mountNode) { mountNode.innerHTML = ""; } }
    };
  }

  S.Terminal = {
    mount: mount,
    execute: execute,
    print: print,
    session: session
  };

  /* ---------- standalone view (reachable from Learning Center) ---------- */
  const view = {
    id: "terminal",
    title: "Virtual Terminal",

    render(host) {
      host.appendChild(S.el("div", { class: "view-head" }, [
        S.el("div", {}, [
          S.el("h2", { text: "Virtual Terminal" }),
          S.el("p", { text: "A safe training sandbox. Commands are simulated and whitelisted — nothing here touches your real operating system." })
        ])
      ]));
      S.Terminal.mount(host, { focus: true });
    }
  };

  S.Router.register(view);
})();