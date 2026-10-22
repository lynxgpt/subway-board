// Simulated LED dot-matrix panel drawn on a <canvas>. ES5 for old Android WebViews.
function LedMatrix(canvas, rows, opts) {
  this.canvas = canvas;
  this.rows = rows;
  this.opts = opts || {};
  this.bg = null;
  this.resize();
}

// Dots are square-pitched. The panel is `rows` dots tall unless that would leave fewer than
// opts.minCols columns (e.g. a 4:3 iPad), in which case it shrinks and is centred.
// A margin of one dot is kept free so the whole panel can be nudged (anti burn-in).
LedMatrix.prototype.resize = function () {
  var dpr = window.devicePixelRatio || 1;
  var rect = this.canvas.getBoundingClientRect();
  var W = Math.floor(rect.width * dpr);
  var H = Math.floor(rect.height * dpr);
  this.canvas.width = W;
  this.canvas.height = H;
  var minCols = this.opts.minCols || 0;
  var p = H / (this.rows + 1);
  if (minCols && W / (minCols + 1) < p) p = W / (minCols + 1);
  this.pitch = p;
  this.cols = Math.floor(W / p - 1);
  this.shiftMax = Math.floor(p);
  this.ox = (W - this.cols * p) / 2;
  this.oy = (H - this.rows * p) / 2;
  this.sx = 0;
  this.sy = 0;
  this.buf = new Array(this.cols * this.rows);
  this.bg = this._renderBackground(W, H);
};

// Nudge the panel by (dx, dy) in units of shiftMax/2 (each -1..1).
LedMatrix.prototype.shift = function (dx, dy) {
  this.sx = Math.round((dx * this.shiftMax) / 2);
  this.sy = Math.round((dy * this.shiftMax) / 2);
};

LedMatrix.prototype._renderBackground = function (W, H) {
  var c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  var g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  if (this.opts.showUnlitDots !== false) {
    g.fillStyle = "#151515";
    this._dots(g, null, 0.38);
  }
  return c;
};

// draw every dot (lit === null) or the dots whose colour matches
LedMatrix.prototype._dots = function (g, color, rFactor) {
  var p = this.pitch, r = p * rFactor, cols = this.cols, buf = this.buf;
  // the unlit background is drawn unshifted and moved with drawImage
  var ox = this.ox + (color === null ? 0 : this.sx), oy = this.oy + (color === null ? 0 : this.sy);
  g.beginPath();
  for (var y = 0; y < this.rows; y++) {
    for (var x = 0; x < cols; x++) {
      if (color !== null && buf[y * cols + x] !== color) continue;
      var cx = ox + (x + 0.5) * p, cy = oy + (y + 0.5) * p;
      g.moveTo(cx + r, cy);
      g.arc(cx, cy, r, 0, 6.2832);
    }
  }
  g.fill();
};

LedMatrix.prototype.clear = function () {
  for (var i = 0; i < this.buf.length; i++) this.buf[i] = undefined;
};

LedMatrix.prototype.set = function (x, y, color) {
  if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
  this.buf[y * this.cols + x] = color;
};

// Draw text with top-left at (x, y). Characters that would cross maxX are dropped.
// Returns the x after the last drawn character.
LedMatrix.prototype.text = function (x, y, str, color, maxX) {
  if (maxX == null) maxX = this.cols;
  str = String(str);
  for (var i = 0; i < str.length; i++) {
    var gl = FONT.glyph(str.charAt(i));
    if (x + gl.w > maxX) break;
    for (var k = 0; k < gl.px.length; k++) this.set(x + gl.px[k][0], y + gl.px[k][1], color);
    x += gl.w + 1;
  }
  return x - 1;
};

// Like text(), but every font dot becomes a scale x scale block of dots. Returns the end x.
LedMatrix.prototype.textScaled = function (x, y, str, color, scale) {
  str = String(str);
  for (var i = 0; i < str.length; i++) {
    var gl = FONT.glyph(str.charAt(i));
    for (var k = 0; k < gl.px.length; k++)
      for (var dy = 0; dy < scale; dy++)
        for (var dx = 0; dx < scale; dx++)
          this.set(x + gl.px[k][0] * scale + dx, y + gl.px[k][1] * scale + dy, color);
    x += (gl.w + 1) * scale;
  }
  return x - scale;
};

LedMatrix.prototype.textRight = function (rightX, y, str, color) {
  var w = FONT.measure(String(str));
  this.text(rightX - w, y, str, color);
  return rightX - w;
};

// MTA route bullet: filled circle (diameter 11) with the route letter on top.
LedMatrix.prototype.bullet = function (x, y, label, color, textColor) {
  var R = 5.5;
  for (var dy = 0; dy < 11; dy++)
    for (var dx = 0; dx < 11; dx++) {
      var ddx = dx - 5, ddy = dy - 5;
      if (ddx * ddx + ddy * ddy <= R * R - 0.5) this.set(x + dx, y + dy, color);
    }
  var gl = FONT.glyph(label);
  var gx = x + Math.floor((11 - gl.w) / 2), gy = y + 2;
  for (var k = 0; k < gl.px.length; k++) this.set(gx + gl.px[k][0], gy + gl.px[k][1], textColor);
};

// Multi-colour sprite: rows of chars, each char a key into palette ("." = off).
LedMatrix.prototype.sprite = function (x, y, rows, palette) {
  for (var dy = 0; dy < rows.length; dy++)
    for (var dx = 0; dx < rows[dy].length; dx++) {
      var c = palette[rows[dy].charAt(dx)];
      if (c) this.set(x + dx, y + dy, c);
    }
  return x + rows[0].length;
};

LedMatrix.prototype.render = function () {
  var g = this.canvas.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, this.canvas.width, this.canvas.height);
  g.drawImage(this.bg, this.sx, this.sy);
  var colors = {};
  for (var i = 0; i < this.buf.length; i++) if (this.buf[i]) colors[this.buf[i]] = 1;
  var list = Object.keys(colors);
  if (this.opts.glow !== false) {
    g.globalAlpha = 0.22;
    for (var j = 0; j < list.length; j++) {
      g.fillStyle = list[j];
      this._dots(g, list[j], 0.75);
    }
    g.globalAlpha = 1;
  }
  for (var m = 0; m < list.length; m++) {
    g.fillStyle = list[m];
    this._dots(g, list[m], 0.42);
  }
};
