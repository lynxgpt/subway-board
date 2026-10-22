# Layout (phone, landscape)

The page draws a simulated LED dot matrix. The panel is 102 dots tall, and its width follows
the screen's aspect ratio (≈205 dots on the S21 with the 10 % camera-side strip). The font is 5×7 dots. Each dot is a
lit or unlit LED circle with a slight glow.

```
      ┌───────────────────────────────────────────────────────────────────┐
      │ 3:22 Thu Oct 22          ☀ 20°  20/7  ♦26%  ☂0%                   │  header (9)
      │                                                                   │
      │ (2)(3) Franklin  2,5,5                                 42St 31m   │
      │ (4)(5) Franklin  1,2,5                                  GCT 27m   │  subway: config rows,
      │ (B)    7 Av      3,17,22                               42St 24m   │  spread over 72 dots
      │ (Q)    7 Av      0,3,7                                 42St 23m   │
y=84  │ Bikes  Bike 1               3   Bike 2                   0        │  citi bike (9)
      │ Docks  Dock 1               7   Dock 2                  17        │  citi bike (9)
      └───────────────────────────────────────────────────────────────────┘
```

Routes listed together in `config.json` → `subway[].rows` share a row: both bullets are shown
and their departures are merged in time order. The header drops the condition word, then hi/lo,
then humidity when the screen is too narrow. Panels narrower than 196 dots (e.g. a 4:3 iPad)
are letterboxed instead of squeezed.

## Two subway styles (tap the screen to switch)

| Style | Row | Based on |
|---|---|---|
| `list` (default) | bullet(s) · station (green) · next 3 departures in minutes (white) · travel time to 42 St (amber) | "Downtown 7,18,30" clock |
| `next` | bullet · destination (blue) · `N min` (white) · travel time to 42 St (amber) | "8 Av / Forest Hills 11 min" clock |

You can also choose the style with a URL parameter: `?style=list` or `?style=next`.

## Colours

| Element | Colour |
|---|---|
| Route bullets | Official MTA colours, with a white letter (black on N/Q/R/W) |
| Station label (list) | green `#22D35A` |
| Destination (next) | blue `#3A4DFF` |
| Minutes | white `#F2ECFF` |
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
stop, both taken from the same realtime trip. If the trip doesn't list the 42 St stop, the
board shows `~` plus `fallbackMin` from `config.json`.
