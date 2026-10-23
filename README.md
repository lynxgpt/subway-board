# subway-board

An LED-matrix-style NYC subway, Citi Bike and weather board for an old Android phone.
A Node server runs in **Termux** on the phone, and Chrome (installed as a home-screen app) shows
`http://localhost:8080`. Any other device on the same Wi-Fi (iPad, laptop) can open
`http://<phone-ip>:8080` in a browser.

![board](docs/screenshots/board.png)

Live data, taken on the phone (the black strip on the left is the `?mask=camera` setting).
See [docs/LAYOUT.md](docs/LAYOUT.md) for the layout.

## Data sources (no API keys)

| Data | Source | Refresh |
|---|---|---|
| Subway | MTA GTFS-Realtime: `nyct/gtfs` (2/3/4/5), `gtfs-bdfm` (B), `gtfs-nqrw` (Q) | 60 s |
| Citi Bike | GBFS `station_information` / `station_status` (`gbfs.lyft.com/.../bkn`, then `gbfs.citibikenyc.com`) | 60 s |
| Weather | Open-Meteo, ZIP 11238 (40.6797, -73.9641), °C: icon, temp, hi/lo, humidity, rain chance next 3 h | 10 min |
| Stop names | MTA static GTFS `stops.txt` → `data/stops.json` (`npm run fetch-stops`) | once |

Configured stations, Manhattan-bound only (`config.json` → `subway[].show`):

| Row | Departures shown | Dimmed (too soon to catch) | Travel time to |
|---|---|---|---|
| 2/3 Franklin Av `239N` | all in next 15 min, at least 6 | under 5 min | TSQ (Times Sq) |
| 4/5 Franklin Av | all in next 15 min, at least 6 | under 5 min | GCT |
| B 7 Av `D25N` | all in next 25 min, at least 4 | under 10 min | 42nd (42 St-Bryant Pk) |
| Q 7 Av | all in next 25 min, at least 4 | under 10 min | TSQ |

Citi Bike (`config.json` → `citibike`):

| Label | Station | short_name |
|---|---|---|
| Bike 1 | Sterling Pl & Classon Ave | 4033.18 |
| Bike 2 | Lincoln Pl & Classon Ave | 3960.01 |
| Dock 1 | Park Pl & Carlton Ave | 4125.13 |
| Dock 2 | Park Pl & Vanderbilt Ave | 4083.13 |

## Run on a PC (development)

```bash
npm install
npm run mock         # fake data, no network needed
npm run fetch-stops  # destination names
npm start            # live data
```

Open http://localhost:8080.

## Make it yours

Everything personal lives in [`config.json`](config.json); no code changes needed. After editing,
restart the server (`bash scripts/start.sh` on the phone) and open boards reload by themselves.

**1. Your subway stations.** Find the stop ID, then pick a direction:

```bash
npm run fetch-stops                 # once: downloads MTA stop names
npm run find-stop -- "franklin"     # -> Franklin Av-Medgar Evers College   239N  239S
```

`N` platforms run toward the Bronx / upper Manhattan / Queens, `S` toward lower Manhattan /
Brooklyn. Each entry in `subway[]` is one station:

```jsonc
{
  "label": "Franklin",              // shown on the board (keep it short, ~9 characters)
  "stopId": "239N",                 // platform from find-stop
  "routes": ["2", "3", "4", "5"],   // lines to show at this platform
  "rows": [["2", "3"], ["4", "5"]], // optional: lines sharing a row are merged
  "show": { "minTrains": 6, "withinMin": 15, "dimUnderMin": 5 },
  "target": {                       // optional: travel time to a stop you care about
    "2": { "stopId": "127N", "label": "TSQ", "fallbackMin": 29 }
  }
}
```

- `show`: list every train in the next `withinMin` minutes but at least `minTrains`; trains
  sooner than `dimUnderMin` (too soon to catch) are drawn dimmed.
- `target`: the board shows the trip time from your platform to `stopId`, taken from the live
  feed. `label` is 3-4 characters. `fallbackMin` is your usual trip time, used (dimmed) when the
  feed has no or implausible data (`TRAVEL_OK` in `lib/mta.js`, 15-40 min by default; widen it
  if your trip is shorter or longer). Leave `target` out to hide the column.
- Lines 1-7, A C E, B D F M, G, J Z, L, N Q R W, the shuttles (GS, FS, H) and SI all work; the
  right MTA feed is picked automatically. The board fits about 4-6 rows.

**2. Citi Bike.** Find stations near you:

