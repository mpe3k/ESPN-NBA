// Vykreslenie sortovatelnej NBA tabulky. Vyzaduje schedules.js a stats.js.

const COLUMNS = [
  { key: "team", label: "Tím", numeric: false },
  { key: "wins", label: "V", numeric: true, format: (r) => String(r.wins) },
  { key: "losses", label: "P", numeric: true, format: (r) => String(r.losses) },
  { key: "pct", label: "Úspešnosť", numeric: true, format: (r) => (r.pct * 100).toFixed(1) + " %" },
  { key: "ppg", label: "Body / zápas", numeric: true, format: (r) => r.ppg.toFixed(1) },
  { key: "oppg", label: "Obdržané / zápas", numeric: true, format: (r) => r.oppg.toFixed(1) },
  {
    key: "diff",
    label: "Diff",
    numeric: true,
    format: (r) => (r.diff > 0 ? "+" : "") + r.diff.toFixed(1),
    tone: (r) => r.diff,
  },
  { key: "value", label: "Value", numeric: true, format: (r) => String(r.value) },
  { key: "elo", label: "ELO", numeric: true, format: (r) => r.elo.toFixed(0) },
  {
    key: "homePct",
    label: "Home",
    numeric: true,
    format: (r) => (r.homeGames ? (r.homePct * 100).toFixed(1) + " %" : "–"),
  },
  {
    key: "roadPct",
    label: "Road",
    numeric: true,
    format: (r) => (r.roadGames ? (r.roadPct * 100).toFixed(1) + " %" : "–"),
  },
  {
    key: "last10",
    label: "Posl. 10",
    numeric: true,
    format: (r) => `${r.last10}-${r.last10Games - r.last10}`,
  },
  {
    key: "streak",
    label: "Séria",
    numeric: true,
    format: (r) => (r.streak === 0 ? "–" : (r.streak > 0 ? "W" : "L") + Math.abs(r.streak)),
    tone: (r) => r.streak,
  },
];

function renderStandings(schedules, root) {
  const { rows } = computeStandings(schedules);
  const state = { key: "pct", dir: "desc" };

  const table = document.createElement("table");
  const headRow = table.createTHead().insertRow();
  const tbody = table.createTBody();

  const rankTh = document.createElement("th");
  rankTh.scope = "col";
  rankTh.textContent = "#";
  headRow.appendChild(rankTh);

  const headers = COLUMNS.map((col) => {
    const th = document.createElement("th");
    th.scope = "col";
    if (col.numeric) th.className = "num";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = col.label;
    btn.addEventListener("click", () => {
      if (state.key === col.key) {
        state.dir = state.dir === "desc" ? "asc" : "desc";
      } else {
        state.key = col.key;
        state.dir = col.numeric ? "desc" : "asc";
      }
      draw();
    });
    th.appendChild(btn);
    headRow.appendChild(th);
    return th;
  });

  function draw() {
    headers.forEach((th, i) => {
      const active = COLUMNS[i].key === state.key;
      th.setAttribute(
        "aria-sort",
        active ? (state.dir === "asc" ? "ascending" : "descending") : "none"
      );
      th.dataset.arrow = active ? (state.dir === "asc" ? "▲" : "▼") : "";
    });

    tbody.replaceChildren();
    sortRows(rows, state.key, state.dir).forEach((row, i) => {
      const tr = tbody.insertRow();
      tr.insertCell().textContent = String(i + 1);
      COLUMNS.forEach((col) => {
        const td = tr.insertCell();
        if (col.key === "team") {
          const a = document.createElement("a");
          a.href = "team.html?team=" + encodeURIComponent(row.key);
          a.textContent = row.team;
          td.appendChild(a);
          return;
        }
        td.className = "num";
        td.textContent = col.format(row);
        if (col.tone && col.tone(row) !== 0) {
          td.classList.add(col.tone(row) > 0 ? "win" : "loss");
        }
      });
    });
  }

  root.replaceChildren(table);
  draw();
}

renderStandings(nbaSchedules, document.getElementById("standings"));
document.getElementById("info").textContent =
  `Sezóna ${nbaSchedules.season} · dáta z ${nbaSchedules.fetchedAt} · zdroj ${nbaSchedules.source}`;
