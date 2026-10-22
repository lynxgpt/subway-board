// Board layout + polling. ES5 for old Android WebViews.
(function () {
  var ROUTE_COLOR = {
    1: "#EE352E", 2: "#EE352E", 3: "#EE352E",
    4: "#00933C", 5: "#00933C", 6: "#00933C",
    7: "#B933AD",
    A: "#2850AD", C: "#2850AD", E: "#2850AD",
    B: "#FF6319", D: "#FF6319", F: "#FF6319", M: "#FF6319",
    G: "#6CBE45", J: "#996633", Z: "#996633", L: "#A7A9AC",
    N: "#FCCC0A", Q: "#FCCC0A", R: "#FCCC0A", W: "#FCCC0A",
    S: "#808183",
  };
  var BLACK_TEXT = { N: 1, Q: 1, R: 1, W: 1 };
  var C = {
    white: "#F2ECFF",
    dim: "#8A8A9A",
    blue: "#3A4DFF",
    green: "#22D35A",
    amber: "#FFB000",
    cyan: "#29C5F6",
    yellow: "#FFE14D",
    red: "#FF3030",
    half: "#79768A", // white at ~50 %
    amberDim: "#9A6A00", // amber at ~60 %
  };

  // 11x9 weather icons; y = sun, w = cloud, g = dark cloud, b = rain, s = snow, m = moon
  var ICON_PAL = { y: "#FFD000", w: "#C8C8D4", g: "#7A7A88", b: "#29C5F6", s: "#F2ECFF", m: "#E8E2B0" };
  var ICONS = {
    sun: ["....y......", ".y..y..y...", "..y...y....", "....yyy....", "yy.yyyyy.yy", "....yyy....",
          "..y...y....", ".y..y..y...", "....y......"],
    moon: ["...mmm.....", "..mm.......", ".mm........", ".mm........", ".mm........", ".mm.....m..",
           "..mm...mm..", "...mmmmm...", "..........."],
    partly: ["..y........", "y.y.y......", ".yyy.......", "yyyyy.ww...", ".yyywwwwww.", "y.wwwwwwwww",
             "..wwwwwwwww", "...wwwwwww.", "..........."],
    cloud: ["...........", "....www....", "..wwwwwww..", ".wwwwwwwww.", "wwwwwwwwwww", "wwwwwwwwwww",
            ".wwwwwwwww.", "...........", "..........."],
    rain: ["....ggg....", "..ggggggg..", ".ggggggggg.", "ggggggggggg", ".ggggggggg.", "...........",
           ".b..b..b...", "b..b..b....", "..........."],
    snow: ["....www....", "..wwwwwww..", ".wwwwwwwww.", "wwwwwwwwwww", ".wwwwwwwww.", "...........",
           ".s...s...s.", "...s...s...", ".s...s...s."],
    storm: ["....ggg....", "..ggggggg..", ".ggggggggg.", "ggggggggggg", ".gggyyggg..", "....yy.....",
            "...yyyy....", ".....y.....", "....y......"],
    fog: ["...........", "wwwwwwwww..", "...........", "..wwwwwwwww", "...........", "wwwwwwwww..",
          "...........", "..wwwwwwwww", "..........."],
  };

  // matrix height in dots: header 9 + gap 2 + 6 subway rows x 12 + gap 1 + 2 bike rows x 9
  var ROWS = 102;
  // narrowest panel the layout fits in; narrower screens (4:3 iPad) get a letterboxed panel
  var MIN_COLS = 196;
  // header 0-8 | subway rows (4 x 16, content 17-75) | big 3x clock 79-99 + citi bike lines
  var SUB_Y = 11, SUB_ROWS = 6, SUB_H = 12, BIKE_Y = 80, INFO_H = 11;
  var CLOCK_Y = 79, CLOCK_SCALE = 3;
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var state = { data: null, offset: 0, fetchedAt: 0, wakeUntil: 0 };
  var led;

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }
  function nowSec() {
    return Date.now() / 1000 + state.offset;
  }
  function mins(t) {
    return Math.floor((t - nowSec()) / 60);
  }
  function lsGet(k) {
    try { return window.localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { window.localStorage.setItem(k, v); } catch (e) {}
  }

  function param(name) {
    var m = new RegExp("[?&]" + name + "=(\\w+)").exec(location.search);
    return m && m[1];
  }

  // ?mask=right|left blacks out 6% of this device's screen on that side; ?mask=camera puts it on
  // the front-camera side (top edge in portrait), following the phone as it rotates.
  // Remembered per device; ?mask=none turns it off again.
  // The S21's damaged corner is at the camera edge's end that is on top when the camera is on
  // the left, so the cat goes to the other end; ?cat=top|bottom|off overrides.
  function screenAngle() {
    var a = screen.orientation ? screen.orientation.angle : window.orientation;
    return a === -90 ? 270 : a;
  }
  function maskSide() {
    var m = param("mask") || lsGet("mask");
    if (m !== "camera") return m;
    var a = screenAngle();
    if (a === 90) return "left";
    if (a === 270) return "right";
    return "none";
  }
  function catEnd() {
    var c = param("cat") || lsGet("cat");
    if (c === "top" || c === "bottom" || c === "off") return c;
    var m = param("mask") || lsGet("mask");
    if (m === "camera") return screenAngle() === 90 ? "bottom" : "top";
    return "bottom";
  }
  function applyMask() {
    var m = param("mask");
    if (m) lsSet("mask", m);
    var c = param("cat");
    if (c) lsSet("cat", c);
    var cls = document.documentElement.className.replace(/\s*mask-\w+/g, "");
    var side = maskSide();
    var on = side === "left" || side === "right";
    document.documentElement.className = cls + (on ? " mask-" + side : "");
    var end = catEnd();
    Cat.place(on && end !== "off" ? side : null, end, (param("mask") || lsGet("mask")) === "camera");
  }

  // anti burn-in: walk the panel through a 3x3 grid of small offsets
  var SHIFTS = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  function applyShift() {
    var every = (state.data && state.data.display && state.data.display.pixelShiftMinutes) || 3;
    var s = SHIFTS[Math.floor(Date.now() / (every * 60000)) % SHIFTS.length];
    led.shift(s[0], s[1]);
  }

  // ---------- header: clock + weather ----------
  function drawHeader() {
    var d = new Date(nowSec() * 1000);
    var x = led.text(1, 1, DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + d.getDate(), C.dim);

    var right = led.cols - 1;
    var stale = !state.fetchedAt || Date.now() - state.fetchedAt > 3 * 60 * 1000;
    if (stale || (state.data && state.data.errors && state.data.errors.length)) {
      led.textRight(right, 1, "!", C.red);
      right -= 4;
    }
    var w = state.data && state.data.weather;
    if (!w) return;
    // parts left-to-right; optional ones are dropped (least important first) until it fits
    var rain = w.rain3h != null;
    var parts = [
      { icon: ICONS[w.icon], gap: 0 },
      { s: w.temp + "°", c: C.amber, gap: 4 },
      { s: w.text || "", c: C.dim, gap: 5, drop: 1 },
      { s: w.hi + "/" + w.lo, c: C.dim, gap: 5, drop: 2 },
      { s: w.humidity != null ? "♦" : "", c: C.dim, gap: 5, drop: 3 },
      { s: w.humidity != null ? w.humidity + "%" : "", c: C.dim, gap: 1, drop: 3 },
      { s: rain ? "☂" : "", c: C.cyan, gap: 5 },
      { s: rain ? w.rain3h + "%" : "", c: C.cyan, gap: 1 },
    ];
    // gap = blank columns to the left of a part
    function pw(p) {
      return p.icon ? p.icon[0].length : p.s ? FONT.measure(p.s) : -1;
    }
    function width() {
      var t = 0;
      for (var i = 0; i < parts.length; i++) if (pw(parts[i]) >= 0) t += pw(parts[i]) + parts[i].gap;
      return t;
    }
    var room = right - x - 6;
    for (var level = 1; level <= 3 && width() > room; level++)
      for (var i = 0; i < parts.length; i++) if (parts[i].drop === level) parts[i].s = "";
    if (width() > room) return;
    for (var k = parts.length - 1; k >= 0; k--) {
      var q = parts[k], wq = pw(q);
      if (wq < 0) continue;
      if (q.icon) led.sprite(right - wq, 0, q.icon, ICON_PAL);
      else led.text(right - wq, 1, q.s, q.c);
      right -= wq + q.gap;
    }
  }

  // ---------- subway ----------
  function upcoming(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) if (mins(list[i].t) >= 0) out.push(list[i]);
    return out;
  }

  // travel time to 42 St as two columns: stop label left-aligned (TSQ / GCT / 42nd),
  // minutes right-aligned at the edge; dimmer amber = usual time, not a live prediction
  // minutes field fits "88m"
  var TRAVEL_MIN_W = FONT.measure("88m"), TRAVEL_GAP = 4;
  function travelLabelW(groups) {
    var w = 0;
    for (var i = 0; i < groups.length; i++)
      for (var r in groups[i].targets) w = Math.max(w, FONT.measure(groups[i].targets[r] || ""));
    return w;
  }
  function drawTravel(group, route, a, y, labelW) {
    if (!a || a.travelMin == null) return;
    var right = led.cols - 1;
    led.textRight(right, y, a.travelMin + "m", a.travelLive ? C.amber : C.amberDim);
    led.text(right - TRAVEL_MIN_W - TRAVEL_GAP - labelW, y, group.targets[route] || "", C.amber);
  }

  // one row per config row; routes sharing a row are merged ->
  // (2)(3) Franklin  4,7,12      TSQ 31m
  function drawList(groups) {
    var n = (state.data.display && state.data.display.arrivalsPerRoute) || 3;
    var rows = [], labelW = 0, bullets = 1, i, j, k;
    for (i = 0; i < groups.length; i++) {
      var g = groups[i];
      var defs = g.rows || g.routes.map(function (r) { return [r]; });
      labelW = Math.max(labelW, FONT.measure(g.label));
      for (j = 0; j < defs.length; j++) {
        var list = [];
        for (k = 0; k < defs[j].length; k++) {
          var arr = upcoming(g.arrivals[defs[j][k]] || []);
          for (var m = 0; m < arr.length; m++) list.push({ a: arr[m], r: defs[j][k] });
        }
        list.sort(function (a, b) { return a.a.t - b.a.t; });
        rows.push({ g: g, routes: defs[j], list: list });
        bullets = Math.max(bullets, defs[j].length);
      }
    }
    // spread the rows over the subway area
    var count = Math.min(rows.length, SUB_ROWS);
    var h = Math.min(Math.floor((SUB_ROWS * SUB_H) / Math.max(count, 1)), 16);
    var y0 = SUB_Y + Math.floor((SUB_ROWS * SUB_H - count * h) / 2);
    var xLabel = 1 + bullets * 12 + 2, xMins = xLabel + labelW + 6;
    var labelW = travelLabelW(groups), travelW = labelW + TRAVEL_GAP + TRAVEL_MIN_W;
    for (i = 0; i < count; i++) {
      var row = rows[i], y = y0 + i * h + Math.floor((h - 11) / 2);
      for (k = 0; k < row.routes.length; k++) {
        var r = row.routes[k];
        led.bullet(1 + k * 12, y, r, ROUTE_COLOR[r] || C.white, BLACK_TEXT[r] ? "#111111" : "#FFFFFF");
      }
      led.text(xLabel, y + 2, row.g.label, C.green);
      // every train within show.withinMin minutes, but at least show.minTrains;
      // trains closer than show.dimUnderMin (too soon to catch) are drawn at half brightness
      var show = row.g.show || {};
      var minTrains = show.minTrains || n, within = show.withinMin || 0, dimUnder = show.dimUnderMin || 0;
      var ms = [];
      for (k = 0; k < row.list.length; k++) {
        var mm = mins(row.list[k].a.t);
        if (ms.length >= minTrains && mm > within) break;
        ms.push(mm);
      }
      var maxX = led.cols - travelW - 4;
      if (!ms.length) led.text(xMins, y + 2, "--", C.dim);
      var xm = xMins;
      for (k = 0; k < ms.length; k++) {
        var str = (k ? "," : "") + ms[k];
        if (xm + FONT.measure(str) > maxX) break; // drop whole numbers, never half of one
        xm = led.text(xm, y + 2, str, ms[k] < dimUnder ? C.half : C.white) + 1;
      }
      var first = row.list[0];
      if (first) drawTravel(row.g, first.r, first.a, y + 2, labelW);
    }
  }

  // ---------- citi bike ----------
  function countColor(n) {
    if (n == null) return C.dim;
    if (n === 0) return C.red;
    if (n <= 2) return C.amber;
    return C.white;
  }

  // big 24 h clock, bottom left; the colon blinks once a second
  function drawClock() {
    var d = new Date(nowSec() * 1000);
    var colon = d.getSeconds() % 2 ? " " : ":";
    return led.textScaled(1, CLOCK_Y, pad(d.getHours()) + colon + pad(d.getMinutes()), C.white, CLOCK_SCALE);
  }

  // two compact lines in shared columns, block right-aligned:
  //   Bike 1   nn Bike 2   nn
  //   Dock 1   nn Dock 2   nn
  // Labels split at the last space so the words and the station numbers each get their own
  // column; counts are right-aligned in a two-digit field (bike counts include e-bikes).
  function drawBikes(cb) {
    var lines = [
      { items: cb.bikes || [], kind: "bikes" },
      { items: cb.docks || [], kind: "docks" },
    ];
    var gap = FONT.measure("   "), numW = FONT.measure("88"), sep = FONT.measure(" ") + 1, sp = FONT.measure(" ") + 1;
    var wordW = 0, idW = 0, cols = 0, i, j;
    function split(label) {
      var k = label.lastIndexOf(" ");
      return k < 0 ? [label, ""] : [label.slice(0, k), label.slice(k + 1)];
    }
    for (i = 0; i < lines.length; i++) {
      cols = Math.max(cols, lines[i].items.length);
      for (j = 0; j < lines[i].items.length; j++) {
        var parts = split(lines[i].items[j].label);
        wordW = Math.max(wordW, FONT.measure(parts[0]));
        idW = Math.max(idW, FONT.measure(parts[1]));
      }
    }
    var entryW = wordW + sp + idW + 1 + gap + 1 + numW;
    var x0 = led.cols - 1 - (cols * entryW + (cols - 1) * sep);
    for (i = 0; i < lines.length; i++) {
      var ln = lines[i], y = BIKE_Y + 1 + i * INFO_H;
      for (j = 0; j < ln.items.length; j++) {
        var s = ln.items[j], x = x0 + j * (entryW + sep), lp = split(s.label);
        led.text(x, y, lp[0], C.dim);
        led.textRight(x + wordW + sp + idW, y, lp[1], C.dim);
        var count = s.missing ? null : ln.kind === "bikes" ? s.bikes : s.docks;
        led.textRight(x + entryW, y, count == null ? "--" : "" + count, countColor(count));
      }
    }
  }



  // night (display.night, e.g. 01:00-08:00): the screen goes fully black; a tap shows the
  // board for WAKE_MS
  var WAKE_MS = 30000;
  function minutesOf(hhmm) {
    var p = String(hhmm).split(":");
    return Number(p[0]) * 60 + Number(p[1] || 0);
  }
  function isNight() {
    var n = state.data && state.data.display && state.data.display.night;
    if (!n || Date.now() < state.wakeUntil) return false;
    var d = new Date(nowSec() * 1000), m = d.getHours() * 60 + d.getMinutes();
    var a = minutesOf(n.from), b = minutesOf(n.to);
    return a <= b ? m >= a && m < b : m >= a || m < b;
  }

  function draw() {
    var night = isNight();
    var cls = document.documentElement.className.replace(/\s*night/g, "");
    document.documentElement.className = cls + (night ? " night" : "");
    if (night) return;
    applyShift();
    led.clear();
    drawHeader();
    var d = state.data;
    drawClock();
    if (d) {
      drawList(d.subway || []);
      if (d.citibike) drawBikes(d.citibike);
    } else {
      led.text(15, SUB_Y + 2, "Loading...", C.dim);
    }
    led.render();
  }

  function poll() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/data", true);
    xhr.timeout = 20000;
    xhr.onload = function () {
      if (xhr.status !== 200) return;
      try {
        var d = JSON.parse(xhr.responseText);
        // the server's code changed (an update was deployed): load the new page
        if (state.data && d.version && state.data.version && d.version !== state.data.version) {
          location.reload();
          return;
        }
        state.data = d;
        state.offset = d.now - Date.now() / 1000;
        state.fetchedAt = Date.now();
        draw();
      } catch (e) {}
    };
    xhr.send();
  }

  function init() {
    Cat.init(document.getElementById("cat"));
    applyMask();
    var canvas = document.getElementById("board");
    led = new LedMatrix(canvas, ROWS, { showUnlitDots: true, glow: true, minCols: MIN_COLS });
    var relayout = function () {
      applyMask();
      led.resize();
      draw();
    };
    window.addEventListener("resize", relayout);
    if (screen.orientation && screen.orientation.addEventListener)
      screen.orientation.addEventListener("change", relayout);
    else window.addEventListener("orientationchange", relayout);
    // at night a tap shows the board for a while (on the document: the hidden canvas gets no clicks)
    document.addEventListener("click", function () {
      if (!isNight()) return;
      state.wakeUntil = Date.now() + WAKE_MS;
      draw();
    });
    if (navigator.wakeLock) {
      var lock = function () { navigator.wakeLock.request("screen").catch(function () {}); };
      lock();
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") lock();
      });
    }
    draw();
    poll();
    setInterval(poll, 30000);
    // redraw on each second boundary so the colon blinks evenly
    (function tick() {
      draw();
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    })();
  }

  window.addEventListener("load", init);
})();
