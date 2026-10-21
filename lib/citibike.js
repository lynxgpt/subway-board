// Citi Bike GBFS (no API key).
const { cached } = require("./cache");

const BASES = [
  "https://gbfs.lyft.com/gbfs/2.3/bkn/en/",
  "https://gbfs.citibikenyc.com/gbfs/en/",
];

async function getJson(file) {
  let lastErr;
  for (const b of BASES) {
    try {
      const res = await fetch(b + file);
      if (res.ok) return await res.json();
      lastErr = new Error("GBFS " + res.status + " " + b + file);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function stationInfo() {
  // station list changes rarely
  const e = await cached("gbfs:info", 6 * 3600, () => getJson("station_information.json"));
  if (!e.value) throw new Error(e.error || "no station info");
  return e.value.data.stations;
}

// A config "station" may be a station_id, a short_name, or an exact name.
function resolve(stations, key) {
  if (!key) return null;
  const k = String(key).toLowerCase();
  return (
    stations.find((s) => s.station_id === key) ||
    stations.find((s) => String(s.short_name) === String(key)) ||
    stations.find((s) => s.name.toLowerCase() === k) ||
    null
  );
}

async function getCitibike(config) {
  const cfg = config.citibike;
  const want = [...cfg.bikes, ...cfg.docks];
  if (!want.some((w) => w.station)) {
    return { bikes: cfg.bikes.map(placeholder), docks: cfg.docks.map(placeholder), errors: [] };
  }

  const errors = [];
  let stations = [];
  let status = {};
  try {
    stations = await stationInfo();
    const e = await cached("gbfs:status", config.refreshSeconds.citibike, () =>
      getJson("station_status.json")
    );
    if (e.error) errors.push(e.error);
    if (e.value) for (const s of e.value.data.stations) status[s.station_id] = s;
  } catch (err) {
    errors.push(String(err.message || err));
  }

  const row = (w) => {
    const info = resolve(stations, w.station);
    if (!info) return { label: w.label, missing: true };
    const st = status[info.station_id] || {};
    return {
      label: w.label,
      name: info.name,
      bikes: st.num_bikes_available,
      ebikes: st.num_ebikes_available,
      docks: st.num_docks_available,
      renting: st.is_renting !== 0,
      returning: st.is_returning !== 0,
    };
  };
  return { bikes: cfg.bikes.map(row), docks: cfg.docks.map(row), errors };
}

function placeholder(w) {
  return { label: w.label, missing: true };
}

module.exports = { getCitibike, getJson };
