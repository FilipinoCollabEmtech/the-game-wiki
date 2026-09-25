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
  rel.crates.forEach(c => { h += `<li>🎰 ${link("crate", c.crate)} — <b>${pct(c.chance)}</b> ${c.enabled ? '<span class="badge-on">on sale</span>' : '<span class="badge-off">vaulted</span>'}</li>`; });
  rel.chests.forEach(c => { h += `<li>🎁 ${link("chest", c.chest)} — <b>${pct(c.chance)}</b></li>`; });
  rel.craftedBy.forEach(id => { const rec = D.recipes.find(r => r.id === id); h += `<li>🔨 Crafted — ${link("recipe", id, id + (rec ? ": " + rec.reward : ""))}</li>`; });
  rel.merchants.forEach(m => { h += `<li>🛒 ${esc(m.merchant)} — ${fmt(m.price)}</li>`; });
  rel.daily.forEach(d => { h += `<li>📅 Daily login day ${d.day} (x${d.amount})</li>`; });
  if (rel.summon) h += `<li>🎲 Summon banner — Basic ${rel.summon.basic}% / Premium ${rel.summon.premium}% rarity odds</li>`;
  return h + "</ul>";
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
  const lv = t.levels.map((s, i) => `<tr><td>Lvl ${i + 1}</td><td class="num">${fmt(t.upgradePrices[i] || 0)}</td><td class="num">${fmt(s.Damage)}</td><td class="num">${fmt(s.Range)}</td><td class="num">${s.Cooldown}</td><td>${esc(s.Mob || s.FarmCash != null ? (s.Mob || ("$" + fmt(s.FarmCash))) : "-")}</td></tr>`).join("");
  return `<div class="card"><h1>${esc(name)}</h1>
    <span class="pill rarity-${esc(t.rarity)}">${esc(t.rarity)}</span>
    <span class="pill">${esc(t.type || "-special")}</span>
    ${t.cap != null ? `<span class="pill">max ${t.cap} placed</span>` : ""} ${flags}
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
  return `<div class="card"><h1>${esc(name)}</h1>
    <p>${c.enabled ? `<span class="badge-on">ON SALE</span> ${esc(c.price || "")}` : '<span class="badge-off">VAULTED</span>'}</p>
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
  return `<div class="card"><h1>${esc(name)}</h1>${dropTable(c.drops)}</div>`;
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
    ${u.recipes.map(r => `<li>${r.amount}× in ${link("recipe", r.recipe, r.recipe + " → " + r.reward)}</li>`).join("") || "<li class='dim'>—</li>"}</ul></div>`;
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
  else if (page === "search") html = vSearch(decodeURIComponent(arg || ""));
  app.innerHTML = html;
  if (page === "towers" && !arg) {
    paintTowers();
    document.getElementById("fRar").onchange = paintTowers;
    document.getElementById("fSort").onchange = paintTowers;
  }
}
searchBox.addEventListener("input", () => {
  const q = searchBox.value.trim();
  if (q.length >= 2) location.hash = "#/search/" + encodeURIComponent(q);
  else if ((location.hash || "").startsWith("#/search")) location.hash = "#/";
});
window.addEventListener("hashchange", route);
route();