```bash
npm run find-station -- --zip                     # 10 nearest to config.weather lat/lon
npm run find-station -- "eastern pkwy"            # by name
npm run find-station -- --near 40.6741,-73.9580 15
```

Put the `short_name` (first column) into `citibike.bikes[]` (stations where you pick up a bike)
or `citibike.docks[]` (where you return one) as `"station"`, with a short `"label"` like
`"Bike 1"`. Two of each fit the board.

**3. Weather.** Set `weather.latitude` / `longitude` (any point near you; a ZIP code's center is
fine) and `label`. Temperatures are in °C.

**4. Night.** `display.night` (`{ "from": "01:00", "to": "08:00" }`) blanks the screen; remove it
to stay on all night.

**5. Your phone's screen.** Per device, in the URL you open once (remembered by that browser):
`?mask=camera` keeps an 8 % strip black on the front-camera side (for a cracked corner; a pixel
cat walks there), `?mask=left` / `?mask=right` fix the side, `?mask=none` turns it off. The cat's
camera-dodging is tuned for a Galaxy S21 (`HOLE` in `public/cat.js`).

## Phone setup

1. Phone: turn on Developer options and USB debugging. Get **Termux** and **Termux:Boot** from
   their GitHub releases (`termux/termux-app`, `termux/termux-boot`; not the Play Store).
   Open Termux:Boot once.
2. PC: `bash scripts/adb-setup.sh [apk files...]`. This installs any APKs you pass, keeps the
   screen on while charging, turns auto-rotate on, exempts the apps from battery optimisation,
   and copies the project to `/sdcard/Download/subway-board`.
3. Termux on the phone:
   ```bash
   termux-setup-storage
   cp -r ~/storage/downloads/subway-board ~/
   bash ~/subway-board/scripts/termux-setup.sh
   bash ~/subway-board/scripts/start.sh
   ```
4. In Chrome open `http://localhost:8080/?mask=camera` once, then menu → **Install app**.
   The "Subway" icon opens the board full screen, landscape only.

5. Optional, for a dashboard-only phone: `bash scripts/debloat.sh` disables ~125 preinstalled
   apps and services that sync, update, scan or upload (`bash scripts/debloat.sh enable` undoes
   it). Battery: Settings → Battery → Battery protection → Maximum; the S21 here also has the cap
   lowered to 60 % with `adb shell settings put global battery_protection_threshold 60`.

Once Termux:Boot is set up, the server starts automatically after a reboot
(`~/.termux/boot/subway-board.sh`); tap the Subway icon to bring the board back.

## Per-device URL settings (remembered by each browser)

| Parameter | Effect |
|---|---|
| `?mask=camera` | 8 % black strip on the front-camera side (cut-out included), follows rotation (the S21 has a broken corner there) |
| `?mask=left` / `?mask=right` | strip on a fixed side |
| `?mask=none` | no strip (default) |
| `?cat=top` / `?cat=bottom` / `?cat=off` | Siamese cat walking along the strip (feet on the screen edge) from this end to 80 % of the way, staying out of the 20 % by the S21's broken corner; default picks the end away from it. With `?mask=camera` it is a liquid and flows around the punch-hole camera |

With a strip on, the opposite edge keeps a thin 2.5 % black margin so the S21's rounded corners
(90 px radius) don't clip the board's corner dots.

**Night** (`display.night`, default 01:00-08:00): the screen is fully black; tap it to see the
board for 30 s. After an update the open board reloads itself within 30 s (the server reports a
code version in `/api/data`).

Every few minutes the whole panel shifts by up to half a dot (`display.pixelShiftMinutes`) to
spread OLED wear.

## Files

```
server.js            HTTP server: public/ + GET /api/data
config.json          stations, 42 St targets, Citi Bike stations, weather location, refresh
lib/mta.js           GTFS-RT fetch/decode, arrivals per route, travel time to 42 St
lib/citibike.js      GBFS fetch, station lookup (station_id / short_name / name)
lib/weather.js       Open-Meteo current (°C, humidity, icon) + today hi/lo + rain chance next 3 h
lib/mock.js          MOCK=1 fake feeds (encoded through the real protobuf path)
public/font.js       5x7 dot-matrix font
public/led.js        canvas LED matrix renderer
public/app.js        layout + polling (ES5, for old WebViews)
public/cat.js        Siamese pixel cat that walks along the masked strip
public/icon-*.png    app icons (scripts/make-icons.js)
scripts/             fetch-stops, find-stop, find-station, make-icons, termux-setup, start,
                     adb-setup, debloat
```

## License

MIT: use it, change it, share it. See [LICENSE](LICENSE).
