/* The Game Wiki SPA — hash routing, zero deps. */
const D = window.GAME_DATA;
const app = document.getElementById("app");
const searchBox = document.getElementById("search");

const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => (n === null || n === undefined || n === "-") ? "-" : Number(n).toLocaleString("en-US");
const dps = (d, c) => (d == null || c == null || +c === 0 || d === "-") ? "-" : (+d / +c).toFixed(+d / +c >= 100 ? 0 : 1);
const link = (kind, name, label) => `<a href="#/${kind}/${encodeURIComponent(name)}">${esc(label || name)}</a>`;
const pct = c => (c == null ? "-" : (+c).toFixed(+c >= 10 ? 1 : +c >= 1 ? 2 : 4).replace(/\.?0+$/, "") + "%");

/* ---------- shared ---------- */
function setActive(tab) {
  document.querySelectorAll("#tabs a").forEach(a =>
    a.classList.toggle("active", a.getAttribute("href") === "#/" + tab));
}
function obtainList(r) {
  const rel = D.relationships[r];
  if (!rel) return `<p class="dim">No sources recorded.</p>`;
  let h = "<ul class='links'>";
  let any = false;
  const li = s => { any = true; h += `<li>${s}</li>`; };
  rel.crates.forEach(c => li(`🎰 ${link("crate", c.crate)} — <b>${pct(c.chance)}</b> ${c.enabled ? '<span class="badge-on">on sale</span>' : '<span class="badge-off">vaulted</span>'}`));
  rel.chests.forEach(c => li(`🎁 ${link("chest", c.chest)} — <b>${pct(c.chance)}</b>`));
  rel.craftedBy.forEach(id => { const rec = D.recipes.find(r => r.id === id); li(`🔨 Crafted — ${link("recipe", id, id + (rec ? ": " + rec.reward : ""))}`); });
  rel.merchants.forEach(m => li(`🛒 ${esc(m.merchant)} — ${fmt(m.price)} (event currency)`));
  rel.daily.forEach(d => li(`📅 Daily login day ${d.day} (x${d.amount})`));
  rel.seeds.forEach(s => li(`🌱 Grown from ${esc(s)} (garden)`));
  if (rel.premiumSummon) li(`💎 Premium summon pool (gems banner)`);
  if (rel.summon && rel.summon.basic) li(`🎲 Summon banner — Basic ${rel.summon.basic}% / Premium ${rel.summon.premium}% rarity odds`);
  h += "</ul>";
  if (!any) return `<p class="dim">No recorded source — likely event, mode-exclusive, or unreleased. Check patch notes.</p>`;
  return h;
}
/* roles: Buffer / Farm / Spawner / DPS / Support */
function towerRoles(name) {
  const t = D.towers[name];
  if (!t) return [];
  const lv = t.levels || [];
  const hasBuff = lv.some(s => s.DamageBuff || s.CooldownBuff || s.RangeBuff)
    || (t.custom && /boost/i.test(t.custom.text || ""));
  const hasFarm = lv.some(s => s.FarmCash != null)
    || (t.custom && /farm/i.test(t.custom.text || ""));
  const spawner = /spawner/i.test(t.type || "") || lv.some(s => s.Mob);
  const hasDmg = t.base.damage != null && !(t.flags && t.flags.DamageEnabled === false);
  const roles = [];
  if (hasBuff) roles.push("Buffer");
  if (hasFarm) roles.push("Farm");
  if (spawner) roles.push("Spawner");
  if (hasDmg) roles.push("DPS");
  if (!roles.length) roles.push("Support");
  return roles;
}
function maxBuffs(name) {
  const b = { DamageBuff: 0, CooldownBuff: 1, RangeBuff: 0, FarmCash: 0 };
  ((D.towers[name] || {}).levels || []).forEach(s => {
    if (s.DamageBuff) b.DamageBuff = Math.max(b.DamageBuff, +s.DamageBuff);
    if (s.CooldownBuff) b.CooldownBuff = Math.min(b.CooldownBuff, +s.CooldownBuff);
    if (s.RangeBuff) b.RangeBuff = Math.max(b.RangeBuff, +s.RangeBuff);
    if (s.FarmCash != null) b.FarmCash = Math.max(b.FarmCash, +s.FarmCash);
  });
  return b;
}
const maxDPSof = n => { const t = D.towers[n]; return (t && t.max.damage != null && +t.max.cooldown > 0) ? +t.max.damage / +t.max.cooldown : 0; };
/* enchants (GameController.lua:266-345): one applies, Void > Shiny > Silver.
   stat x (1+bonus); cooldown negative = reduction. Boost-custom towers:
   only Range takes stat bonus, Custom aura value x (1+Boost) instead. */
