// Stop-name lookup from data/stops.json (built by `npm run fetch-stops`).
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "stops.json");
let names = {};

function load() {
  try {
    names = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (_) {
    names = {};
  }
  return Object.keys(names).length;
}

function stopName(stopId) {
  if (!stopId) return "";
  return names[stopId] || names[stopId.replace(/[NS]$/, "")] || "";
}

module.exports = { load, stopName, FILE };
