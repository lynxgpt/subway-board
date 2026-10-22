// MOCK=1: fake GTFS-RT feeds (encoded + decoded through the real protobuf path),
// fake Citi Bike and weather, so the board can be developed offline.
const { transit_realtime } = require("gtfs-realtime-bindings");
const { arrivalsFor } = require("./mta");
const { stopName } = require("./stops");

const DEST = {
  2: ["201N", "Wakefield-241 St"],
  3: ["301N", "Harlem-148 St"],
  4: ["401N", "Woodlawn"],
  5: ["501N", "Eastchester-Dyre Av"],
  B: ["D03N", "Bedford Park Blvd"],
  Q: ["Q05N", "96 St"],
};
const HEADWAY = { 2: 9, 3: 11, 4: 7, 5: 10, B: 12, Q: 8 };

function fakeFeed(config, nowSec) {
  const entity = [];
  for (const g of config.subway) {
    for (const r of g.routes) {
      const target = (g.target || {})[r];
      for (let k = 0; k < 4; k++) {
        const t = nowSec + 60 * (2 + k * HEADWAY[r] + (r.charCodeAt(0) % 5));
        const stus = [{ stopId: g.stopId, arrival: { time: t } }];
        if (target && k !== 2) {
          // trip k=2 has no target stop -> exercises fallbackMin
          stus.push({ stopId: target.stopId, arrival: { time: t + 60 * (target.fallbackMin + k - 1) } });
        }
        stus.push({ stopId: DEST[r][0], arrival: { time: t + 3600 } });
        entity.push({
          id: r + k,
          tripUpdate: { trip: { tripId: "mock_" + r + k, routeId: r }, stopTimeUpdate: stus },
        });
      }
    }
  }
  const msg = transit_realtime.FeedMessage.fromObject({
    header: { gtfsRealtimeVersion: "2.0", timestamp: nowSec },
    entity,
  });
  return transit_realtime.FeedMessage.decode(transit_realtime.FeedMessage.encode(msg).finish());
}

function mockSubway(config) {
  const nowSec = Math.floor(Date.now() / 1000);
  const feed = fakeFeed(config, nowSec);
  const groups = config.subway.map((g) => {
    const arrivals = arrivalsFor(g, [feed], nowSec);
    for (const list of Object.values(arrivals))
      for (const a of list) if (!a.destName) a.destName = (DEST[routeOf(a)] || [])[1] || stopName(a.dest);
    return {
      label: g.label,
      stopId: g.stopId,
      routes: g.routes,
      rows: g.rows || g.routes.map((r) => [r]),
      targets: Object.fromEntries(Object.entries(g.target || {}).map(([r, v]) => [r, v.label])),
      arrivals,
    };
  });
  return { groups, errors: [] };
}

function routeOf(a) {
  return a.tripId.replace("mock_", "").slice(0, -1);
}

function mockCitibike(config) {
  const c = config.citibike;
  return {
    bikes: c.bikes.map((w, i) => ({ label: w.label, bikes: [7, 0][i], ebikes: [2, 0][i], docks: 10 })),
    docks: c.docks.map((w, i) => ({ label: w.label, bikes: 3, ebikes: 0, docks: [12, 1][i] })),
    errors: [],
  };
}

function mockWeather() {
  return {
    weather: { temp: 14, feels: 12, code: 3, text: "Cloudy", icon: "cloud", humidity: 62, hi: 17, lo: 11, rainToday: 40, rain3h: 20 },
    errors: [],
  };
}

module.exports = { mockSubway, mockCitibike, mockWeather };
