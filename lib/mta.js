// MTA GTFS-Realtime subway feeds (no API key).
const { transit_realtime } = require("gtfs-realtime-bindings");
const { cached } = require("./cache");
const { stopName } = require("./stops");

const BASE = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs";

const FEED_FOR_ROUTE = {
  1: "", 2: "", 3: "", 4: "", 5: "", 6: "", 7: "", GS: "",
  A: "-ace", C: "-ace", E: "-ace", H: "-ace", FS: "-ace",
  B: "-bdfm", D: "-bdfm", F: "-bdfm", M: "-bdfm",
  G: "-g",
  J: "-jz", Z: "-jz",
  N: "-nqrw", Q: "-nqrw", R: "-nqrw", W: "-nqrw",
  L: "-l",
  SI: "-si",
};

function feedUrl(route) {
  const suffix = FEED_FOR_ROUTE[route];
  if (suffix === undefined) throw new Error("unknown route " + route);
  return BASE + suffix;
}

async function fetchFeed(url) {
  const res = await fetch(url, { headers: { "User-Agent": "subway-board" } });
  if (!res.ok) throw new Error("MTA " + res.status + " " + url);
  const buf = new Uint8Array(await res.arrayBuffer());
  return transit_realtime.FeedMessage.decode(buf);
}

function toSec(t) {
  if (t == null) return null;
  return typeof t === "number" ? t : Number(t.toString());
}

function stopTime(stu) {
  return toSec((stu.arrival && stu.arrival.time) || (stu.departure && stu.departure.time));
}

// Extract arrivals for one station group from decoded feeds.
function arrivalsFor(group, feeds, nowSec) {
  const byRoute = {};
  for (const r of group.routes) byRoute[r] = [];

  for (const feed of feeds) {
    for (const ent of feed.entity) {
      const tu = ent.tripUpdate;
      if (!tu || !tu.trip) continue;
      const route = tu.trip.routeId;
      if (!byRoute[route]) continue;
      const stus = tu.stopTimeUpdate || [];
      const i = stus.findIndex((s) => s.stopId === group.stopId);
      if (i < 0) continue;
      const t = stopTime(stus[i]);
      if (t == null || t < nowSec - 30) continue;

      const last = stus[stus.length - 1];
      const target = (group.target || {})[route];
      let travelMin = null;
      let travelLive = false;
      if (target) {
        const j = stus.findIndex((s, k) => k > i && s.stopId === target.stopId);
        const tt = j >= 0 ? stopTime(stus[j]) : null;
        if (tt != null) {
          travelMin = Math.round((tt - t) / 60);
          travelLive = true;
        } else if (target.fallbackMin != null) {
          travelMin = target.fallbackMin;
        }
      }
      byRoute[route].push({
        t,
        tripId: tu.trip.tripId,
        dest: last ? last.stopId : "",
        destName: last ? stopName(last.stopId) : "",
        travelMin,
        travelLive,
      });
    }
  }
  for (const r of Object.keys(byRoute)) byRoute[r].sort((a, b) => a.t - b.t);
  return byRoute;
}

async function getSubway(config) {
  const urls = new Set();
  for (const g of config.subway) for (const r of g.routes) urls.add(feedUrl(r));

  const errors = [];
  const feeds = [];
  await Promise.all(
    [...urls].map(async (u) => {
      const e = await cached("mta:" + u, config.refreshSeconds.subway, () => fetchFeed(u));
      if (e.error) errors.push(e.error);
      if (e.value) feeds.push(e.value);
    })
  );

  const nowSec = Math.floor(Date.now() / 1000);
  const groups = config.subway.map((g) => ({
    label: g.label,
    stopId: g.stopId,
    routes: g.routes,
    rows: g.rows || g.routes.map((r) => [r]),
    show: g.show || null,
    targets: Object.fromEntries(
      Object.entries(g.target || {}).map(([r, v]) => [r, v.label])
    ),
    arrivals: arrivalsFor(g, feeds, nowSec),
  }));
  return { groups, errors };
}

module.exports = { getSubway, arrivalsFor, feedUrl };
