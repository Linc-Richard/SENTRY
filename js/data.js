/* ============================================================
   SENTRY — data.js
   ------------------------------------------------------------
   All simulated data lives here so the rest of the app stays
   dumb and readable: virtual devices, activity-log generators,
   training challenges, lessons and badges.

   Everything is fictitious and never touches a real network.
   ============================================================ */
(function () {
  const Data = {};

  /* ------------------------------------------------------------
     VIRTUAL DEVICES
     `topo` holds x/y positions inside an SVG viewBox of
     100 x 56 so the network map stays scalable on any screen.
  ------------------------------------------------------------ */
  Data.devices = [
    {
      id: "gw", label: "Edge Gateway", type: "router", role: "Perimeter router",
      ip: "10.0.0.1", mac: "00:1A:2B:00:11:01", os: "SENTRY-FW 2.4.1",
      status: "online", cpu: 18, mem: 42, disk: 31, uptime: "21d 07h",
      services: [{ name: "NAT", port: 0 }, { name: "DHCP", port: 67 }],
      ports: [ { port: "67/udp", service: "dhcp", state: "open" }, { port: "500/udp", service: "ipsec", state: "open" } ],
      topo: { x: 8, y: 28 }
    },
    {
      id: "fw", label: "Perimeter Firewall", type: "firewall", role: "Traffic filtering",
      ip: "10.0.0.2", mac: "00:1A:2B:00:11:02", os: "SENTRY-FW 2.4.1",
      status: "online", cpu: 34, mem: 56, disk: 22, uptime: "21d 07h",
      services: [{ name: "Packet filter", port: 0 }, { name: "IDS", port: 0 }],
      ports: [ { port: "443/tcp", service: "mgmt", state: "filtered" }, { port: "any", service: "filter", state: "open" } ],
      topo: { x: 23, y: 28 }
    },
    {
      id: "ws", label: "Web Server", type: "server", role: "Public web app",
      ip: "10.0.1.10", mac: "00:1A:2B:00:11:10", os: "Ubuntu 22.04 LTS",
      status: "online", cpu: 41, mem: 63, disk: 48, uptime: "64d 03h",
      services: [{ name: "Nginx", port: 80 }, { name: "Nginx TLS", port: 443 }],
      ports: [ { port: "80/tcp", service: "http", state: "open" }, { port: "443/tcp", service: "https", state: "open" } ],
      topo: { x: 42, y: 10 }
    },
    {
      id: "mail", label: "Mail Server", type: "server", role: "Corporate email",
      ip: "10.0.1.12", mac: "00:1A:2B:00:11:12", os: "Debian 12",
      status: "online", cpu: 26, mem: 49, disk: 57, uptime: "102d 11h",
      services: [{ name: "SMTP", port: 25 }, { name: "IMAPS", port: 993 }],
      ports: [ { port: "25/tcp", service: "smtp", state: "open" }, { port: "993/tcp", service: "imaps", state: "open" } ],
      topo: { x: 60, y: 10 }
    },
    {
      id: "db", label: "Database Server", type: "database", role: "Primary data store",
      ip: "10.0.1.11", mac: "00:1A:2B:00:11:11", os: "Ubuntu 22.04 LTS",
      status: "online", cpu: 55, mem: 71, disk: 62, uptime: "64d 03h",
      services: [{ name: "PostgreSQL TLS", port: 5432 }],
      ports: [ { port: "5432/tcp", service: "postgres", state: "open" } ],
      topo: { x: 42, y: 46 }
    },
    {
      id: "bk", label: "Backup Server", type: "server", role: "Nightly backups",
      ip: "10.0.1.20", mac: "00:1A:2B:00:11:20", os: "Debian 12",
      status: "offline", cpu: 0, mem: 0, disk: 74, uptime: "—",
      services: [{ name: "restic", port: 0 }],
      ports: [ { port: "9100/tcp", service: "backup", state: "filtered" } ],
      topo: { x: 60, y: 46 }
    },
    {
      id: "wa", label: "Workstation Alpha", type: "workstation", role: "IT operations",
      ip: "10.0.2.11", mac: "00:1A:2B:00:21:11", os: "Windows 11 Pro",
      status: "online", cpu: 12, mem: 38, disk: 41, uptime: "3d 16h",
      services: [{ name: "EDR agent", port: 0 }],
      ports: [ { port: "49152/tcp", service: "edr", state: "open" } ],
      topo: { x: 34, y: 28 }
    },
    {
      id: "wb", label: "Workstation Bravo", type: "workstation", role: "Admin desk",
      ip: "10.0.2.12", mac: "00:1A:2B:00:21:12", os: "Windows 11 Pro",
      status: "online", cpu: 8, mem: 29, disk: 36, uptime: "11d 02h",
      services: [{ name: "EDR agent", port: 0 }],
      ports: [ { port: "49152/tcp", service: "edr", state: "open" } ],
      topo: { x: 49, y: 28 }
    },
    {
      id: "lp", label: "Analyst Laptop", type: "laptop", role: "SOC analyst",
      ip: "10.0.2.30", mac: "00:1A:2B:00:21:30", os: "Fedora Workstation 38",
      status: "offline", cpu: 0, mem: 0, disk: 52, uptime: "—",
      services: [{ name: "VPN client", port: 0 }],
      ports: [ { port: "1194/udp", service: "openvpn", state: "filtered" } ],
      topo: { x: 66, y: 28 }
    },
    {
      id: "sen", label: "Sensor Node", type: "sensor", role: "Building telemetry",
      ip: "10.0.3.5", mac: "00:1A:2B:00:31:05", os: "TinyOS 4",
      status: "online", cpu: 5, mem: 12, disk: 9, uptime: "8d 22h",
      services: [{ name: "MQTT", port: 1883 }],
      ports: [ { port: "1883/tcp", service: "mqtt", state: "open" } ],
      topo: { x: 31, y: 48 }
    }
  ];

  /* Loose coupling edges for the topology sketch. */
  Data.topology = [
    ["gw", "fw"],
    ["fw", "ws"], ["fw", "mail"], ["fw", "db"], ["fw", "bk"],
    ["fw", "wa"], ["fw", "wb"], ["fw", "lp"], ["fw", "sen"],
    ["ws", "db"], ["wa", "wb"]
  ];

  Data.getDevice = (id) => Data.devices.find(d => d.id === id);

  /* ------------------------------------------------------------
     ACTIVITY LOGGING
     Event templates with severity. Random online devices produce
     events every few seconds (see network.js); a couple of event
     types are pre-made "scary but safe" security stories so the
     log view feels like a real SOC.
  ------------------------------------------------------------ */
  Data.eventTemplates = {
    login:          { sev: "low",      msg: "Successful login for {user} via SSH from {ip}." },
    update:         { sev: "low",      msg: "OS {pkg} updated to latest patch set." },
    backup:         { sev: "low",      msg: "Scheduled backup started. Target verified." },
    dns:            { sev: "low",      msg: "DNS query resolution nominal ({ip})." },
    license:        { sev: "low",      msg: "License check completed; signatures current." },
    vpn:            { sev: "medium",   msg: "New VPN tunnel established for {user} ({ip})." },
    scan:           { sev: "medium",   msg: "Port scan pattern detected from {ip} — throttled." },
    tls:            { sev: "medium",   msg: "TLS certificate renewal scheduled for {sub}." },
    fw_block:       { sev: "high",     msg: "Firewall blocked suspicious ingress from {ip} on port {p}." },
    brute:          { sev: "critical", msg: "Possible brute-force attempt against {user} — source {ip} blocked." }
  };

  Data.eventTypes = Object.keys(Data.eventTemplates);

  // Weighted pick — "scary" events are rarer than routine ones.
  Data.pickEventType = function () {
    const weights = { login: 26, dns: 16, update: 12, backup: 10, license: 8,
                      vpn: 8, scan: 9, tls: 5, fw_block: 4, brute: 2 };
    let total = 0;
    for (const t in weights) total += weights[t];
    let r = Math.random() * total;
    for (const t in weights) { r -= weights[t]; if (r <= 0) return t; }
    return "login";
  };

  Data.genEvent = function () {
    const type = Data.pickEventType();
    const t = Data.eventTemplates[type];
    const online = Data.devices.filter(d => d.status === "online");
    const dev = online.length ? online[(Math.random() * online.length) | 0] : Data.devices[0];
    const ip = Data.randIp();
    const msg = t.msg
      .replace("{user}", Data.user)
      .replace(/{ip}/g, ip)
      .replace("{dev}", dev.label)
      .replace("{p}", Math.random() < .5 ? "22" : "3389")
      .replace("{sub}", "api." + dev.label.toLowerCase().replace(/\s+/g, "") + ".lan");
    return { type: type.toUpperCase().replace(/_/g, " "), sev: t.sev, device: dev.id, msg: msg };
  };

  Data.user = "attrainee";
  Data.randIp = () => "203.0.113." + (2 + ((Math.random() * 250) | 0));

  // Seed the log with a believable recent history.
  Data.buildInitialLogs = function (startSerial) {
    const pool = [
      ["login", "low", "gw", "Remote login session opened for attrainee (10.0.2.30)."],
      ["fw block", "high", "fw", "Firewall blocked inbound request to 10.0.1.10:22 from 198.51.100.44."],
      ["backup", "low", "bk", "Nightly backup complete — 1.2 GB written, hash verified."],
      ["scan", "medium", "fw", "Port scan signature detected from 203.0.113.19; source throttled."],
      ["update", "low", "ws", "Kernel 6.5.0-1019.security applied; reboot pending on next window."],
      ["vpn", "medium", "lp", "New VPN tunnel established for attrainee from 198.51.100.7."],
      ["login", "low", "wa", "Local login for operator.windows (console session)."],
      ["tls", "medium", "ws", "TLS certificate renewal completed for api.webapp.lan."],
      ["brute force", "critical", "fw", "Possible brute-force against db-server user 'backup' — source 203.0.113.201 blocked."],
      ["dns", "low", "fw", "Resolver healthy; 99.8% query success over last hour."],
      ["login", "low", "mail", "Successful SMTP auth for team inbox."],
      ["scan", "medium", "gw", "Outbound scan beacon to port 443 detected on 10.0.2.12."],
      ["update", "low", "wb", "EDR definitions updated (v2026.09.104)."],
      ["login", "low", "db", "Application service re-authenticated to PostgreSQL."]
    ];
    const now = Date.now();
    return pool.map((row, i) => ({
      serial: startSerial - pool.length + i,
      ts: new Date(now - (pool.length - i) * 69 * 60 * 1000).toISOString(),
      type: row[0], sev: row[1], device: row[2], msg: row[3]
    }));
  };

  /* ------------------------------------------------------------
     SECURITY CHALLENGES
     types: "choice"  -> pick one correct option
            "text"    -> free-text answer (normalised compare)
            "terminal"-> solve inside the virtual terminal
     `points` are awarded once, on first correct answer.
  ------------------------------------------------------------ */
  Data.challenges = [
    {
      id: "passwords", title: "Password Strength", topic: "Passwords", icon: "key",
      level: 1, points: 20, type: "choice",
      objective: "Learn what makes a password resilient against guessing and brute force.",
      desc: "Test your instinct for what counts as a strong credential.",
      question: "Which of these password candidates is the strongest?",
      options: [
        { id: "a", text: "password123" },
        { id: "b", text: "Q#7!vR9$tNm2Lp" },
        { id: "c", text: "john1990" },
        { id: "d", text: "P@ssw0rd" }
      ],
      correct: "b",
      explain: "Length plus variety (upper/lower case, digits, symbols) beats dictionary words or simple leetspeak substitutions."
    },
    {
      id: "phishing", title: "Spot the Phish", topic: "Phishing", icon: "bug",
      level: 1, points: 20, type: "choice",
      objective: "Recognise the psychological triggers phishing emails rely on.",
      desc: "Social engineering is the most common attack vector — learn to read the room.",
      question: "An urgent 'bank account locked' email asks you to click a link and enter your credentials now. The strongest red flag is…",
      options: [
        { id: "a", text: "It arrived late at night." },
        { id: "b", text: "Pressure to act immediately + a link asking for your password." },
        { id: "c", text: "It is written in plain, informal language." },
        { id: "d", text: "The sender display name matches your bank." }
      ],
      correct: "b",
      explain: "Urgency ('act now or be locked out') exists to bypass your judgement. Legitimate organisations almost never demand credentials over email."
    },
    {
      id: "network-basics", title: "Firewall Basics", topic: "Network security", icon: "shield",
      level: 2, points: 20, type: "choice",
      objective: "Understand how firewalls enforce a security boundary.",
      desc: "The perimeter is the first line of defence in any network.",
      question: "What is the primary job of a network firewall?",
      options: [
        { id: "a", text: "Physically connect cables between network switches." },
        { id: "b", text: "Filter traffic between networks using defined rules." },
        { id: "c", text: "Speed up all traffic to guarantee it arrives faster." },
        { id: "d", text: "Store copies of every file ever transferred." }
      ],
      correct: "b",
      explain: "Firewalls decide which flows are allowed and which are dropped, based on policies — allowlists over denylists where possible."
    },
    {
      id: "encryption", title: "Encryption Basics", topic: "Encryption", icon: "lock",
      level: 2, points: 20, type: "text",
      objective: "Use the right vocabulary for the fundamentals of encryption.",
      desc: "Confidentiality in transit depends on transforming data you can read into data attackers can't.",
      question: "The process of converting readable plaintext into unreadable ciphertext is called…",
      accept: ["encryption", "encrypting", "encipherment", "encoding the data"],
      hint: "Starts with 'en…'. The word ends in '-tion'.",
      explain: "Encryption uses a key + algorithm to scramble data; only the correct key can reverse it back to plaintext."
    },
    {
      id: "linux-lab", title: "Linux Command Concepts", topic: "Terminal basics", icon: "terminal",
      level: 3, points: 30, type: "terminal",
      objective: "Navigate a Linux-style directory and read a file using demo shell commands.",
      desc: "A safe sandbox: use the virtual terminal to explore and retrieve a flag.",
      prompt: "You are on a training host at ~/labs. Run the <b>ls</b> command to list files, then read <b>user.txt</b> with <b>cat</b>.",
      files: {
        "ls": ["about.txt", "readme.txt", "user.txt", "notes/docs"],
        "cat about.txt": "SENTRY Training Lab 01 — every command here is simulated.\nNothing touches your real computer.",
        "cat readme.txt": "Tasks:\n  1. list files        -> ls\n  2. read user.txt     -> cat user.txt\n\nType `help` in the terminal for available commands.",
        "cat user.txt": "Well done, operator! FLAG{sentry_lab_01_access_granted}",
        "ls notes/docs": ["draft.txt"],
        "cat draft.txt": "Reminder: rotate service passwords every 90 days."
      }
    },
    {
      id: "log-analysis", title: "Log Analysis Basics", topic: "Detection", icon: "list",
      level: 3, points: 25, type: "choice",
      objective: "Turn a noisy log line into a confident first response.",
      desc: "Detection starts with reading logs like an analyst.",
      question: "" ,
      log: "08:14:31 auth: Failed password for user 'admin' from 203.0.113.201 port 52441 ssh2\n08:14:35 auth: Failed password for user 'admin' from 203.0.113.201 port 52442 ssh2\n08:14:39 auth: Failed password for user 'admin' from 203.0.113.201 port 52443 ssh2\n08:14:43 auth: Failed password for user 'admin' from 203.0.113.201 port 52444 ssh2",
      question: "The log above shows repeated failed SSH logins from one source. What is the most appropriate first response?",
      options: [
        { id: "a", text: "Ignore it — failed logins are normal background noise." },
        { id: "b", text: "Block the source IP and investigate for a brute-force campaign." },
        { id: "c", text: "Delete the log lines so the server stays tidy." },
        { id: "d", text: "Email every user to ask if it was them." }
      ],
      correct: "b",
      explain: "A burst of identical failed logins from a single source is the classic brute-force signature. Stop the source, then investigate."
    }
  ];

  /* ------------------------------------------------------------
     LEARNING CENTER
     Lessons store real, beginner-friendly content as structured
     blocks so the renderer stays trivial to extend.
  ------------------------------------------------------------ */
  Data.lessons = [
    {
      id: "l-intro", title: "What Is Cybersecurity?", topic: "Foundations", icon: "shield", minutes: 4,
      sections: [
        { heading: "The big idea", body: [
            "Cybersecurity is the practice of protecting information and the systems that store, process and transmit it. In professional terms, almost every principle traces back to the CIA triad." ] },
        { heading: "The CIA triad", body: [], list: [
            "<b>Confidentiality</b> — only authorised people can read the data (encryption, permissions).",
            "<b>Integrity</b> — data hasn't been changed or tampered with (hashing, signing).",
            "<b>Availability</b> — the data is reachable when needed (backups, redundancy)." ] },
        { heading: "Why it matters", body: [
            "One breached credential can let an attacker move sideways through a whole organisation. Defence is layered: people (training), process (policy), and technology (tools)." ] }
      ]
    },
    {
      id: "l-passwords", title: "Passwords & MFA", topic: "Identity", icon: "key", minutes: 5,
      sections: [
        { heading: "Length beats cleverness", body: [
            "A 14-character random passphrase is far harder to brute force than a short password stuffed with symbols. Passphrases like 'correct-horse-battery-staple' are memorable and strong." ] },
        { heading: "Never reuse", body: [
            "Attackers take credentials leaked from one site and try them everywhere. A unique password per account contains the blast radius. A password manager makes this practical." ] },
        { heading: "Multi-factor authentication", body: [
            "MFA adds a second proof of identity (a code, a token, a fingerprint). Even a stolen password becomes useless on its own. Roll it out on anything that matters." ] }
      ]
    },
    {
      id: "l-phishing", title: "Spotting Phishing", topic: "Social engineering", icon: "bug", minutes: 5,
      sections: [
        { heading: "The emotional exploit", body: [
            "Phishing works by inducing urgency, fear or greed so you act before you think. 'Your account will be closed' and 'you won a gift card' are both pressure tactics." ] },
        { heading: "Five things to check", body: [], list: [
            "Sender address — a display name can lie; hover the full address.",
            "Misspellings and odd punctuation that a brand wouldn't ship.",
            "Links — hover, don't click; compare the real domain.",
            "Requests for credentials or payment details by email — always suspicious.",
            "Unexpected attachments — the classic dropper for malware." ] },
        { heading: "If in doubt", body: [
            "Verify through a separate channel (a known phone number or website you typed yourself). Report it to your security team and do not forward it." ] }
      ]
    },
    {
      id: "l-homenet", title: "Securing a Home Network", topic: "Operations", icon: "wifi", minutes: 6,
      sections: [
        { heading: "Start at the router", body: [
            "Change the admin password from the factory default, keep firmware updated, and disable features you don't use (WPS, remote admin)." ] },
        { heading: "Segmentation", body: [
            "Keep IoT gadgets — cameras, bulbs, smart plugs — on their own guest-style network so a weak device can't reach your laptops and phones." ] },
        { heading: "Small habits, big effect", body: [], list: [
            "Use WPA2/WPA3 — never leave a network open unless it's a dedicated guest SSID.",
            "Turn on automatic updates on every device that offers them.",
            "Back up important files, and test a restore now and then.",
            "Treat unexpected 'tech support' calls or messages with healthy scepticism." ] }
      ]
    }
  ];

  /* ------------------------------------------------------------
     BADGES — earned automatically from progress (see learning.js)
  ------------------------------------------------------------ */
  Data.badges = [
    { id: "first",   icon: "bolt",    title: "First Contact",  desc: "Complete any challenge" },
    { id: "shell",   icon: "terminal",title: "Shell-Mate",    desc: "Finish the Linux lab" },
    { id: "analyst", icon: "list",    title: "Log Watcher",    desc: "Complete log analysis" },
    { id: "scholar", icon: "book",    title: "Scholar",        desc: "Read every lesson" },
    { id: "guardian",icon: "shield",  title: "Guardian",       desc: "Complete all challenges" },
    { id: "elite",   icon: "award",   title: "Elite Operator", desc: "Reach a security score of 75+" }
  ];

  window.Sentry = window.Sentry || {};
  window.Sentry.Data = Data;
})();