const ENCH = {
  Normal: { d: 0, r: 0, c: 0, b: 0 },
  Silver: { d: 0.25, r: 0, c: 0, b: 0.10 },
  Shiny:  { d: 0.20, r: 0.10, c: -0.10, b: 0.10 },
  Void:   { d: 0.25, r: 0.25, c: -0.25, b: 0.15 },
};
const isBoostTower = n => { const t = D.towers[n]; return !!(t.custom && /boost/i.test(t.custom.text || "")); };
function enchDPS(name, e) {
  const t = D.towers[name];
  if (t.max.damage == null || +t.max.cooldown <= 0) return null;
  return t.max.damage * (1 + e.d) / (+t.max.cooldown * (1 + e.c));
}
function enchTable(name) {
  const boost = isBoostTower(name);
  const rows = Object.entries(ENCH).map(([k, e]) => {
    if (boost) {
      const b = D.towers[name].custom;
      const base = b ? `${esc(String(b.base))} → ${esc(String(b.max))}` : "-";
      return `<tr><td>${k}</td><td>aura ×${(1 + e.b).toFixed(2)}</td><td class="dim">${base}</td></tr>`;
    }
    const v = enchDPS(name, e);
    return `<tr><td>${k}</td><td class="num"><b>${v == null ? "-" : (v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1))}</b></td>
      <td class="dim">dmg +${e.d * 100}% · rng +${e.r * 100}% · cd ${e.c <= 0 ? "" : "+"}${e.c * 100}%</td></tr>`;
  }).join("");
  return `<details class="ench"><summary>enchants ▾</summary><table>
    <tr><th>Enchant</th><th class="num">${boost ? "Aura" : "Max DPS"}</th><th></th></tr>${rows}</table></details>`;
}
function firstSource(name) {
  const rel = D.relationships[name];
  if (!rel) return "-";
  if (rel.crates.length) return `${rel.crates[0].crate} ${pct(rel.crates[0].chance)}`;
  if (rel.chests.length) return `${rel.chests[0].chest} ${pct(rel.chests[0].chance)}`;
  if (rel.craftedBy.length) return "craft: " + rel.craftedBy[0];
  if (rel.merchants.length) return rel.merchants[0].merchant;
  if (rel.daily.length) return "daily day " + rel.daily[0].day;
  if (rel.seeds.length) return rel.seeds[0];
  if (rel.premiumSummon) return "premium summon";
  if (rel.summon && rel.summon.basic) return "summon";
  return "unknown";
}
function towerRow(name) {
  const t = D.towers[name];
  return `<tr><td>${link("tower", name)}</td>
    <td class="rarity-${esc(t.rarity)}">${esc(t.rarity)}</td>
    <td>${esc(t.type || "-")}</td>
    <td class="num">${fmt(t.place)}</td><td class="num">${fmt(t.base.damage)}</td>
    <td class="num">${dps(t.base.damage, t.base.cooldown)}</td>
    <td class="num">${fmt(t.max.damage)}</td><td class="num">${dps(t.max.damage, t.max.cooldown)}</td></tr>`;
}

