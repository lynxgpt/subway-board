// Find Citi Bike stations for config.json.
//   npm run find-station -- "eastern pkwy"        name search
//   npm run find-station -- --near 40.6741,-73.9580 [count]
//   npm run find-station -- --zip                 nearest to config.weather lat/lon
const { getJson } = require("../lib/citibike");
const config = require("../config.json");

function dist(a, b, c, d) {
  const R = 6371000, r = Math.PI / 180;
  const x = (d - b) * r * Math.cos(((a + c) / 2) * r);
  const y = (c - a) * r;
  return Math.round(Math.sqrt(x * x + y * y) * R);
}

async function main() {
  const args = process.argv.slice(2);
  const info = (await getJson("station_information.json")).data.stations;
  const status = {};
  for (const s of (await getJson("station_status.json")).data.stations) status[s.station_id] = s;

  let list;
  if (args[0] === "--near" || args[0] === "--zip") {
    const [lat, lon] =
      args[0] === "--zip"
        ? [config.weather.latitude, config.weather.longitude]
        : args[1].split(",").map(Number);
    const n = Number(args[0] === "--zip" ? args[1] : args[2]) || 10;
    list = info
      .map((s) => ({ ...s, m: dist(lat, lon, s.lat, s.lon) }))
      .sort((a, b) => a.m - b.m)
      .slice(0, n);
  } else {
    const q = (args.join(" ") || "").toLowerCase();
    list = info.filter((s) => s.name.toLowerCase().includes(q));
  }
  for (const s of list) {
    const st = status[s.station_id] || {};
    console.log(
      `${s.short_name.padEnd(9)} ${(s.m != null ? s.m + "m" : "").padStart(6)}  ` +
        `bikes ${String(st.num_bikes_available).padStart(2)} (e ${st.num_ebikes_available})  ` +
        `docks ${String(st.num_docks_available).padStart(2)}  ${s.name}`
    );
  }
  console.log('\nPut the short_name (first column) in config.json -> citibike -> "station".');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
