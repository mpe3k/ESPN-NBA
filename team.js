// Team detail: played and upcoming games. Requires schedules.js and stats.js.

const params = new URLSearchParams(location.search);
const key = params.get("team");
const team = key && Object.prototype.hasOwnProperty.call(nbaSchedules.teams, key)
  ? nbaSchedules.teams[key]
  : null;

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function cell(tr, text, className) {
  const td = tr.insertCell();
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

// Color by win chance: 50 % and above green, below 50 % red; the further the
// probability is from 50 %, the stronger the shade.
function predictionColor(pct) {
  const strength = Math.min(Math.abs(pct - 50) / 50, 1);
  const alpha = (0.08 + 0.62 * strength).toFixed(2);
  return pct >= 50 ? `rgba(26, 127, 55, ${alpha})` : `rgba(207, 34, 46, ${alpha})`;
}

function gamesTable(games, columns, rowFn) {
  const table = document.createElement("table");
  const head = table.createTHead().insertRow();
  columns.forEach((c) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = c.label;
    if (c.num) th.className = "num";
    head.appendChild(th);
  });
  const tbody = table.createTBody();
  games.forEach((g) => rowFn(tbody.insertRow(), g));
  return table;
}

function render() {
  const root = document.getElementById("team");
  if (!team) {
    root.textContent = "Team not found.";
    return;
  }

  const { rows, keyById, gameStats } = computeStandings(nbaSchedules);
  const stats = rows.find((r) => r.key === key);
  document.title = team.name + " – schedule";
  document.getElementById("title").textContent = team.name;
  document.getElementById("summary").textContent =
    `${stats.wins}-${stats.losses} · ${(stats.pct * 100).toFixed(1)} % · ` +
    `${stats.ppg.toFixed(1)} : ${stats.oppg.toFixed(1)} (diff ${stats.diff > 0 ? "+" : ""}${stats.diff.toFixed(1)}) · ` +
    `Value ${stats.value} · ELO ${stats.elo.toFixed(0)}`;

  const sorted = [...team.games].sort((a, b) => a.date.localeCompare(b.date));

  const opponentCell = (tr, g) => {
    const td = tr.insertCell();
    const prefix = g.homeAway === "home" ? "vs " : "@ ";
    const oppKey = keyById[g.opponent.id];
    if (oppKey) {
      td.append(prefix);
      const a = document.createElement("a");
      a.href = "team.html?team=" + encodeURIComponent(oppKey);
      a.textContent = g.opponent.name;
      td.appendChild(a);
    } else {
      td.textContent = prefix + g.opponent.name;
    }
  };

  // One table: played and upcoming games ordered by date.
  const gamesTableEl = gamesTable(
    sorted,
    [
      { label: "DATE" },
      { label: "OPPONENT" },
      { label: "RESULT" },
      { label: "SCORE", num: true },
      { label: "VALUE", num: true },
      { label: "ELO", num: true },
    ],
    (tr, g) => {
      cell(tr, dateFmt.format(new Date(g.date)));
      opponentCell(tr, g);
      const gs = g.completed ? gameStats[gameKey(team.id, g.gameId)] : null;
      if (!gs) {
        cell(tr, "");
        // Unplayed game: the SCORE column shows the team's win chance from the
        // ESPN Matchup Predictor, shaded green (win) / red (loss).
        const p = g.predictor;
        const score = cell(tr, p ? `${p[g.homeAway].toFixed(1)} %` : "", "num");
        if (p) score.style.backgroundColor = predictionColor(p[g.homeAway]);
        cell(tr, "", "num");
        cell(tr, "", "num");
        return;
      }
      cell(tr, g.result, g.result === "W" ? "win" : "loss");
      cell(tr, `${g.teamScore}:${g.opponentScore}`, "num");
      cell(tr, String(gs.value), "num");
      cell(
        tr,
        `${gs.eloAfter.toFixed(0)} (${gs.eloDelta > 0 ? "+" : ""}${gs.eloDelta.toFixed(1)})`,
        "num"
      );
    }
  );

  root.replaceChildren(gamesTableEl);
}

render();
