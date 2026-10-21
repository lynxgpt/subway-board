# Layout (phone, landscape)

The page draws a simulated LED dot matrix. The panel is 102 dots tall, and its width follows
the screen's aspect ratio (≈220 dots on a 19.5:9 phone). The font is 5×7 dots. Each dot is a
lit or unlit LED circle with a slight glow.

```
y=0   ┌──────────────────────────────────────────────────────────────────────┐
      │ 12:17 Wed Oct 21                    58° Cloudy 63/51  ☂20%          │  header (9)
y=11  │ (2) Franklin  1,10,19                                   42St 28m     │
      │ (3) Franklin  2,13,24                                   42St 28m     │
      │ (4) Franklin  3,10,17                                    GCT 23m     │  subway: 6 rows × 12
      │ (5) Franklin  4,14,24                                    GCT 23m     │
      │ (B) 7 Av      2,14,26                                   42St 23m     │
      │ (Q) 7 Av      2,10,18                                   42St 26m     │
y=84  │ Bikes  <station 1>        7 e2   <station 2>             0          │  citi bike (9)
      │ Docks  <station 3>          12   <station 4>             1          │  citi bike (9)
      └──────────────────────────────────────────────────────────────────────┘
```

## Two subway styles (tap the screen to switch)

| Style | Row | Based on |
|---|---|---|
| `list` (default) | bullet · station (green) · next 3 departures in minutes (white) · travel time to 42 St (amber) | "Downtown 7,18,30" clock |
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
| Temperature | amber |
| Rain chance | cyan |
| Bike / dock counts | white, amber when ≤ 2, red when 0, e-bikes yellow `eN` |
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
