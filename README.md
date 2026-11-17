# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/rizkyandyfany4-debug/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/rizkyandyfany4-debug/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar — the best token launch radar: a dashboard that tracks the pre-token protocols worth farming, ranked by an implied value, with a farm plan for each one. Built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC.

## The model

`implied = round(TVL × category multiple × growth × maturity × breadth)`

- **Category multiple** — the median market-cap-to-TVL ratio of the live-token protocols in the same category, shrunk toward the overall median (0.21) with a prior of 4 observations, clamped to 0.05–0.60. A protocol is priced like its own category's traded peers, never from a hand-kept list of names.
- **Growth** — 1 + the 7-day TVL change (clamped −60% to +120%) × 0.5.
- **Maturity** — 0.6 + age/1095 days × 0.4 (age unknown: 365 days).
- **Breadth** — 1 + 0.02 per chain beyond the first, at most 5 extra.

The board covers the whole 40-protocol watchlist plus the pre-token protocols below the $50M floor with the most TVL — the early finds. Live-token protocols are set aside with the market's own values, never ranked.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input kit/input/snapshot.json
```

Requires Node.js 22.18 or later. Standard library only: no install, no network, deterministic — two runs write the same bytes.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
