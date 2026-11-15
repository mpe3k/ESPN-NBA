# ESPN NBA

Statická NBA tabuľka a detail tímov postavené na dátach z neoficiálneho ESPN API.
Nepotrebuje server ani build, stačí otvoriť HTML súbor v prehliadači.

## Rýchly štart

1. Otvorte `standings.html` v prehliadači (hlavná tabuľka).
2. Kliknutím na názov tímu sa otvorí `team.html?team=<SKRATKA>` s jeho zápasmi.

Dáta sú už v repozitári (`schedules.js`). Aktualizujete ich takto:

```bash
python3 fetch_schedules.py
```

Skript používa len štandardnú knižnicu Pythonu 3 (žiadne `pip install`). Stiahne
rozvrhy všetkých 30 tímov a predikcie pre neodohrané zápasy (asi 1 000 volaní,
trvá približne 1 – 2 minúty) a prepíše `schedules.js`. Tento súbor sa needituje ručne.

## Súbory

| Súbor | Účel |
|---|---|
| `fetch_schedules.py` | Stiahne rozvrhy a predikcie z ESPN a vygeneruje `schedules.js` |
| `schedules.js` | Vygenerované dáta (`const nbaSchedules = {...}`) |
| `stats.js` | Spoločná logika: Value, ELO, bilancia, séria, zoraďovanie |
| `standings.html`, `standings.js` | Hlavná zoraditeľná tabuľka tímov |
| `team.html`, `team.js` | Detail tímu: všetky zápasy podľa dátumu v jednej tabuľke |

## Stĺpce hlavnej tabuľky

Kliknutím na hlavičku sa tabuľka zoradí (opätovným kliknutím sa zmení smer).

| Stĺpec | Význam |
|---|---|
| V / P | Výhry / prehry |
| Úspešnosť | Percento výhier |
| Body / zápas, Obdržané / zápas, Diff | Priemer strelených a inkasovaných bodov a ich rozdiel |
| Value | Súčet bodov za výhry (viď nižšie) |
| ELO | Rating tímu (viď nižšie) |
| Home / Road | Úspešnosť v domácich zápasoch / v zápasoch vonku |
| Posl. 10 | Bilancia posledných 10 odohraných zápasov (`výhry-prehry`) |
| Séria | Aktuálna séria výhier (`W3`) alebo prehier (`L2`) |

### Value

Zápasy sa prechádzajú chronologicky podľa dátumu. Víťaz dostane
**počet výhier súpera v čase zápasu + 1**, porazený dostane 0. Prvý zápas
sezóny teda vždy dáva víťazovi 1 bod. Čím silnejšieho súpera tím porazí,
tým viac bodov získa.

### ELO

- Každý tím začína na **1500**, konštanta **K = 40**.
- Očakávaná šanca na výhru: `1 / (1 + 10^((ELO súpera − vlastné ELO) / 400))`.
- Víťaz získa `K × (1 − očakávaná šanca)`, porazený o rovnako veľa stratí.
- Počíta sa po zápasoch v chronologickom poradí, každý zápas raz.

## Detail tímu

Jedna tabuľka so všetkými zápasmi zoradenými podľa dátumu:

- **Odohrané zápasy:** výsledok (W/L), skóre, získané Value v zápase a ELO po zápase
  s jeho zmenou, napríklad `1520 (+20.0)`.
- **Neodohrané zápasy:** v stĺpci Skóre je šanca tímu na výhru podľa ESPN Matchup
  Predictor (BPI), napríklad `74.3 %`. Bunka je podfarbená na zeleno (šanca 50 %
  a viac) alebo na červeno (pod 50 %). Čím je šanca ďalej od 50 %, tým sýtejší
  je odtieň.

Predikcia je momentka z času posledného spustenia `fetch_schedules.py`. ESPN ju
priebežne prepočítava, preto treba dáta obnoviť, ak ich chcete mať aktuálne.

## Zdroj dát

Dáta pochádzajú z neoficiálnych ESPN endpointov, ktoré ESPN nedokumentuje a môžu
sa kedykoľvek zmeniť:

- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams`
- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{id}/schedule`
- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={gameId}`
  (kľúč `predictor`)

Projekt nie je spojený s ESPN ani NBA a je určený na osobné použitie.
