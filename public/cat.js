// Siamese pixel cat that walks along the masked strip (only shown when a ?mask strip is on).
// Anti-gravity: its feet are on the outer screen edge and it paces along the short side, from the
// strip's safe end to 80% of its length (never in the 20% next to the broken corner). ES5.
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
  var led, canvas, side = null, end = "bottom";
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
    var reach = Math.round(ROWS * REACH);
    return end === "bottom" ? [ROWS - reach, ROWS - W] : [0, reach - W];
  }

  function frame() {
    if (!led || !side) return;
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
    // the sprite faces the walking direction; its feet go against the outer screen edge
    for (var sy = 0; sy < H; sy++)
      for (var sx = 0; sx < W; sx++) {
        var c = PAL[rows[sy].charAt(sx)];
        if (!c) continue;
        var y = pos + (dir < 0 ? W - 1 - sx : sx);
        var x = side === "left" ? H - 1 - sy : led.cols - H + sy;
        led.set(x, y, c);
      }
    led.render();
  }

  // s: "left" | "right" | null (hidden); e: "top" | "bottom" = the strip's safe end
  function place(s, e) {
    side = s;
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
