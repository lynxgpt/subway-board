// Dancing Siamese pixel cat for the black strip (only shown when a ?mask strip is on).
// Drawn on its own small LED canvas with finer dots than the board. ES5.
var Cat = (function () {
  var PAL = {
    c: "#F0DEB8", // cream coat
    l: "#A07850", // shading
    b: "#5A3A24", // seal points (ears, mask, paws, tail)
    e: "#4FB4FF", // blue eyes
    p: "#FF8FA8", // nose
    n: "#FFD000", // music notes
  };
  var HEAD = [
    ".b...........b.",
    ".bb.........bb.",
    ".bbcccccccccbb.",
    ".ccccclllccccc.",
    ".ceeccblbcceec.",
    ".cccclbbblcccc.",
    "..ccclbpblccc..",
    "...ccllbllcc...",
    ".....ccccc.....",
  ];
  var BODY = [
    "....ccccccc....",
    "...ccccccccc...",
    "..ccccccccccc..",
    "..ccccccccccc..",
    "..ccccccccccc..",
    "..ccccccccccc..",
    "..bbcccccccbb..",
    "..bb.......bb..",
  ];
  var NOTE = ["..nnn", "..n.n", "..n..", "nnn..", "nnn.."];
  // arm pixels relative to the body's top-left (left arm; the right one is mirrored)
  var ARM_DOWN = [[1, 2], [1, 3], [1, 4], [2, 5]];
  var ARM_UP = [[1, 1], [0, 0], [0, -1], [0, -2]];
  var TAILS = [
    [[13, 6], [14, 6], [15, 5], [16, 4], [16, 3], [16, 2], [15, 1]],
    [[13, 6], [14, 6], [15, 6], [16, 5], [17, 4], [18, 3], [18, 2]],
  ];
  // per beat: head sway, bounce, left arm up, right arm up, tail
  var BEATS = [
    { sway: 0, dy: 0, l: 1, r: 0, tail: 0 },
    { sway: 1, dy: -1, l: 0, r: 0, tail: 1 },
    { sway: 0, dy: 0, l: 0, r: 1, tail: 0 },
    { sway: -1, dy: -1, l: 0, r: 0, tail: 1 },
  ];
  var W = 21, H = 30, X0 = 2, BEAT_MS = 350;
  var STRIP = 0.08; // strip width as a fraction of the screen (matches index.html)
  var led, canvas, timer, beat = 0;

  function pts(list, x, y, color, mirror) {
    for (var i = 0; i < list.length; i++)
      led.set(mirror ? x + 14 - list[i][0] : x + list[i][0], y + list[i][1], color);
  }

  function frame() {
    if (!led || canvas.style.display === "none") return;
    var f = BEATS[beat % BEATS.length];
    var blink = beat % 23 === 0;
    led.clear();
    var top = H - 18 + f.dy;
    var head = HEAD;
    if (blink) head = head.map(function (r) { return r.replace(/e/g, "b"); });
    led.sprite(X0 + f.sway, top, head, PAL);
    var by = top + 9;
    led.sprite(X0, by, BODY, PAL);
    pts(f.l ? ARM_UP : ARM_DOWN, X0, by, PAL.b, false);
    pts(f.r ? ARM_UP : ARM_DOWN, X0, by, PAL.b, true);
    pts(TAILS[f.tail], X0, by, PAL.b, false);
    // two notes drifting up, one on each side
    var t = beat % 16;
    if (t < 10) led.sprite(1, 10 - t, NOTE, PAL);
    if (t >= 6) led.sprite(14, 10 - (t - 6), NOTE, PAL);
    led.render();
    beat++;
  }

  // side: "left" | "right" | null (hidden); end: "top" | "bottom"
  function place(side, end) {
    if (!side) {
      canvas.style.display = "none";
      return;
    }
    canvas.style.display = "block";
    canvas.style.left = side === "left" ? "0" : "auto";
    canvas.style.right = side === "right" ? "0" : "auto";
    var w = document.documentElement.clientWidth * STRIP;
    canvas.style.width = w + "px";
    canvas.style.height = (w * (H + 1)) / (W + 1.5) + "px"; // +1.5: keep all W columns despite rounding
    canvas.style.top = end === "top" ? "0" : "auto";
    canvas.style.bottom = end === "bottom" ? "0" : "auto";
    // the panel is created on first placement: a hidden canvas has no size yet
    if (!led) led = new LedMatrix(canvas, H, { showUnlitDots: false, glow: true });
    else led.resize();
  }

  function init(el) {
    canvas = el;
    canvas.style.display = "none";
    timer = setInterval(frame, BEAT_MS);
  }

  return { init: init, place: place };
})();