/* ---------- views ---------- */
function vHome() {
  setActive("");
  const m = D.meta;
  return `<div class="card"><h1>The Game Wiki</h1>
    <p class="dim">Every tower, crate, chest, item, map and recipe — cross-linked. Search above or browse:</p>
    <div class="counts">
      <a href="#/towers"><b>${m.towerCount}</b><span>Towers</span></a>
      <a href="#/crates"><b>${m.crateCount}</b><span>Crates</span></a>
      <a href="#/chests"><b>${m.chestCount}</b><span>Chests</span></a>
      <a href="#/items"><b>${m.itemCount}</b><span>Items</span></a>
      <a href="#/maps"><b>${m.mapCount}</b><span>Maps</span></a>
      <a href="#/recipes"><b>${m.recipeCount}</b><span>Recipes</span></a>
    </div></div>`;
}
function vTowers() {
  setActive("towers");
  const rars = [...new Set(Object.values(D.towers).map(t => t.rarity))];
  return `<div class="card"><h1>Towers (${Object.keys(D.towers).length})</h1>
    <div class="toolbar">
      <select id="fRar"><option value="">All rarities</option>${rars.map(r => `<option>${esc(r)}</option>`).join("")}</select>
      <select id="fSort">
        <option value="place">Sort: placement cost</option>
        <option value="maxdps">Sort: max DPS</option>
        <option value="maxdmg">Sort: max damage</option>
        <option value="name">Sort: name</option>
      </select>
    </div>
    <table><tr><th>Tower</th><th>Rarity</th><th>Type</th><th class="num">$</th><th class="num">Dmg</th><th class="num">DPS</th><th class="num">Max</th><th class="num">MaxDPS</th></tr>
    <tbody id="rows"></tbody></table></div>`;
}
function paintTowers() {
  const rar = document.getElementById("fRar").value || "", sort = document.getElementById("fSort").value || "place";
  let names = Object.keys(D.towers).filter(n => !rar || D.towers[n].rarity === rar);
  const key = { place: n => +D.towers[n].place || 1e12, maxdps: n => -(dps(D.towers[n].max.damage, D.towers[n].max.cooldown) || -1),
    maxdmg: n => -(+D.towers[n].max.damage || -1), name: n => n }[sort];
  names.sort((a, b) => (key(a) > key(b) ? 1 : -1));
  document.getElementById("rows").innerHTML = names.map(towerRow).join("");
}
function vTower(name) {
  setActive("towers");
  const t = D.towers[name];
  if (!t) return `<div class="card"><h1>Not found</h1><p>No tower named "${esc(name)}".</p></div>`;
  const c = t.custom ? `<p>✨ ${esc(t.custom.text)}: base ${esc(t.custom.base)} → max ${esc(t.custom.max)}</p>` : "";
  const flags = Object.keys(t.flags || {}).map(f => `<span class="pill">${esc(f)}=false</span>`).join("");
  const roles = towerRoles(name).map(r => `<span class="pill">${r}</span>`).join("");
  const mb = maxBuffs(name);
  const buffLine = (mb.DamageBuff || mb.RangeBuff || mb.CooldownBuff !== 1 || mb.FarmCash) ?
    `<p>🛡 Aura (maxed): ${mb.DamageBuff ? `DMG ×${mb.DamageBuff} ` : ""}${mb.CooldownBuff !== 1 ? `CD ×${mb.CooldownBuff} ` : ""}${mb.RangeBuff ? `RNG ×${mb.RangeBuff} ` : ""}${mb.FarmCash ? `Farm $${fmt(mb.FarmCash)}` : ""}</p>` : "";
  const lv = t.levels.map((s, i) => `<tr><td>Lvl ${i + 1}</td><td class="num">${fmt(t.upgradePrices[i] || 0)}</td><td class="num">${fmt(s.Damage)}</td><td class="num">${fmt(s.Range)}</td><td class="num">${s.Cooldown}</td><td>${esc(s.Mob || s.FarmCash != null ? (s.Mob || ("$" + fmt(s.FarmCash))) : "-")}</td></tr>`).join("");
  return `<div class="card"><h1>${esc(name)}</h1>
    <span class="pill rarity-${esc(t.rarity)}">${esc(t.rarity)}</span>
    <span class="pill">${esc(t.type || "-special")}</span>
    ${roles}
    ${t.cap != null ? `<span class="pill">max ${t.cap} placed</span>` : ""}
    ${t.premium ? `<span class="pill">💎 premium pool</span>` : ""} ${flags}
    <div class="stat">
      <div><b>$${fmt(t.place)}</b><span>placement</span></div>
      <div><b>${fmt(t.base.damage)}</b><span>base dmg</span></div>
      <div><b>${t.base.range}</b><span>range</span></div>
      <div><b>${t.base.cooldown}</b><span>cooldown</span></div>
      <div><b>${dps(t.base.damage, t.base.cooldown)}</b><span>base DPS</span></div>
      <div><b>${fmt(t.max.damage)}</b><span>max dmg</span></div>
      <div><b>${dps(t.max.damage, t.max.cooldown)}</b><span>max DPS</span></div>
      <div><b>$${fmt(t.upgradeCost)}</b><span>upgrade total</span></div>
    </div>${c}
    <h3 class="sec">Skill</h3>
    <p>⚔️ <b>${esc(t.type || "Special")}</b>${t.custom ? ` — ${esc(t.custom.text)} (${esc(String(t.custom.base))} → ${esc(String(t.custom.max))})` : ""}</p>
    ${buffLine}
    <p class="dim">No per-tower description text exists in the game configs — Type + aura values above are the full kit.</p>
    <h3 class="sec">Upgrades (${t.upgrades})</h3>
    <table><tr><th></th><th class="num">Cost</th><th class="num">Dmg</th><th class="num">Rng</th><th class="num">Cd</th><th>Extra</th></tr>${lv}</table>
    <h3 class="sec">How to get</h3>${obtainList(name)}</div>`;
}
function dropTable(drops, kind) {
  const rows = [...drops].sort((a, b) => (b.chance || 0) - (a.chance || 0)).map(d => {
    const nm = d.kind === "tower" ? link("tower", d.name) : esc(d.name);
    const extra = d.amount ? ` ×${fmt(d.amount)}` : "";
    return `<tr><td>${nm}${extra}</td><td><span class="pill">${esc(d.kind)}</span></td><td class="num"><b>${pct(d.chance)}</b></td></tr>`;
  }).join("");
  return `<table><tr><th>Drop</th><th>Type</th><th class="num">Chance</th></tr>${rows}</table>`;
}
function vCrates() {
  setActive("crates");
  const cells = Object.entries(D.crates).map(([n, c]) =>
    `<div class="cell">${link("crate", n, n)}<br><span class="dim">${c.drops.length} drops · ${c.enabled ? '<span class="badge-on">ON SALE</span> ' + esc(c.price || "") : '<span class="badge-off">vaulted</span>'}</span></div>`).join("");
  return `<div class="card"><h1>Crates (${Object.keys(D.crates).length})</h1><div class="grid">${cells}</div></div>`;
}
function vCrate(name) {
  setActive("crates");
  const c = D.crates[name];
  if (!c) return `<div class="card"><h1>Not found</h1></div>`;
  const src = (D.crateSources && D.crateSources[name]) || [];
  return `<div class="card"><h1>${esc(name)}</h1>
    <p>${c.enabled ? `<span class="badge-on">ON SALE</span> ${esc(c.price || "")}` : '<span class="badge-off">VAULTED</span>'}</p>
    <h3 class="sec">How to get this crate</h3><ul class="links">
    ${src.map(s => `<li>${esc(s)}</li>`).join("") || "<li class='dim'>—</li>"}</ul>
    <h3 class="sec">Drop table (base, luck ×1)</h3>${dropTable(c.drops)}</div>`;
}
function vChests() {
  setActive("chests");
  const cells = Object.entries(D.chests).map(([n, c]) =>
    `<div class="cell">${link("chest", n, n)}<br><span class="dim">${c.drops.length} drops</span></div>`).join("");
  return `<div class="card"><h1>Chests (${Object.keys(D.chests).length})</h1><div class="grid">${cells}</div></div>`;
}
function vChest(name) {
  setActive("chests");
  const c = D.chests[name];
  if (!c) return `<div class="card"><h1>Not found</h1></div>`;
  const src = (D.chestSources && D.chestSources[name]) || [];
  return `<div class="card"><h1>${esc(name)}</h1>
    <h3 class="sec">How to get this chest</h3><ul class="links">
    ${src.map(s => `<li>${esc(s)}</li>`).join("") || "<li class='dim'>—</li>"}</ul>
    <h3 class="sec">Drop table (base, luck ×1)</h3>${dropTable(c.drops)}</div>`;
}
function vItems() {
  setActive("items");
  const cells = Object.keys(D.items).map(n =>
    `<div class="cell">${link("item", n, n)}<br><span class="dim">${esc(D.items[n].Rarity || "")} · ${D.itemUsage[n].recipes.length} recipes</span></div>`).join("");
  return `<div class="card"><h1>Crafting items (${Object.keys(D.items).length})</h1><div class="grid">${cells}</div></div>`;
}
function vItem(name) {
  setActive("items");
  const it = D.items[name], u = D.itemUsage[name];
  if (!it) return `<div class="card"><h1>Not found</h1></div>`;
  return `<div class="card"><h1>${esc(name)}</h1>
    <span class="pill">${esc(it.Rarity || "")}</span>
    <p class="dim">${esc(it.Description || "")}</p>
    <h3 class="sec">Dropped by (map wins)</h3><ul class="links">
    ${u.maps.map(m => `<li>${link("map", m.map)} — <b>${pct(m.chance)}</b></li>`).join("") || "<li class='dim'>—</li>"}</ul>
    <h3 class="sec">Used in</h3><ul class="links">
    ${u.recipes.map(r => `<li>${r.amount}× in ${link("recipe", r.recipe, r.recipe + " → " + r.reward)}</li>`).join("") || "<li class='dim'>—</li>"}</ul>
    <h3 class="sec">Sold by merchants</h3><ul class="links">
    ${(u.merchants || []).map(m => `<li>${esc(m.merchant)} — ${fmt(m.price)} (event currency)</li>`).join("") || "<li class='dim'>—</li>"}</ul></div>`;
}
function vMaps() {
  setActive("maps");
  const cells = Object.keys(D.maps).map(n =>
    `<div class="cell">${link("map", n, n)}<br><span class="dim">${D.maps[n].length} drops</span></div>`).join("");
  return `<div class="card"><h1>Maps (${Object.keys(D.maps).length})</h1><p class="dim">Win drops. Hard ×1.5 / Nightmare ×2.</p><div class="grid">${cells}</div></div>`;
}
function vMap(name) {
  setActive("maps");
  const m = D.maps[name];
  if (!m) return `<div class="card"><h1>Not found</h1></div>`;
  return `<div class="card"><h1>${esc(name)}</h1>
    <table><tr><th>Drop</th><th class="num">Chance</th></tr>
    ${[...m].sort((a, b) => b.chance - a.chance).map(d => `<tr><td>${link("item", d.name)}</td><td class="num"><b>${pct(d.chance)}</b></td></tr>`).join("")}</table></div>`;
}
function vRecipes() {
  setActive("recipes");
  const rows = D.recipes.map(r =>
    `<tr><td>${link("recipe", r.id, r.id)}</td><td>${link("tower", r.reward)}</td><td class="num">${r.materials.length}</td></tr>`).join("");
  return `<div class="card"><h1>Crafting recipes (${D.recipes.length})</h1>
    <table><tr><th>Recipe</th><th>Reward</th><th class="num">Materials</th></tr>${rows}</table></div>`;
}
function vRecipe(id) {
  setActive("recipes");
  const r = D.recipes.find(x => x.id === id);
  if (!r) return `<div class="card"><h1>Not found</h1></div>`;
  return `<div class="card"><h1>${esc(r.id)} → ${link("tower", r.reward)}</h1>
    <table><tr><th class="num">×</th><th>Material</th><th>Type</th></tr>
    ${r.materials.map(m => `<tr><td class="num">${fmt(m.amount)}</td><td>${m.type === "tower" ? link("tower", m.name) : link("item", m.name)}</td><td>${esc(m.type)}</td></tr>`).join("")}</table></div>`;
}
function vSummon() {
  setActive("summon");
  const s = D.summon;
  const row = r => `<tr><td>${r}</td><td class="num">${s.odds[r].basic}%</td><td class="num">${s.odds[r].premium}%</td></tr>`;
  return `<div class="card"><h1>Summon banners</h1>
    <p>Basic: 1× $100 · 10× $900 · 50× $4000 &nbsp;|&nbsp; Premium: 1× 25 gems · 10× 225 · 50× 1125</p>
    <table><tr><th>Rarity</th><th class="num">Basic</th><th class="num">Premium</th></tr>
    ${["Common", "Uncommon", "Rare", "Legendary", "Mythical", "Godly", "Secret", "Celestial", "Sloppy"].map(row).join("")}</table>
    <h3 class="sec">Modifiers</h3><p>Normal 95.5% · Shiny 4% · Void 0.5%</p>
    <h3 class="sec">Pity (guaranteed within)</h3>
    <table><tr><th>Rarity</th><th class="num">Basic</th><th class="num">Premium</th></tr>
    ${Object.keys(s.pity.basic).map(r => `<tr><td>${r}</td><td class="num">${fmt(s.pity.basic[r])}</td><td class="num">${fmt(s.pity.premium[r])}</td></tr>`).join("")}</table></div>`;
}
function vMerchants() {
  setActive("merchants");
  return Object.entries(D.merchants).map(([n, stock]) =>
    `<div class="card"><h2>${esc(n)}</h2>
    <table><tr><th>Stock</th><th>Type</th><th class="num">Price</th></tr>
    ${stock.map(s => `<tr><td>${s.type === "tower" ? link("tower", s.name) : s.type === "crate" ? link("crate", s.name) : s.type === "chest" ? link("chest", s.name) : esc(s.name)}</td><td>${esc(s.type)}</td><td class="num">${fmt(s.price)}</td></tr>`).join("")}</table></div>`).join("");
}
function vDaily() {
  setActive("daily");
  return `<div class="card"><h1>Daily login (28 days)</h1>
    <table><tr><th class="num">Day</th><th>Reward</th><th>Type</th><th class="num">×</th></tr>
    ${D.daily.map(d => `<tr><td class="num">${d.day}</td><td>${d.type === "tower" ? link("tower", d.name) : d.type === "crate" ? link("crate", d.name) : esc(d.name)}</td><td>${esc(d.type)}</td><td class="num">${fmt(d.amount)}</td></tr>`).join("")}</table></div>`;
}
function vSearch(q) {
  setActive("");
  q = q.toLowerCase();
  const hit = (n) => n.toLowerCase().includes(q);
  const sec = (title, names, kind) => names.length ?
    `<div class="card"><h2>${title} (${names.length})</h2><div class="grid">${names.slice(0, 24).map(n => `<div class="cell">${link(kind, n, n)}</div>`).join("")}${names.length > 24 ? `<div class="cell dim">+${names.length - 24} more…</div>` : ""}</div></div>` : "";
  return `<div class="card"><h1>Results for "${esc(q)}"</h1></div>` +
    sec("Towers", Object.keys(D.towers).filter(hit), "tower") +
    sec("Crates", Object.keys(D.crates).filter(hit), "crate") +
    sec("Chests", Object.keys(D.chests).filter(hit), "chest") +
    sec("Items", Object.keys(D.items).filter(hit), "item") +
    sec("Maps", Object.keys(D.maps).filter(hit), "map") +
    sec("Recipes", D.recipes.filter(r => hit(r.id) || hit(r.reward)).map(r => r.id), "recipe");
}

