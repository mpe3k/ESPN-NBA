// Spolocna logika: statistiky timov z nbaSchedules (schedules.js).

const ELO_START = 1500;
const ELO_K = 40;

function playedGames(team) {
  return team.games
    .filter((g) => g.completed && g.result !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Kazdy zapas je v rozvrhu oboch timov - vrati ho jedenkrat, chronologicky.
function uniqueGames(teams) {
  const seen = new Set();
  const games = [];
  for (const [, team] of teams) {
    for (const g of playedGames(team)) {
      if (seen.has(g.gameId)) continue;
      seen.add(g.gameId);
      const won = g.result === "W";
      games.push({
        gameId: g.gameId,
        date: g.date,
        winnerId: won ? team.id : g.opponent.id,
        loserId: won ? g.opponent.id : team.id,
      });
    }
  }
  return games.sort(
    (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId)
  );
}

// Kluc pre statistiky konkretneho timu v konkretnom zapase.
function gameKey(teamId, gameId) {
  return teamId + ":" + gameId;
}

function computeStandings(schedules) {
  const teams = Object.entries(schedules.teams);

  const winsById = {};
  const eloById = {};
  const valueById = {};
  const keyById = {};
  for (const [key, team] of teams) {
    winsById[team.id] = 0;
    eloById[team.id] = ELO_START;
    valueById[team.id] = 0;
    keyById[team.id] = key;
  }

  // Zapasy podla datumu. Value: vitaz dostane (aktualne vyhry supera + 1),
  // porazeny 0. ELO: K = 40, ocakavany vysledok podla ratingu supera.
  const gameStats = {};
  for (const g of uniqueGames(teams)) {
    const w = g.winnerId;
    const l = g.loserId;

    const value = winsById[l] + 1;
    valueById[w] += value;

    const eloW = eloById[w];
    const eloL = eloById[l];
    const expectedW = 1 / (1 + Math.pow(10, (eloL - eloW) / 400));
    const delta = ELO_K * (1 - expectedW);
    eloById[w] = eloW + delta;
    eloById[l] = eloL - delta;
    winsById[w]++;

    gameStats[gameKey(w, g.gameId)] = { value, eloDelta: delta, eloAfter: eloById[w] };
    gameStats[gameKey(l, g.gameId)] = { value: 0, eloDelta: -delta, eloAfter: eloById[l] };
  }

  const rows = teams.map(([key, team]) => {
    const played = playedGames(team);
    const gp = played.length;
    const wins = winsById[team.id];

    let pointsFor = 0;
    let pointsAgainst = 0;
    for (const g of played) {
      pointsFor += g.teamScore;
      pointsAgainst += g.opponentScore;
    }

    // Streak: kladne = vyhry v rade, zaporne = prehry v rade.
    let streak = 0;
    if (gp > 0) {
      const last = played[gp - 1].result;
      let n = 0;
      for (let i = gp - 1; i >= 0 && played[i].result === last; i--) n++;
      streak = last === "W" ? n : -n;
    }

    // Uspesnost doma / vonku.
    const homeGames = played.filter((g) => g.homeAway === "home");
    const roadGames = played.filter((g) => g.homeAway === "away");
    const homeWins = homeGames.filter((g) => g.result === "W").length;
    const roadWins = roadGames.filter((g) => g.result === "W").length;

    // Poslednych 10 odohranych zapasov: pocet vyhier (a pocet zapasov).
    const last10Games = played.slice(-10);
    const last10Wins = last10Games.filter((g) => g.result === "W").length;

    const ppg = gp ? pointsFor / gp : 0;
    const oppg = gp ? pointsAgainst / gp : 0;

    return {
      key,
      team: team.name,
      wins,
      losses: gp - wins,
      pct: gp ? wins / gp : 0,
      ppg,
      oppg,
      diff: ppg - oppg,
      value: valueById[team.id],
      elo: eloById[team.id],
      homePct: homeGames.length ? homeWins / homeGames.length : 0,
      homeGames: homeGames.length,
      roadPct: roadGames.length ? roadWins / roadGames.length : 0,
      roadGames: roadGames.length,
      last10: last10Wins,
      last10Games: last10Games.length,
      streak,
    };
  });

  return { rows, winsById, keyById, gameStats };
}

// Zoradenie: vybrany stlpec, potom % uspesnosti, potom diff, potom nazov.
function sortRows(rows, key, dir) {
  const sign = dir === "asc" ? 1 : -1;
  const cmp = (a, b, k) =>
    typeof a[k] === "string" ? a[k].localeCompare(b[k]) : a[k] - b[k];
  return [...rows].sort(
    (a, b) =>
      cmp(a, b, key) * sign ||
      b.pct - a.pct ||
      b.diff - a.diff ||
      a.team.localeCompare(b.team)
  );
}

if (typeof module !== "undefined") {
  module.exports = { computeStandings, sortRows, gameKey, playedGames };
}
