# subway-board

An LED-matrix-style NYC subway, Citi Bike and weather board for an old Android phone.
A Node server runs in **Termux** on the phone, and a kiosk browser shows `http://localhost:8080`.
Other devices on the same Wi-Fi can open `http://<phone-ip>:8080`.

![list style](docs/screenshots/style-list.png)
![next style](docs/screenshots/style-next.png)

The screenshots use mock data. See [docs/LAYOUT.md](docs/LAYOUT.md) for the layout.

## Data sources (no API keys)

| Data | Source | Refresh |
|---|---|---|
| Subway | MTA GTFS-Realtime: `nyct/gtfs` (2/3/4/5), `gtfs-bdfm` (B), `gtfs-nqrw` (Q) | 60 s |
| Citi Bike | GBFS `station_information` / `station_status` (`gbfs.lyft.com/.../bkn`, then `gbfs.citibikenyc.com`) | 60 s |
| Weather | Open-Meteo, ZIP 11238 (40.6797, -73.9641) | 10 min |
| Stop names | MTA static GTFS `stops.txt` → `data/stops.json` (`npm run fetch-stops`) | once |

Configured stations: Franklin Av `239N` (2 3 4 5) and 7 Av `D25N` (B Q), Manhattan-bound only.

## Run on a PC (development)

```bash
npm install
npm run mock         # fake data, no network needed
npm run fetch-stops  # destination names
npm start            # live data
```

Open http://localhost:8080. Tap the screen to switch between the `list` and `next` styles.

## Citi Bike stations (still to fill in)

```bash
npm run find-station -- --zip               # 10 nearest to ZIP 11238
npm run find-station -- "eastern pkwy"      # name search
npm run find-station -- --near 40.6741,-73.9580 15
```

Put the `short_name` (first column) into `config.json` → `citibike.bikes[]` / `citibike.docks[]`
→ `"station"`, and a short `"label"` (about 10 characters) for the screen.

## Phone setup

1. Phone: turn on Developer options and USB debugging. Install **Termux** and **Termux:Boot**
   from F-Droid or GitHub (not the Play Store), plus **Fully Kiosk Browser** (or use Chrome).
   Open Termux:Boot once.
2. PC: `bash scripts/adb-setup.sh [apk files...]`. This installs any APKs you pass, keeps the
   screen on while charging, locks landscape, exempts the apps from battery optimisation, and
   copies the project to `/sdcard/Download/subway-board`.
3. Termux on the phone:
   ```bash
   termux-setup-storage
   cp -r ~/storage/downloads/subway-board ~/
   bash ~/subway-board/scripts/termux-setup.sh
   bash ~/subway-board/scripts/start.sh
   ```
4. Point Fully Kiosk's start URL at `http://localhost:8080`, or in Chrome open it and use
   **Add to Home screen** (it runs full screen, landscape).

Once Termux:Boot is set up, the server starts automatically after a reboot
(`~/.termux/boot/subway-board.sh`).

## Files

```
server.js            HTTP server: public/ + GET /api/data
config.json          stations, 42 St targets, Citi Bike stations, weather location, refresh
lib/mta.js           GTFS-RT fetch/decode, arrivals per route, travel time to 42 St
lib/citibike.js      GBFS fetch, station lookup (station_id / short_name / name)
lib/weather.js       Open-Meteo current + today hi/lo + rain chance in the next 3 h
lib/mock.js          MOCK=1 fake feeds (encoded through the real protobuf path)
public/font.js       5x7 dot-matrix font
public/led.js        canvas LED matrix renderer
public/app.js        layout + polling (ES5, for old WebViews)
scripts/             fetch-stops, find-station, termux-setup, start, adb-setup
```