/* ---------- team builder ---------- */
const TEAM_KEY = "wiki-team-v1", TEAM_MAX = 6;
function getTeam() {
  try { const t = JSON.parse(localStorage.getItem(TEAM_KEY) || "[]"); return Array.isArray(t) ? t.filter(n => D.towers[n]).slice(0, TEAM_MAX) : []; }
  catch (e) { return []; }
}
function setTeam(t) { try { localStorage.setItem(TEAM_KEY, JSON.stringify(t)); } catch (e) {} }
function buffScore(name) {
  const b = maxBuffs(name);
  return (b.DamageBuff || 1) * (b.CooldownBuff ? 1 / b.CooldownBuff : 1) * (b.RangeBuff || 1);
}
function vBuilder() {
  setActive("builder");
  const team = getTeam();
  const cards = team.map((n, i) => {
    const t = D.towers[n], roles = towerRoles(n);
    return `<div class="cell slot"><span class="slotnum">${i + 1}</span>
      <button class="rm" data-rm="${i}" title="Remove">✕</button>
      <b>${link("tower", n)}</b><br>
      ${roles.map(r => `<span class="pill">${r}</span>`).join("")}
      <br><span class="dim">⚔️ ${esc(t.type || "Special")}</span>
      <br><span class="dim">Max DPS ${dps(t.max.damage, t.max.cooldown)} · $${fmt(t.place)}</span></div>`;
  }).join("");
  return `<div class="card"><h1>Team Builder</h1>
    <p class="dim">Pick up to ${TEAM_MAX} towers (match loadout). Compared at <b>maxed</b> stats. Hit Calculate for upgrades.</p>
    <div class="ac-wrap">
      <input id="bAdd" placeholder="Type a tower name..." autocomplete="off" style="flex:1;min-width:200px">
      <div id="bDrop" class="ac-drop"></div>
      <button id="bAddBtn" class="btn">Add</button>
      <button id="bClear" class="btn ghost">Clear</button>
    </div>
    <div class="grid" id="bTeam">${cards || "<p class='dim'>No towers yet — add your current build above.</p>"}</div>
    <div class="toolbar" style="margin-top:12px"><button id="bCalc" class="btn primary" ${team.length ? "" : "disabled"}>Calculate replacements</button></div>
    <div id="bOut"></div></div>`;
}
function paintBuilder() {
  const team = getTeam();
  const input = document.getElementById("bAdd"), drop = document.getElementById("bDrop");
  let matches = [], sel = -1;
  const close = () => { drop.style.display = "none"; sel = -1; };
  const renderDrop = () => {
    if (!matches.length) { close(); return; }
    drop.innerHTML = matches.map((n, i) => {
      const t = D.towers[n];
      return `<div class="ac-item${i === sel ? " sel" : ""}" data-pick="${esc(n)}">
        <b>${esc(n)}</b> <span class="rarity-${esc(t.rarity)}">${esc(t.rarity)}</span>
        <span class="dim">· ${dps(t.max.damage, t.max.cooldown)} DPS</span></div>`;
    }).join("");
    drop.style.display = "block";
    drop.querySelectorAll("[data-pick]").forEach(el => {
      el.onmousedown = e => { e.preventDefault(); addName(el.getAttribute("data-pick")); };
    });
  };
  const search = () => {
    const q = input.value.trim().toLowerCase();
    matches = q ? Object.keys(D.towers).filter(n => !team.includes(n) && n.toLowerCase().includes(q))
      .sort((a, b) => {
        const ai = a.toLowerCase().indexOf(q), bi = b.toLowerCase().indexOf(q);
        return ai - bi || a.localeCompare(b);
      }).slice(0, 8) : [];
    sel = matches.length ? 0 : -1;
    renderDrop();
  };
  const addName = name => {
    if (D.towers[name] && !team.includes(name) && team.length < TEAM_MAX) {
      team.push(name); setTeam(team); route();
    } else if (D.towers[name]) { input.value = ""; close(); }
  };
  input.oninput = search;
  input.onfocus = search;
  input.onblur = () => setTimeout(close, 120);
  input.onkeydown = e => {
    if (e.key === "ArrowDown" && matches.length) { e.preventDefault(); sel = (sel + 1) % matches.length; renderDrop(); }
    else if (e.key === "ArrowUp" && matches.length) { e.preventDefault(); sel = (sel - 1 + matches.length) % matches.length; renderDrop(); }
    else if (e.key === "Enter") { e.preventDefault(); addName(sel >= 0 && matches[sel] ? matches[sel] : input.value.trim()); }
    else if (e.key === "Escape") close();
  };
  document.getElementById("bAddBtn").onclick = () => addName(input.value.trim());
  document.getElementById("bClear").onclick = () => { setTeam([]); route(); };
  document.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => {
    team.splice(+b.getAttribute("data-rm"), 1); setTeam(team); route();
  });
  const calc = document.getElementById("bCalc");
  if (calc) calc.onclick = () => {
    document.getElementById("bOut").innerHTML = calcTeam(team);
  };
}
function calcTeam(team) {
  const byRole = r => Object.keys(D.towers).filter(n => towerRoles(n).includes(r));
  const dpsRank = byRole("DPS").sort((a, b) => maxDPSof(b) - maxDPSof(a));
  const farmRank = Object.keys(D.towers).filter(n => maxBuffs(n).FarmCash > 0).sort((a, b) => maxBuffs(b).FarmCash - maxBuffs(a).FarmCash);
  const bufRank = byRole("Buffer").sort((a, b) => buffScore(b) - buffScore(a));
  // team summary
  const totDPS = team.reduce((s, n) => s + maxDPSof(n), 0);
  const rolesCovered = [...new Set(team.flatMap(towerRoles))];
  const chan = { dmg: [], cd: [], rng: [] };
  team.forEach(n => {
    const b = maxBuffs(n);
    if (b.DamageBuff > 1) chan.dmg.push(`${n} ×${b.DamageBuff}`);
    if (b.CooldownBuff < 1) chan.cd.push(`${n} ×${b.CooldownBuff}`);
    if (b.RangeBuff > 1) chan.rng.push(`${n} ×${b.RangeBuff}`);
  });
  const farm = team.reduce((s, n) => s + maxBuffs(n).FarmCash, 0);
  let h = `<div class="card"><h2>Team score (maxed)</h2><div class="stat">
    <div><b>${totDPS >= 100 ? Math.round(totDPS).toLocaleString() : totDPS.toFixed(1)}</b><span>combined max DPS</span></div>
    <div><b>${team.length}/${TEAM_MAX}</b><span>slots</span></div>
    <div><b>${rolesCovered.join(" + ") || "-"}</b><span>roles</span></div>
    <div><b>${farm ? "$" + fmt(farm) : "-"}</b><span>farm / tick</span></div></div>
    <p class="dim">Buff channels: DMG [${chan.dmg.join("; ") || "—"}] · CD [${chan.cd.join("; ") || "—"}] · RNG [${chan.rng.join("; ") || "—"}]
    <br>Note: same-channel buffs share one slot per tower — one winner each. Different channels multiply.</p></div>`;
  // per-slot suggestions
  team.forEach(n => {
    const t = D.towers[n], roles = towerRoles(n);
    h += `<div class="card"><h2>Slot: ${link("tower", n)} <span class="dim">(${roles.join("/")})</span></h2>`;
    let anyUp = false;
    const sug = (title, rank, scoreFn, cur, render) => {
      const better = rank.filter(x => x !== n && scoreFn(x) > cur).slice(0, 3);
      if (!better.length) return `<p>✅ Best in slot for <b>${esc(title)}</b>.</p>`;
      anyUp = true;
      return `<h3 class="sec">Better ${esc(title)}</h3><ul class="links">` + better.map(x =>
        `<li>${link("tower", x)} — ${render(x)} <span class="dim">(${esc(firstSource(x))})</span></li>`).join("") + "</ul>";
    };
    if (roles.includes("DPS")) {
      const cur = maxDPSof(n);
      const better = dpsRank.filter(x => x !== n && maxDPSof(x) > cur).slice(0, 3);
      if (!better.length) h += `<p>✅ Best in slot for <b>DPS</b>.</p>`;
      else {
        anyUp = true;
        h += `<h3 class="sec">Better DPS</h3><ul class="links">` + better.map(x =>
          `<li>${link("tower", x)} — ${dps(D.towers[x].max.damage, D.towers[x].max.cooldown)} max DPS (+${Math.round((maxDPSof(x) / cur - 1) * 100)}%) <span class="dim">(${esc(firstSource(x))})</span>${enchTable(x)}</li>`).join("") + "</ul>";
      }
    }
    if (roles.includes("Buffer")) {
      const cur = buffScore(n);
      const better = bufRank.filter(x => x !== n && buffScore(x) > cur).slice(0, 3);
      if (!better.length) h += `<p>✅ Best in slot for <b>buffer</b>.</p>`;
      else {
        anyUp = true;
        h += `<h3 class="sec">Better buffer</h3><ul class="links">` + better.map(x => {
          const b = maxBuffs(x);
          return `<li>${link("tower", x)} — ×${buffScore(x).toFixed(2)} combined (${b.DamageBuff ? "DMG×" + b.DamageBuff + " " : ""}${b.CooldownBuff !== 1 ? "CD×" + b.CooldownBuff + " " : ""}${b.RangeBuff ? "RNG×" + b.RangeBuff : ""}) <span class="dim">(${esc(firstSource(x))})</span>${enchTable(x)}</li>`;
        }).join("") + "</ul>";
      }
    }
    if (roles.includes("Farm")) {
      const cur = maxBuffs(n).FarmCash;
      h += sug("farm", farmRank, x => maxBuffs(x).FarmCash, cur, x => "$" + fmt(maxBuffs(x).FarmCash) + "/tick");
    }
    if (roles.includes("Spawner") && !roles.includes("DPS")) {
      const spawners = byRole("Spawner").sort((a, b) => maxDPSof(b) - maxDPSof(a));
      h += sug("spawner (by DPS)", spawners, maxDPSof, maxDPSof(n), x => `${dps(D.towers[x].max.damage, D.towers[x].max.cooldown)} max DPS`);
    }
    if (!anyUp && roles.length) h += `<p class="dim">No upgrades found — already top of its roles.</p>`;
    h += `</div>`;
  });
  return h;
}

