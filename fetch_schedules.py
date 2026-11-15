#!/usr/bin/env python3
"""Stiahne schedule vsetkych 30 NBA timov z ESPN API a ulozi ho do schedules.js."""

import json
import logging
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
OUTPUT = Path(__file__).parent / "schedules.js"
TIMEOUT = 20
RETRIES = 3
PREDICTOR_WORKERS = 8

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("espn")


def get_json(url):
    for attempt in range(1, RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                return json.load(resp)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            log.warning("Pokus %d/%d zlyhal pre %s: %s", attempt, RETRIES, url, exc)
            time.sleep(2 * attempt)
    raise RuntimeError(f"Nepodarilo sa stiahnut {url}")


def parse_competitor(c):
    team = c["team"]
    score = c.get("score")
    return {
        "id": team["id"],
        "abbreviation": team["abbreviation"],
        "name": team["displayName"],
        "homeAway": c["homeAway"],
        "score": int(float(score["value"])) if score else None,
        "winner": c.get("winner"),
        "record": next(
            (r["displayValue"] for r in c.get("record", []) if r.get("type") == "total"),
            None,
        ),
    }


def parse_event(event, team_id):
    comp = event["competitions"][0]
    status = comp["status"]["type"]
    competitors = [parse_competitor(c) for c in comp["competitors"]]
    home = next(c for c in competitors if c["homeAway"] == "home")
    away = next(c for c in competitors if c["homeAway"] == "away")
    me = next(c for c in competitors if c["id"] == team_id)
    opp = away if me is home else home

    if status["completed"]:
        result = "W" if me["winner"] else "L"
    else:
        result = None

    venue = comp.get("venue", {})
    address = venue.get("address", {})
    link = next(
        (l["href"] for l in event.get("links", []) if "summary" in l.get("rel", []) and "desktop" in l["rel"]),
        None,
    )
    return {
        "gameId": event["id"],
        "date": event["date"],
        "name": event["name"],
        "shortName": event["shortName"],
        "seasonType": event["seasonType"]["name"],
        "status": status["description"],
        "completed": status["completed"],
        "statusDetail": status["detail"],
        "homeAway": me["homeAway"],
        "opponent": {k: opp[k] for k in ("id", "abbreviation", "name")},
        "result": result,
        "teamScore": me["score"],
        "opponentScore": opp["score"],
        "home": home,
        "away": away,
        "neutralSite": comp.get("neutralSite"),
        "attendance": comp.get("attendance") or None,
        "venue": {
            "name": venue.get("fullName"),
            "city": address.get("city"),
            "state": address.get("state"),
        },
        "broadcasts": sorted(
            {b["media"]["shortName"] for b in comp.get("broadcasts", [])}
        ),
        "link": link,
    }


def fetch_predictor(game_id):
    """ESPN Matchup Predictor (BPI): sanca na vyhru domaceho/hostujuceho timu v %.

    Vrati None, ak ESPN predikciu pre zapas nema.
    """
    try:
        data = get_json(f"{BASE}/summary?event={game_id}")
    except RuntimeError:
        log.warning("Predikcia pre zapas %s sa nenasla", game_id)
        return None
    predictor = data.get("predictor")
    if not predictor:
        return None
    try:
        return {
            "home": float(predictor["homeTeam"]["gameProjection"]),
            "away": float(predictor["awayTeam"]["gameProjection"]),
        }
    except (KeyError, TypeError, ValueError):
        return None


def add_predictions(result):
    """Doplni 'predictor' ku vsetkym neodohranym zapasom (kazdy zapas raz)."""
    upcoming = {
        g["gameId"] for t in result.values() for g in t["games"] if not g["completed"]
    }
    log.info("Stahujem predikcie pre %d neodohranych zapasov", len(upcoming))
    with ThreadPoolExecutor(max_workers=PREDICTOR_WORKERS) as pool:
        ids = sorted(upcoming)
        predictions = dict(zip(ids, pool.map(fetch_predictor, ids)))
    found = sum(1 for p in predictions.values() if p)
    for t in result.values():
        for g in t["games"]:
            g["predictor"] = None if g["completed"] else predictions.get(g["gameId"])
    log.info("Predikcia dostupna pre %d z %d zapasov", found, len(upcoming))


def main():
    teams = get_json(f"{BASE}/teams?limit=50")["sports"][0]["leagues"][0]["teams"]
    teams = [t["team"] for t in teams]
    log.info("Najdenych timov: %d", len(teams))
    if len(teams) != 30:
        raise RuntimeError(f"Ocakavanych 30 timov, najdenych {len(teams)}")

    result = {}
    season = None
    for team in sorted(teams, key=lambda t: t["displayName"]):
        data = get_json(f"{BASE}/teams/{team['id']}/schedule")
        season = data["season"]["displayName"]
        games = [parse_event(e, team["id"]) for e in data["events"]]
        games.sort(key=lambda g: g["date"])
        result[team["abbreviation"]] = {
            "id": team["id"],
            "name": team["displayName"],
            "abbreviation": team["abbreviation"],
            "slug": team["slug"],
            "url": f"https://www.espn.com/nba/team/schedule/_/name/{team['abbreviation'].lower()}/{team['slug']}",
            "record": data["team"].get("recordSummary"),
            "standing": data["team"].get("standingSummary"),
            "games": games,
        }
        log.info("%-4s %-26s %d zapasov", team["abbreviation"], team["displayName"], len(games))

    add_predictions(result)

    payload = {
        "season": season,
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "ESPN",
        "teams": result,
    }
    js = (
        "// Vygenerovane skriptom fetch_schedules.py - needitovat rucne.\n"
        f"const nbaSchedules = {json.dumps(payload, indent=2, ensure_ascii=False)};\n\n"
        'if (typeof module !== "undefined") module.exports = nbaSchedules;\n'
    )
    OUTPUT.write_text(js, encoding="utf-8")
    log.info("Ulozene do %s (%d timov)", OUTPUT, len(result))


if __name__ == "__main__":
    main()
