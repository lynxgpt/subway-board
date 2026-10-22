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
  var SUB_Y = 11, SUB_ROWS = 6, SUB_H = 12, BIKE_Y = 84, INFO_H = 9;
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var state = { data: null, offset: 0, fetchedAt: 0, style: null };
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

  function currentStyle() {
    return param("style") || state.style || lsGet("style") || (state.data && state.data.display.style) || "list";
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
    // colon blinks once a second (a space is the same width, so nothing moves)
    var colon = d.getSeconds() % 2 ? " " : ":";
    var x = led.text(1, 1, pad(d.getHours()) + colon + pad(d.getMinutes()), C.white);
    x = led.text(x + 5, 1, DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + d.getDate(), C.dim);

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

  function travelText(group, route, a) {
    if (!a || a.travelMin == null) return "";
    return (group.targets[route] || "") + " " + (a.travelLive ? "" : "~") + a.travelMin + "m";
  }

  // style "list": one row per config row; routes sharing a row are merged ->
  // (2)(3) Franklin  4,7,12      42St 31m
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
    var travelW = FONT.measure("42St ~29m");
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
      if (first) led.textRight(led.cols - 1, y + 2, travelText(row.g, first.r, first.a), C.amber);
    }
  }

  // style "next": one row per train, soonest first -> (Q) 96 St      11 min  42St 27m
  function drawNext(groups) {
    var max = Math.min(SUB_ROWS, (state.data.display && state.data.display.maxRowsNext) || SUB_ROWS);
    var all = [], i, j;
    for (i = 0; i < groups.length; i++)
      for (j = 0; j < groups[i].routes.length; j++) {
        var r = groups[i].routes[j];
        var list = upcoming(groups[i].arrivals[r] || []);
        for (var k = 0; k < list.length; k++) all.push({ g: groups[i], r: r, a: list[k] });
      }
    all.sort(function (a, b) { return a.a.t - b.a.t; });
    var travelW = FONT.measure("42St ~29m");
    var minW = FONT.measure("88 min");
    for (i = 0; i < all.length && i < max; i++) {
      var it = all[i], y = SUB_Y + i * SUB_H;
      var right = led.cols - 1;
      led.textRight(right, y + 2, travelText(it.g, it.r, it.a), C.amber);
      right -= travelW + 6;
      led.textRight(right, y + 2, mins(it.a.t) + " min", C.white);
      right -= minW + 4;
      led.bullet(1, y, it.r, ROUTE_COLOR[it.r] || C.white, BLACK_TEXT[it.r] ? "#111111" : "#FFFFFF");
      led.text(15, y + 2, it.a.destName || it.g.label, C.blue, right);
    }
  }

  // ---------- citi bike ----------
  function countColor(n) {
    if (n == null) return C.dim;
    if (n === 0) return C.red;
    if (n <= 2) return C.amber;
    return C.white;
  }

  function drawBikes(cb) {
    var x0 = FONT.measure("Docks") + 5;
    var cellW = Math.floor((led.cols - x0) / 2);
    var rowsDef = [
      { y: BIKE_Y + 1, title: "Bikes", color: C.green, items: cb.bikes, kind: "bikes" },
      { y: BIKE_Y + 1 + INFO_H, title: "Docks", color: C.cyan, items: cb.docks, kind: "docks" },
    ];
    for (var i = 0; i < rowsDef.length; i++) {
      var d = rowsDef[i];
      led.text(1, d.y, d.title, d.color);
      for (var j = 0; j < 2; j++) {
        var s = d.items[j];
        if (!s) continue;
        var x = x0 + j * cellW, end = x + cellW - 6;
        if (s.missing) {
          led.text(x, d.y, s.label + " --", C.dim, end);
          continue;
        }
        // num_bikes_available already includes e-bikes
        var count = d.kind === "bikes" ? s.bikes : s.docks;
        var right = led.textRight(end, d.y, count == null ? "-" : "" + count, countColor(count)) - 4;
        led.text(x, d.y, s.label, C.dim, right);
      }
    }
  }

  function draw() {
    applyShift();
    led.clear();
    drawHeader();
    var d = state.data;
    if (d) {
      if (currentStyle() === "next") drawNext(d.subway || []);
      else drawList(d.subway || []);
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
    canvas.addEventListener("click", function () {
      state.style = currentStyle() === "list" ? "next" : "list";
      lsSet("style", state.style);
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
