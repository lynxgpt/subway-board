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
  };

  // matrix height in dots: header 9 + gap 2 + 6 subway rows x 12 + gap 1 + 2 bike rows x 9
  var ROWS = 102;
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

  function currentStyle() {
    var m = /[?&]style=(\w+)/.exec(location.search);
    return (m && m[1]) || state.style || lsGet("style") || (state.data && state.data.display.style) || "list";
  }

  // ---------- header: clock + weather ----------
  function drawHeader() {
    var d = new Date(nowSec() * 1000);
    var h = d.getHours() % 12 || 12;
    var x = led.text(1, 1, h + ":" + pad(d.getMinutes()), C.white);
    led.text(x + 5, 1, DAYS[d.getDay()] + " " + MONTHS[d.getMonth()] + " " + d.getDate(), C.dim);

    var right = led.cols - 1;
    var stale = !state.fetchedAt || Date.now() - state.fetchedAt > 3 * 60 * 1000;
    if (stale || (state.data && state.data.errors && state.data.errors.length)) {
      led.textRight(right, 1, "!", C.red);
      right -= 4;
    }
    var w = state.data && state.data.weather;
    if (!w) return;
    if (w.rain3h != null) {
      right = led.textRight(right, 1, w.rain3h + "%", C.cyan) - 1;
      right = led.textRight(right, 1, "☂", C.cyan) - 5;
    }
    right = led.textRight(right, 1, w.hi + "/" + w.lo, C.dim) - 5;
    if (w.text) right = led.textRight(right, 1, w.text, C.dim) - 5;
    led.textRight(right, 1, w.temp + "°", C.amber);
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

  // style "list": one row per route -> (2) Franklin  4,12,20      42St 29m
  function drawList(groups) {
    var n = (state.data.display && state.data.display.arrivalsPerRoute) || 3;
    var labelW = 0, i, j;
    for (i = 0; i < groups.length; i++) labelW = Math.max(labelW, FONT.measure(groups[i].label));
    var xLabel = 15, xMins = xLabel + labelW + 6;
    var travelW = FONT.measure("42St ~29m");
    var row = 0;
    for (i = 0; i < groups.length && row < SUB_ROWS; i++) {
      var g = groups[i];
      for (j = 0; j < g.routes.length && row < SUB_ROWS; j++, row++) {
        var r = g.routes[j];
        var y = SUB_Y + row * SUB_H;
        var list = upcoming(g.arrivals[r] || []);
        led.bullet(1, y, r, ROUTE_COLOR[r] || C.white, BLACK_TEXT[r] ? "#111111" : "#FFFFFF");
        led.text(xLabel, y + 2, g.label, C.green);
        var ms = [];
        for (var k = 0; k < list.length && ms.length < n; k++) ms.push(mins(list[k].t));
        var maxX = led.cols - travelW - 4;
        led.text(xMins, y + 2, ms.length ? ms.join(",") : "--", ms.length ? C.white : C.dim, maxX);
        led.textRight(led.cols - 1, y + 2, travelText(g, r, list[0]), C.amber);
      }
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
        var right = end;
        var count = d.kind === "bikes" ? s.bikes : s.docks;
        if (d.kind === "bikes" && s.ebikes) {
          right = led.textRight(right, d.y, "e" + s.ebikes, C.yellow) - 4;
        }
        right = led.textRight(right, d.y, count == null ? "-" : "" + count, countColor(count)) - 4;
        led.text(x, d.y, s.label, C.dim, right);
      }
    }
  }

  function draw() {
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
    var canvas = document.getElementById("board");
    led = new LedMatrix(canvas, ROWS, { showUnlitDots: true, glow: true });
    window.addEventListener("resize", function () {
      led.resize();
      draw();
    });
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
    setInterval(draw, 1000);
  }

  window.addEventListener("load", init);
})();
