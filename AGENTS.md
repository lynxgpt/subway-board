# AGENTS.md — rules for any agent working on subway-board

Read this before changing anything. Everything below is a decision the owner made after trying
alternatives on the real device. **Do not change any of it unless the owner explicitly asks for
that specific change.** If a request seems to conflict with a rule here, ask the owner first.
The README is for the public; this file is for you.

## What this is

An LED-dot-matrix NYC subway / Citi Bike / weather board. Runtime is **only** a Galaxy S21:
Node server in Termux (`~/subway-board`, started by Termux:Boot via `scripts/start.sh`), shown by
the Chrome home-screen app "Subway". The Mac is for editing only — never run the server or
install anything there without asking the owner.

## Layout — frozen (panel is 102 dots tall, see `public/app.js`)

1. **Header row:** date (left), weather (right): pixel icon, °C (Celsius only), condition, hi/lo,
   humidity (♦) **and** rain chance next 3 h (☂). Both humidity and rain always show.
2. **Exactly four subway rows, fixed size and position:** 2/3 merged (Franklin), 4/5 merged
   (Franklin), B (7 Av), Q (7 Av). Rows are 16 dots tall; do not move or resize them. No second
   "style", no tap-to-switch.
3. **Departures:** every train in the next `show.withinMin`, but at least `show.minTrains`
   (2/3, 4/5: 15 min / 6; B, Q: 25 min / 4). Trains under `show.dimUnderMin` (5 / 10 min) are
   drawn at half brightness. Never cut a number in half; drop whole numbers instead.
4. **Travel column:** labels TSQ / GCT / 42nd left-aligned in one column; minutes right-aligned at
   the edge, always two digits. A live value under 15 or over 40 min is wrong → show
   `fallbackMin` in dim amber (`TRAVEL_OK` in `lib/mta.js`).
5. **Bottom:** big 24 h clock at 3× (bottom left, colon blinks every second). To its right two
   lines `Bike 1   nn Bike 2   nn` / `Dock 1   nn Dock 2   nn`: words, station numbers and counts
   each in their own aligned column. Bike count already includes e-bikes; never show e-bikes
   separately.

## Screen and device — frozen

- The S21 has a **broken corner on the front-camera side.** `?mask=camera` keeps an 8% strip
  black on the camera side (including the camera cut-out area), following rotation. Nothing but
  the cat may be drawn there.
- The opposite edge keeps a **2.5% margin** because of the 90 px rounded corners.
- **The cat:** a Siamese pixel cat walks the strip with its feet on the outer edge, from the safe
  end to 80% of the length (never in the 20% by the crack), and is liquid: it flows around the
  punch-hole camera (60×80 px, `HOLE` in `public/cat.js`). Keep it.
- **OLED care:** dark background, pixel shift every few minutes, full blackout 01:00–08:00
  (tap shows the board for 30 s). Don't add large static bright areas.
- **Battery:** protection on, cap 60%, fast charging off. Don't change.
- **Debloat:** `scripts/debloat.sh` is the list. Never disable `com.sec.android.diagmonagent`
  (it crash-loops) or anything the board needs (Chrome, WebView, Termux, launcher, Device Care).

## Code rules

- `public/` is **ES5, no build step, no frameworks**: it must run in old WebViews.
- Data sources must stay **keyless**: MTA GTFS-RT, Citi Bike GBFS, Open-Meteo.
- Everything personal goes in `config.json`; code stays generic.
- An open board reloads itself when `/api/data` reports a new `version` (any change in `public/`
  or `config.json`), so nobody has to touch the phone after a deploy.

## Workflow

1. Edit on the Mac, copy to the phone (`~/subway-board`, without `node_modules` and `data/`),
   restart with `bash scripts/start.sh`.
2. **Verify on the device before saying it's done:** screenshot the phone
   (`adb exec-out screencap -p`) and look at it. A blank board means a JavaScript error.
3. Commit with `git config user.email` = `277584562+lynxgpt@users.noreply.github.com`. **Never
   put any personal email in a commit or file**; check `git log --format='%ae %ce'` before
   pushing. The owner leaves GitHub to you: push when asked.
4. Keep the README (public guide) and `docs/LAYOUT.md` in sync with what you change.

## Owner preferences

Short answers. Do the work instead of listing options; ask only when the choice is genuinely
the owner's. Never claim something works without checking it on the device.
