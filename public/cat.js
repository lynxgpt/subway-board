// Siamese pixel cat that walks along the masked strip (only shown when a ?mask strip is on).
// Anti-gravity: its feet are on the outer screen edge and it paces along the short side, from the
// strip's safe end to 80% of its length (never in the 20% next to the broken corner). On the
// camera side it meets the punch-hole camera; being a liquid, it flows around it. ES5.
var Cat = (function () {
  var PAL = {
    c: "#F0DEB8", // cream coat
    l: "#A07850", // shading
    b: "#5A3A24", // seal points (ears, mask, legs, tail)
    e: "#4FB4FF", // blue eye
    p: "#FF8FA8", // nose
  };
  // side view facing right, feet on the bottom row; 18 x 11 with the legs.
  // "TT" is where the tail tip goes (see TAIL).
  var BODY = [
    ".............b...b",
    ".............bcccb",
    "TT...........cbebb",
    "TT...........cbbbp",
    ".b..cccccccccccbb.",
    "..bcccccccccccc...",
    "...ccccccccccccc..",
    "...ccccccccccccc..",
    "...lccccccccccl...",
  ];
  var LEGS = [
    ["....b.b.....b.b...", "...b...b...b...b.."], // stride
    ["....bb......bb....", "....bb......bb...."], // passing
  ];
  var TAIL = [
    ["..", ".b"], // down
    [".b", "b."], // flicked up
  ];
  var W = 18, H = 11, ROWS = 102, STEP_MS = 220, PAUSE = 12, REACH = 0.8;
  var STRIP = 0.08; // strip width as a fraction of the screen (matches index.html)
  // Galaxy S21 front camera, in device pixels (from its display cut-out spec: 60 x 80 px,
  // centred on the camera edge), and how many dots the cat takes to ease around it
  var HOLE = { centre: 0.5, halfPx: 30, depthPx: 80 }, TAPER = 4;
  var CORNER_PX = 90; // S21 rounded-corner radius: the cat stays this far from the strip's end
  var led, canvas, side = null, end = "bottom", hole = false;
  var pos = null, dir = -1, pause = 0, tick = 0;

  function sprite(t, blink) {
    var legs = LEGS[t % 2], tail = TAIL[(t >> 1) % 2], rows = [], i;
    for (i = 0; i < BODY.length; i++) {
      var r = BODY[i];
      if (i === 2 || i === 3) r = tail[i - 2] + r.slice(2);
      if (blink) r = r.replace("e", "b");
      rows.push(r);
    }
    return rows.concat(legs);
  }

  // range of the cat's top row, keeping clear of the 20% next to the broken corner
  function range() {
    var reach = Math.round(ROWS * REACH), inset = Math.ceil(CORNER_PX / led.pitch);
    return end === "bottom" ? [ROWS - reach, ROWS - W - inset] : [inset, reach - W];
  }

  function frame() {
    if (!led || !side || /\bnight\b/.test(document.documentElement.className)) return;
    var r = range();
    if (pos === null || pos < r[0] || pos > r[1]) pos = end === "bottom" ? r[1] : r[0];
    if (pause > 0) pause--;
    else {
      pos += dir;
      tick++;
      if (pos <= r[0] || pos >= r[1]) {
        pos = Math.max(r[0], Math.min(r[1], pos));
        dir = -dir;
        pause = PAUSE;
      }
    }
    var rows = sprite(pause ? 1 : tick, pause > 0 && pause < 4);
    led.clear();
    var band = hole ? holeBand() : null;
    // the sprite faces the walking direction; its feet go against the outer screen edge.
    // f = height above the feet; each slice across the strip is shifted off the edge and
    // squeezed where it passes the camera (liquid cat).
    for (var sy = 0; sy < H; sy++)
      for (var sx = 0; sx < W; sx++) {
        var c = PAL[rows[sy].charAt(sx)];
        if (!c) continue;
        var y = pos + (dir < 0 ? W - 1 - sx : sx);
        var f = H - 1 - sy, off = 0, sc = 1;
        if (band) {
          var d = y < band[0] ? band[0] - y : y > band[1] ? y - band[1] : 0;
          off = Math.round(band[2] * Math.max(0, 1 - d / TAPER));
          sc = Math.min(1, (led.cols - off) / H);
        }
        var xi = off + Math.floor(f * sc);
        led.set(side === "left" ? xi : led.cols - 1 - xi, y, c);
      }
    led.render();
  }

  // camera hole in this panel's dots: [first row, last row, depth in columns from the edge]
  function holeBand() {
    var p = led.pitch, mid = canvas.height * HOLE.centre;
    return [
      Math.floor((mid - HOLE.halfPx - led.oy) / p),
      Math.ceil((mid + HOLE.halfPx - led.oy) / p) - 1,
      Math.ceil((HOLE.depthPx - led.ox) / p) + 1,
    ];
  }

  // s: "left" | "right" | null (hidden); e: "top" | "bottom" = the strip's safe end;
  // h: the strip is on the camera edge, so walk around the camera hole
  function place(s, e, h) {
    side = s;
    hole = !!h;
    if (!s) {
      canvas.style.display = "none";
      return;
    }
    if (e !== end) pos = null;
    end = e;
    canvas.style.display = "block";
    canvas.style.left = s === "left" ? "0" : "auto";
    canvas.style.right = s === "right" ? "0" : "auto";
    canvas.style.top = "0";
    canvas.style.width = document.documentElement.clientWidth * STRIP + "px";
    canvas.style.height = "100%";
    // the panel is created on first placement: a hidden canvas has no size yet.
    // Same row count as the board, so the cat's dots match the board's.
    if (!led) led = new LedMatrix(canvas, ROWS, { showUnlitDots: false, glow: true });
    else led.resize();
  }

  function init(el) {
    canvas = el;
    canvas.style.display = "none";
    setInterval(frame, STEP_MS);
  }

  return { init: init, place: place };
})();
