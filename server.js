// subway-board server: serves public/ and GET /api/data.
// Runs in Termux on the phone; other devices on the same Wi-Fi can open http://<phone-ip>:8080
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const config = require("./config.json");
const stops = require("./lib/stops");
const { getSubway } = require("./lib/mta");
const { getCitibike } = require("./lib/citibike");
const { getWeather } = require("./lib/weather");
const mock = require("./lib/mock");

const MOCK = process.env.MOCK === "1";
// changes whenever public/ or config.json changes; open boards reload when it does
const VERSION = String(
  Math.max(
    fs.statSync(path.join(__dirname, "config.json")).mtimeMs,
    ...fs.readdirSync(path.join(__dirname, "public")).map(
      (f) => fs.statSync(path.join(__dirname, "public", f)).mtimeMs
    )
  )
);
const PORT = Number(process.env.PORT || config.port);
const PUBLIC = path.join(__dirname, "public");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

async function data() {
  const [subway, citibike, weather] = MOCK
    ? [mock.mockSubway(config), mock.mockCitibike(config), mock.mockWeather()]
    : await Promise.all([
        getSubway(config).catch((e) => ({ groups: [], errors: [String(e.message || e)] })),
        getCitibike(config).catch((e) => ({ bikes: [], docks: [], errors: [String(e.message || e)] })),
        getWeather(config).catch((e) => ({ weather: null, errors: [String(e.message || e)] })),
      ]);
  return {
    now: Math.floor(Date.now() / 1000),
    version: VERSION,
    display: config.display,
    subway: subway.groups,
    citibike: { bikes: citibike.bikes, docks: citibike.docks },
    weather: weather.weather,
    errors: [...subway.errors, ...citibike.errors, ...weather.errors],
  };
}

function send(res, code, type, body) {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/data") {
    try {
      send(res, 200, TYPES[".json"], JSON.stringify(await data()));
    } catch (e) {
      send(res, 500, TYPES[".json"], JSON.stringify({ error: String(e.message || e) }));
    }
    return;
  }
  const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, "text/plain", "forbidden");
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, "text/plain", "not found");
    send(res, 200, TYPES[path.extname(file)] || "application/octet-stream", buf);
  });
});

server.listen(PORT, config.host, () => {
  const n = stops.load();
  console.log(`subway-board${MOCK ? " (MOCK)" : ""} on port ${PORT}; ${n} stop names loaded`);
  if (!n && !MOCK) console.log("No data/stops.json yet: run `npm run fetch-stops` for destination names.");
  for (const addrs of Object.values(os.networkInterfaces()))
    for (const a of addrs || [])
      if (a.family === "IPv4" && !a.internal) console.log(`  http://${a.address}:${PORT}`);
  console.log(`  http://localhost:${PORT}`);
});
