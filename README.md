# The Game Wiki

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
| `docs/app.js` | SPA: hash routing (`#/tower/…`, `#/crate/…`), search, rarity filter, DPS sorting |
| `docs/data.js` | Generated database: 182 towers, 16 crates, 9 chests, 14 items, 18 maps, 28 recipes, 5 merchants, 28-day login calendar, summon odds + pity |

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
