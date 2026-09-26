# The Game Wiki

**Live site: https://filipinocollabemtech.github.io/the-game-wiki/**

A connected, searchable game database — every entry links to its related entries:

- **Tower →** stats, upgrades, DPS **→ How to get →** Crate/Chest drop chance **→** back to other towers
- **Item →** which maps drop it **→** which recipes consume it
- **Map →** win-drop table **→** item pages
- **Recipe →** materials **→** tower/item pages

Live site: GitHub Pages (see repo settings).

## Contents

| Path | What |
|---|---|
| `docs/` | The site. Static, zero dependencies — works on any host. |
| `docs/index.html` | Shell: header search, tab nav, footer |
| `docs/style.css` | Dark theme |
| `docs/app.js` | SPA: hash routing (`#/tower/…`, `#/crate/…`), search, rarity filter, DPS sorting, **Team Builder** |
| `docs/data.js` | Generated database: 182 towers, 16 crates, 9 chests, 14 items, 18 maps, 28 recipes, 5 merchants, 28-day login calendar, summon odds + pity |

## Features

- **Cross-linked entries** — tower → crate → tower, item → map → recipe, etc.
- **How to get** on every tower (crates, chests, crafting, merchants, daily login, garden seeds, premium pool, summon odds) and every crate/chest (shop, merchants, dailies, gifts, events).
- **Roles & skills** — every tower tagged Buffer / Farm / Spawner / DPS / Support with its skill Type and maxed aura values.
- **Team Builder** (`#/builder`) — save your 6-tower build, hit Calculate: team DPS, buff-channel coverage, and per-slot better replacements with sources.

## Data model

```js
towers: { [name]: { rarity, type, place, base:{damage,range,cooldown},
                   max:{...}, upgrades, upgradePrices, upgradeCost,
                   levels:[...], cap, custom, flags } }
relationships: { [tower]: { crates:[{crate,chance,price,enabled}],
                            chests:[...], craftedBy:[recipeId],
                            merchants:[...], daily:[...],
                            summon:{basic,premium} } }
crates / chests / maps / items / itemUsage / recipes / merchants / daily / summon
```

Base drop chances are at luck ×1. In-game hover percentages shift with luck
(weights under 10 scale with `LuckEvent × Luck`; weights ≥ 10 are fixed).

## Regenerating data

Data was built from dumped game configs (decompiled client + lobby runtime dump).
To refresh after a game update:

1. Re-run the runtime dumper (`game_dump.lua` in the tools folder) in the lobby.
2. Re-run the builder scripts against the new dump to regenerate `docs/data.js`.

## Disclaimer

Unofficial fan project. Not affiliated with the game developers.