/* ---------- router ---------- */
function route() {
  const h = location.hash || "#/";
  const [_, page, arg] = h.match(/^#\/(\w+)(?:\/(.+))?$/) || [];
  window.scrollTo(0, 0);
  let html = vHome();
  if (!page) html = vHome();
  else if (page === "towers" && !arg) html = vTowers();
  else if (page === "tower") html = vTower(decodeURIComponent(arg || ""));
  else if (page === "crates" && !arg) html = vCrates();
  else if (page === "crate") html = vCrate(decodeURIComponent(arg || ""));
  else if (page === "chests" && !arg) html = vChests();
  else if (page === "chest") html = vChest(decodeURIComponent(arg || ""));
  else if (page === "items" && !arg) html = vItems();
  else if (page === "item") html = vItem(decodeURIComponent(arg || ""));
  else if (page === "maps" && !arg) html = vMaps();
  else if (page === "map") html = vMap(decodeURIComponent(arg || ""));
  else if (page === "recipes" && !arg) html = vRecipes();
  else if (page === "recipe") html = vRecipe(decodeURIComponent(arg || ""));
  else if (page === "summon") html = vSummon();
  else if (page === "merchants") html = vMerchants();
  else if (page === "daily") html = vDaily();
  else if (page === "builder") html = vBuilder();
  else if (page === "search") html = vSearch(decodeURIComponent(arg || ""));
  app.innerHTML = html;
  if (page === "towers" && !arg) {
    paintTowers();
    document.getElementById("fRar").onchange = paintTowers;
    document.getElementById("fSort").onchange = paintTowers;
  }
  if (page === "builder") paintBuilder();
}
searchBox.addEventListener("input", () => {
  const q = searchBox.value.trim();
  if (q.length >= 2) location.hash = "#/search/" + encodeURIComponent(q);
  else if ((location.hash || "").startsWith("#/search")) location.hash = "#/";
});
window.addEventListener("hashchange", route);
route();
