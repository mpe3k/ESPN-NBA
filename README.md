# ESPN NBA

A static NBA standings table and team detail pages built on data from the unofficial ESPN API.
No server or build step needed, just open the HTML file in a browser.

## Quick start

1. Open `standings.html` in a browser (main table).
2. Click a team name to open `team.html?team=<ABBREVIATION>` with that team's games.

The data is already in the repository (`schedules.js`). To refresh it:

```bash
python3 fetch_schedules.py
```

The script uses only the Python 3 standard library (no `pip install`). It downloads the
schedules of all 30 teams and the predictions for unplayed games (about 1,000 requests,
roughly 1-2 minutes) and overwrites `schedules.js`. Do not edit that file by hand.

## Files

| File | Purpose |
|---|---|
| `fetch_schedules.py` | Downloads schedules and predictions from ESPN and generates `schedules.js` |
| `schedules.js` | Generated data (`const nbaSchedules = {...}`) |
| `stats.js` | Shared logic: Value, ELO, records, streak, sorting |
| `standings.html`, `standings.js` | Main sortable team table |
| `team.html`, `team.js` | Team detail: all games ordered by date in one table |

## Main table columns

Click a column header to sort; click again to reverse the direction. The interface
labels are in Slovak; the English meaning is given below.

| Column | Meaning |
|---|---|
| V / P | Wins / losses |
| Úspešnosť | Win percentage |
| Body / zápas, Obdržané / zápas, Diff | Average points scored and allowed per game, and their difference |
| Value | Sum of points for wins (see below) |
| ELO | Team rating (see below) |
| Home / Road | Win percentage in home games / away games |
| Posl. 10 | Record in the last 10 played games (`wins-losses`) |
| Séria | Current streak of wins (`W3`) or losses (`L2`) |

### Value

Games are processed chronologically by date. The winner receives the
**opponent's number of wins at the time of the game + 1**, the loser receives 0.
The first game of the season therefore always gives its winner 1 point. The stronger
the opponent a team beats, the more points it earns.

### ELO

- Every team starts at **1500**, with **K = 40**.
- Expected win probability: `1 / (1 + 10^((opponent ELO - own ELO) / 400))`.
- The winner gains `K * (1 - expected probability)`, the loser loses the same amount.
- Computed game by game in chronological order, each game counted once.

## Team detail

One table with all games ordered by date:

- **Played games:** result (W/L), score, Value earned in the game, and ELO after the game
  with its change, for example `1520 (+20.0)`.
- **Unplayed games:** the Score column shows the team's win chance according to the ESPN
  Matchup Predictor (BPI), for example `74.3 %`. The cell is shaded green (chance of 50 %
  or more) or red (below 50 %). The further the chance is from 50 %, the stronger the shade.

The prediction is a snapshot from the last run of `fetch_schedules.py`. ESPN keeps
recalculating it, so refresh the data if you want it up to date.

## Data source

The data comes from unofficial ESPN endpoints, which ESPN does not document and may
change at any time:

- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams`
- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{id}/schedule`
- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={gameId}`
  (the `predictor` key)

This project is not affiliated with ESPN or the NBA and is intended for personal use.
