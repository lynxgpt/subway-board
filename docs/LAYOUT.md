# Layout (phone, landscape)

The page draws a simulated LED dot matrix. The panel is 102 dots tall, and its width follows
the screen's aspect ratio (≈210 dots on the S21 with the 8 % camera-side strip). The font is 5×7 dots. Each dot is a
lit or unlit LED circle with a slight glow.

```
      ┌───────────────────────────────────────────────────────────────────┐
      │ Thu Oct 22               ☀ 19°  Clear 20/7  ♦29%  ☂0%             │  header (9)
      │                                                                   │
      │ (2)(3) Franklin  0,4,8,8,14,17                          TSQ 31m   │
      │ (4)(5) Franklin  1,4,8,13,15,18                         GCT 27m   │  subway: 4 rows x 16
      │ (B)    7 Av      0,8,8,20                              42nd  5m   │
      │ (Q)    7 Av      0,3,12,22                              TSQ 23m   │
y=79  │ ███ ███ ███ ███   Bike 1    5  Bike 2    4                        │  24 h clock at 3x (21),
      │ ███ ███ ███ ███   Dock 1    9  Dock 2   16                        │  colon blinks
      └───────────────────────────────────────────────────────────────────┘
```

Routes listed together in `config.json` → `subway[].rows` share a row: both bullets are shown
and their departures are merged in time order. The header drops the condition word, then hi/lo,
then humidity when the screen is too narrow. Panels narrower than 196 dots (e.g. a 4:3 iPad)
are letterboxed instead of squeezed.

## Rows

One row per `config.json` → `subway[].rows` entry: bullet(s) · station (green) · departures in
minutes (white, dimmed when too soon to catch) · travel time to 42 St (amber).

## Colours

| Element | Colour |
|---|---|
| Route bullets | Official MTA colours, with a white letter (black on N/Q/R/W) |
| Station label (list) | green `#22D35A` |
| Minutes | white `#F2ECFF`; half brightness when under `show.dimUnderMin` |
| Travel time to 42 St | amber `#FFB000` |
| Weather icon | sun/moon/partly/cloud/rain/snow/fog/storm, 11×9 multicolour sprite |
| Temperature (°C) | amber |
| Hi/lo, humidity (♦) | grey |
| Rain chance next 3 h (☂) | cyan |
| Bike / dock counts | white, amber when ≤ 2, red when 0 (bike count includes e-bikes) |
| Data error or stale data (>3 min) | red `!` at top right |

## Travel time to 42 St

| Line | From | To (stop ID) |
|---|---|---|
| 2, 3 | Franklin Av `239N` | Times Sq–42 St `127N` |
| 4, 5 | Franklin Av `239N` | Grand Central–42 St `631N` |
| B | 7 Av `D25N` | 42 St–Bryant Pk `D16N` |
| Q | 7 Av `D25N` | Times Sq–42 St `R16N` |

The live value is the train's predicted arrival at the 42 St stop minus its arrival at your
stop, both taken from the same realtime trip. If the trip doesn't list the 42 St stop, or the
prediction is outside 60-180 % of `fallbackMin` (the MTA feed sometimes has every stop to
42 St within two minutes), the board shows `fallbackMin` from `config.json` in dimmer amber.
Labels (TSQ / GCT / 42nd) are left-aligned in one column, minutes right-aligned at the edge.
