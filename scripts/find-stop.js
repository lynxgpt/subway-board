// Find subway stop IDs for config.json (needs data/stops.json: `npm run fetch-stops` first).
//   npm run find-stop -- "franklin"
//   npm run find-stop -- "times sq"
// Each station prints its platform IDs: ...N is northbound (toward the Bronx / upper Manhattan /
// Queens), ...S is southbound (toward lower Manhattan / Brooklyn).
const fs = require("fs");
const { FILE } = require("../lib/stops");

let names;
try {
  names = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch (_) {
  console.error("No data/stops.json yet: run `npm run fetch-stops` first.");
  process.exit(1);
}

const q = process.argv.slice(2).join(" ").toLowerCase();
if (!q) {
  console.error('Usage: npm run find-stop -- "station name"');
  process.exit(1);
}

// parent stations are the IDs without a trailing N/S
const parents = Object.keys(names).filter((id) => !/[NS]$/.test(id) && names[id].toLowerCase().includes(q));
for (const id of parents.sort()) {
  const dirs = ["N", "S"].filter((d) => names[id + d]).map((d) => id + d);
  console.log(`${names[id].padEnd(40)} ${dirs.join("  ")}`);
}
if (!parents.length) console.log("No match. Try a shorter name, e.g. \"42\" or \"atlantic\".");
