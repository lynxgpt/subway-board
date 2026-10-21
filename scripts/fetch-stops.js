// Download MTA static subway GTFS and write data/stops.json ({ stop_id: stop_name }).
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const { FILE } = require("../lib/stops");

const URLS = [
  "https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip",
  "http://web.mta.info/developers/data/nyct/subway/google_transit.zip",
];

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function main() {
  let buf;
  for (const u of URLS) {
    try {
      const res = await fetch(u);
      if (!res.ok) throw new Error(res.status);
      buf = Buffer.from(await res.arrayBuffer());
      console.log("downloaded", u);
      break;
    } catch (e) {
      console.log("failed", u, e.message || e);
    }
  }
  if (!buf) process.exit(1);

  const text = new AdmZip(buf).readAsText("stops.txt");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const head = parseCsvLine(lines[0]);
  const iId = head.indexOf("stop_id");
  const iName = head.indexOf("stop_name");
  const names = {};
  for (const l of lines.slice(1)) {
    const f = parseCsvLine(l);
    names[f[iId]] = f[iName];
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(names));
  console.log(`wrote ${Object.keys(names).length} stops to ${FILE}`);
  for (const id of ["239", "D25", "127", "631", "D16", "R16"]) console.log(`  ${id} = ${names[id]}`);
}

main();
