/**
 * FREE EMPIRE — Main Game Script (v4 - Modular with Timers)
 * This file ties together all modules and handles UI/rendering
 */

import { GameEngine } from './js/engine.js';
import { ConstructionSystem } from './js/construction.js';
import { BuildingSystem } from './js/buildings.js';
import { CastleSystem, CASTLE_LEVELS } from './js/castle.js';
import { ResearchSystem, RESEARCH_TREE, RESEARCH_CATEGORIES } from './js/research.js';
import { HeroSystem, HERO_SKILLS, MAX_HERO_LEVEL } from './js/hero.js';
import { MessageSystem, MSG_TYPES } from './js/messages.js';
import { QuestSystem, QUEST_DEFS, QUEST_TYPES } from './js/quests.js';
import { TILE_W, TILE_H, GRID, MARGIN, GATE, BUILDINGS, UNITS, TOOLS } from './js/config.js';

// Global references
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let engine = null;
let hover = null;
let selected = null;
let selTile = null;
let perim = [];

// ============================================================
// INITIALIZATION
// ============================================================

function init() {
  engine = new GameEngine();
  engine.init();

  resize();
  buildPerimeter();
  centerCamera();
  buildToolBar();
  refreshHUD();
  render();
  setInterval(gameTick, 1000);

  setTimeout(() => toast('Welcome, my liege. Build within the walls, then march on the World Map. 👑'), 400);
}

// ============================================================
// GAME LOOP
// ============================================================

function gameTick() {
  const result = engine.tick();

  // Handle completed construction
  if (result.constructionDone) {
    const item = result.constructionDone;
    const def = BUILDINGS[item.buildingType];
    if (item.type === 'build') {
      toast(`✅ ${def ? def.gi + ' ' : ''}${def ? def.name : item.buildingType} completed!`, 'good');
    } else if (item.type === 'upgrade') {
      toast(`⬆️ ${def ? def.gi + ' ' : ''}${def ? def.name : item.buildingType} upgraded to Lvl ${item.level}!`, 'good');
    } else if (item.type === 'castle-upgrade') {
      const castleData = CASTLE_LEVELS[item.level];
      toast(`${castleData ? castleData.gi : '🏉'} Castle upgraded to ${castleData ? castleData.name : 'Level ' + item.level}!`, 'good');
    }
  }

  if (result.researchDone) {
    const tech = RESEARCH_TREE[result.researchDone.id];
    if (tech) toast(`🧪 ${tech.gi} ${tech.name} research complete!`, 'good');
  }

  if (result.questsCompleted && result.questsCompleted.length > 0) {
    for (const q of result.questsCompleted) {
      toast(`📜 Quest: ${q.title} completed!`, 'good');
    }
  }

  refreshHUD();
  updateConstructionUI();
}

// Smooth UI updater for progress bars (runs at 4x tick frequency)
setInterval(() => {
  try {
    updateConstructionUI();
  } catch (e) {
    // ignore during initialization
  }
}, 250);

// ============================================================
// HUD & UI UPDATES
// ============================================================

function refreshHUD() {
  const stats = engine.getStats();

  document.getElementById('r-wood').textContent = Math.floor(engine.state.res.wood);
  document.getElementById('r-stone').textContent = Math.floor(engine.state.res.stone);
  document.getElementById('r-food').textContent = Math.floor(engine.state.res.food);
  document.getElementById('r-gold').textContent = Math.floor(engine.state.res.gold);
  document.getElementById('r-pop').textContent = stats.popUsed;
  document.getElementById('r-army').textContent = engine.getArmyCount();

  document.getElementById('c-wood').textContent = '/' + stats.caps.wood;
  document.getElementById('c-stone').textContent = '/' + stats.caps.stone;
  document.getElementById('c-food').textContent = '/' + stats.caps.food;
  document.getElementById('c-pop').textContent = '/' + stats.popCap;

  // Castle level + prestige in crest
  const castleLvlEl = document.getElementById('castle-level-label');
  if (castleLvlEl) {
    const lvl = engine.state.castleLevel || 1;
    const castleData = CASTLE_LEVELS[lvl];
    castleLvlEl.textContent = `${castleData.gi} Lvl ${lvl} · ⭐${engine.state.prestige || 0}`;
  }

  // Unread inbox badge
  const inboxBtn = document.getElementById('inboxBtn');
  if (inboxBtn) {
    const unread = MessageSystem.unreadCount(engine.state.inbox || []);
    inboxBtn.textContent = unread > 0 ? `📨 Inbox (${unread})` : '📨 Inbox';
    if (unread > 0) inboxBtn.style.background = 'linear-gradient(180deg,#9a4636,#6a2a1e)';
    else inboxBtn.style.background = '';
  }
}

function updateConstructionUI() {
  const queue = engine.construction.getActiveConstruction();
  const queueEl = document.getElementById('constructionQueue');
  // Show or hide the queue container
  if (!queue || queue.length === 0) {
    queueEl.style.display = 'none';
    queueEl.innerHTML = '<h4>⏳ Construction</h4>';
    return;
  }

  queueEl.style.display = 'block';
  let html = `<h4>⏳ Construction (${queue.length})</h4>`;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const elapsed = Date.now() - item.startTime;
    const progress = item.duration > 0 ? Math.max(0, Math.min(1, elapsed / item.duration)) : 1;
    const remaining = Math.max(0, item.duration - elapsed);
    const timeStr = engine.construction.formatTime(remaining);

    const buildingDef = BUILDINGS[item.buildingType] || { gi: '?', name: item.buildingType };
    const name = item.type === 'build' ? `${buildingDef.gi} ${buildingDef.name}` : `${buildingDef.gi} ${buildingDef.name} → Lvl ${item.level}`;
    const label = i === 0 ? 'Now' : `#${i + 1}`;

    html += `<div class="construct-item">
  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px">
    <div class="name">${name}</div><div class="timer">${label} · ${timeStr}</div>
  </div>
  <div class="progress"><i style="width:${Math.round(progress * 100)}%"></i></div>
</div>`;
  }

  queueEl.innerHTML = html;
}

function toast(message, kind = '') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = 'show' + (kind ? ' ' + kind : '');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => (el.className = ''), 2000);
}

// ============================================================
// BUILDING PLACEMENT & MANAGEMENT
// ============================================================

function tryPlaceBuilding(x, y) {
  if (x < 1 || y < 1 || x >= GRID - 1 || y >= GRID - 1) {
    toast('Build inside the walls!', 'bad');
    return;
  }

  if (!selected || selected === 'demolish') return;

  // Block placing on a tile already in the construction queue
  const inQueue = engine.construction.queue.some(q => !q.completed && q.x === x && q.y === y);
  if (inQueue) {
    toast('Already building here!', 'bad');
    return;
  }

  const result = engine.placeBuilding(x, y, selected);

  if (!result.success) {
    toast(result.error, 'bad');
  } else {
    const dur = result.item.duration;
    if (dur === 0) {
      toast(`✓ ${BUILDINGS[selected].name} placed!`, 'good');
    } else {
      toast(`🔨 ${BUILDINGS[selected].name} — ${engine.construction.formatTime(dur)}`, 'good');
    }
    updateConstructionUI();
  }

  selectTool(null);
}

function demolishBuilding(x, y) {
  const key = `${x},${y}`;
  const tile = engine.state.tiles[key];

  if (!tile) return;

  const def = BUILDINGS[tile.type];

  if (def.unique) {
    toast("Can't demolish " + def.name + '!', 'bad');
    return;
  }

  const result = engine.demolishBuilding(x, y);

  if (result.success) {
    toast(def.name + ' demolished (50% back)', 'good');
    refreshHUD();
    closeSelPanel();
  }
}

function openSelPanel(x, y) {
  const key = `${x},${y}`;
  const tile = engine.state.tiles[key];

  // Also check if tile is under construction — show progress view
  const underConstruction = engine.construction.queue.find(
    q => !q.completed && q.x === x && q.y === y
  );

  if (!tile && !underConstruction) {
    closeSelPanel();
    return;
  }

  const buildingType = tile ? tile.type : underConstruction.buildingType;
  const def = BUILDINGS[buildingType];
  if (!def) { closeSelPanel(); return; }

  const level = BuildingSystem.getLevel(engine.state.buildingLevels, x, y);
  const isUpgrading = engine.construction.queue.some(
    q => !q.completed && q.x === x && q.y === y && q.type === 'upgrade'
  );

  selTile = { x, y };
  const selEl = document.getElementById('sel');
  const nameEl = document.getElementById('sel-name');
  const bodyEl = document.getElementById('sel-body');

  nameEl.textContent = `${def.gi} ${def.name}${def.maxLevel > 1 ? ' · Lvl ' + level : ''}`;

  const icons = { wood: '🪵', stone: '🪨', food: '🌾', gold: '🪙' };

  let html = `<div class="desc">${def.desc}</div>`;

  // Production
  if (def.baseProd) {
    const prod = ConstructionSystem.getProduction(def, level);
    const prodStrs = Object.entries(prod).map(([r, v]) => `${icons[r] || r} ${v}/tick`);
    html += `<div class="row"><span>Production</span><span>${prodStrs.join(', ')}</span></div>`;
    if (BuildingSystem.canUpgrade(def, level)) {
      const nextProd = ConstructionSystem.getProduction(def, level + 1);
      const nextStrs = Object.entries(nextProd).map(([r, v]) => `${icons[r] || r} ${v}/tick`);
      html += `<div class="row" style="color:#7bc043"><span>Next level</span><span>${nextStrs.join(', ')}</span></div>`;
    }
  }

  // Storage
  const caps = ConstructionSystem.getCapacity(def, level);
  if (Object.keys(caps).length > 0) {
    html += `<div class="row"><span>Storage</span><span>${Object.entries(caps).map(([r, v]) => `${icons[r] || r} ${v}`).join(', ')}</span></div>`;
  }

  // Workers
  if (def.needsWorker) {
    html += `<div class="row"><span>Workers</span><span>👷 ${def.needsWorker}</span></div>`;
  }

  // Population
  if (def.popCap) {
    html += `<div class="row"><span>Population</span><span>👥 +${def.popCap}</span></div>`;
  }

  // Max level badge
  if (def.maxLevel > 1) {
    const badge = level >= def.maxLevel ? '⭐ Max Level' : `${level}/${def.maxLevel}`;
    html += `<div class="row"><span>Level</span><span>${badge}</span></div>`;
  }

  // Under-construction status
  if (underConstruction) {
    const elapsed = Date.now() - underConstruction.startTime;
    const remaining = Math.max(0, underConstruction.duration - elapsed);
    html += `<div class="row" style="color:#f2c14e"><span>🔨 Building…</span><span>${engine.construction.formatTime(remaining)}</span></div>`;
  }

  if (isUpgrading) {
    const upItem = engine.construction.queue.find(q => !q.completed && q.x === x && q.y === y && q.type === 'upgrade');
    const remaining = Math.max(0, upItem.duration - (Date.now() - upItem.startTime));
    html += `<div class="row" style="color:#f2c14e"><span>⬆️ Upgrading…</span><span>${engine.construction.formatTime(remaining)} → Lvl ${upItem.level}</span></div>`;
  }

  bodyEl.innerHTML = html;
  selEl.style.display = 'block';

  // Remove old action buttons
  document.getElementById('upgrade-btn')?.remove();
  document.getElementById('muster-btn')?.remove();

  // Upgrade button
  if (tile && BuildingSystem.canUpgrade(def, level) && !isUpgrading) {
    const nextLevel = level + 1;
    const upgradeCost = ConstructionSystem.getCost(def, nextLevel);
    const upgradeTime = ConstructionSystem.getConstructionTime(def, nextLevel);
    const costStr = Object.entries(upgradeCost).map(([r, v]) => `${v}${icons[r] || r}`).join(' ');
    const timeStr = engine.construction.formatTime(upgradeTime);

    const canAfford = Object.entries(upgradeCost).every(([r, v]) => (engine.state.res[r] || 0) >= v);

    const btn = document.createElement('button');
    btn.id = 'upgrade-btn';
    btn.innerHTML = `⬆️ Upgrade → Lvl ${nextLevel}<br><small style="font-weight:normal;color:#e9d6a8">${costStr} · ${timeStr}</small>`;
    if (!canAfford) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
    btn.onclick = () => {
      const result = engine.upgradeBuilding(x, y);
      if (result.success) {
        toast(`⬆️ Upgrading ${def.name} to Lvl ${nextLevel} — ${timeStr}`, 'good');
        updateConstructionUI();
        openSelPanel(x, y);
      } else {
        toast(result.error, 'bad');
      }
    };
    document.getElementById('sel-demolish').before(btn);
  }

  // Castle upgrade button for keep
  if (buildingType === 'keep') {
    const castleLevel = engine.state.castleLevel || 1;
    const castleUpgrading = engine.construction.queue.some(q => !q.completed && q.type === 'castle-upgrade');
    if (CastleSystem.canUpgrade(castleLevel) && !castleUpgrading) {
      const nextCastleLevel = castleLevel + 1;
      const castleData = CASTLE_LEVELS[nextCastleLevel];
      const castleCost = CastleSystem.getUpgradeCost(castleLevel);
      const castleTime = CastleSystem.getUpgradeTime(castleLevel);
      const costStr = Object.entries(castleCost).map(([r, v]) => `${v}${icons[r] || r}`).join(' ');
      const timeStr = engine.construction.formatTime(castleTime);
      const canAfford = Object.entries(castleCost).every(([r, v]) => (engine.state.res[r] || 0) >= v);

      const btn = document.createElement('button');
      btn.id = 'castle-upgrade-btn';
      btn.innerHTML = `${castleData.gi} Upgrade Castle → ${castleData.name}<br><small style="font-weight:normal;color:#e9d6a8">${costStr} · ${timeStr}</small>`;
      btn.style.cssText = 'margin-top:6px;background:linear-gradient(180deg,#c8a840,#8a7020);box-shadow:inset 0 0 0 1px #f2c14e;';
      if (!canAfford) { btn.disabled = true; btn.style.opacity = '0.5'; }
      btn.onclick = () => {
        const result = engine.upgradeCastle();
        if (result.success) {
          toast(`${castleData.gi} Upgrading to ${castleData.name} — ${timeStr}`, 'good');
          updateConstructionUI();
          openSelPanel(x, y);
        } else {
          toast(result.error, 'bad');
        }
      };
      document.getElementById('sel-demolish').before(btn);
    } else if (castleUpgrading) {
      const upgradeItem = engine.construction.queue.find(q => !q.completed && q.type === 'castle-upgrade');
      const remaining = Math.max(0, upgradeItem.duration - (Date.now() - upgradeItem.startTime));
      const extraHtml = `<div style="margin-top:6px;color:#f2c14e;font-size:11px;text-align:center">🏉 Upgrading castle… ${engine.construction.formatTime(remaining)}</div>`;
      bodyEl.innerHTML += extraHtml;
    }
  }

  // Muster button for barracks
  if (def.recruits) {
    const btn = document.createElement('button');
    btn.id = 'muster-btn';
    btn.innerHTML = '⚔️ Open Muster';
    btn.style.cssText = 'background:linear-gradient(180deg,#5a7a2e,#3a521c);box-shadow:inset 0 0 0 1px #8aba5a;';
    btn.onclick = () => { closeSelPanel(); openRecruitMenu(); };
    document.getElementById('sel-demolish').before(btn);
  }

  document.getElementById('sel-demolish').style.display = (def.unique || underConstruction) ? 'none' : 'block';
  document.getElementById('sel-demolish').onclick = () => { if (selTile) demolishBuilding(selTile.x, selTile.y); };
}

function closeSelPanel() {
  document.getElementById('sel').style.display = 'none';
  selTile = null;
}

// ============================================================
// RECRUITMENT & COMBAT
// ============================================================

function openRecruitMenu() {
  let hasBarracks = false;
  for (const k in engine.state.tiles) {
    if (engine.state.tiles[k].type === 'barracks') {
      hasBarracks = true;
      break;
    }
  }

  if (!hasBarracks) {
    toast('Build a Barracks first to train troops.', 'bad');
    return;
  }

  const modal = document.getElementById('modal');
  const mbg = document.getElementById('mbg');

  let html = `<h2>⚔️ Muster Your Army</h2>
    <div class="sub">Total power: ${engine.getArmyPower()} · Soldiers: ${engine.getArmyCount()}</div>`;

  for (const u in UNITS) {
    const def = UNITS[u];
    const costStr = Object.entries(def.cost)
      .map(([res, val]) => `${val}${resourceIcon(res)}`)
      .join(' ');

    html += `
      <div class="urow">
        <span class="ug">${def.gi}</span>
        <div class="ut"><b>${def.name}</b> · ⚔${def.power}<div class="uc">${costStr}</div></div>
        <span class="own">${engine.state.army[u] || 0}</span>
        <button class="ubtn" data-u="${u}" data-q="1">+1</button>
        <button class="ubtn" data-u="${u}" data-q="5">+5</button>
      </div>
    `;
  }

  html += '<div class="mfoot"><button class="mclose" id="recruit-done">Done</button></div>';
  modal.innerHTML = html;
  mbg.style.display = 'flex';

  modal.querySelectorAll('.ubtn').forEach((btn) => {
    btn.onclick = () => {
      const result = engine.recruitUnit(btn.dataset.u, +btn.dataset.q);
      if (result.success) {
        refreshHUD();
        openRecruitMenu(); // Refresh menu
      } else {
        toast(result.error, 'bad');
      }
    };
  });

  document.getElementById('recruit-done').onclick = () => closeModal();
}

function closeModal() {
  document.getElementById('mbg').style.display = 'none';
}

function resourceIcon(res) {
  const icons = { wood: '🪵', stone: '🪨', food: '🌾', gold: '🪙' };
  return icons[res] || res;
}

// ============================================================
// RESEARCH UI
// ============================================================

function openResearchMenu() {
  const modal = document.getElementById('modal');
  const mbg = document.getElementById('mbg');

  const researchedSet = new Set(engine.state.researched || []);
  const active = engine.state.activeResearch;
  const castleLevel = engine.state.castleLevel || 1;

  let html = '<h2>🔬 Research</h2>';

  if (active) {
    const tech = RESEARCH_TREE[active.id];
    const remaining = Math.max(0, active.duration - (Date.now() - active.startTime));
    const progress = Math.min(1, (Date.now() - active.startTime) / active.duration);
    html += `<div class="sub" style="color:#f2c14e">🧪 Researching: ${tech.gi} ${tech.name} — ${engine.construction.formatTime(remaining)}</div>`;
    html += `<div class="bar" style="margin-bottom:10px"><i style="width:${Math.round(progress * 100)}%;background:linear-gradient(90deg,#7bc043,#3a7a1e)"></i></div>`;
  }

  for (const cat of RESEARCH_CATEGORIES) {
    const techs = Object.values(RESEARCH_TREE).filter(t => t.category === cat);
    html += `<div style="color:#f2c14e;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:10px 0 4px">${cat}</div>`;

    for (const tech of techs) {
      const done = researchedSet.has(tech.id);
      const canDo = ResearchSystem.canResearch(tech.id, researchedSet, castleLevel);
      const isActive = active?.id === tech.id;
      const locked = !done && !canDo && !isActive;
      const costStr = Object.entries(tech.cost).map(([r, v]) => `${v}${resourceIcon(r)}`).join(' ');
      const canAfford = Object.entries(tech.cost).every(([r, v]) => (engine.state.res[r] || 0) >= v);

      html += `<div class="urow" style="${locked ? 'opacity:0.4' : ''}">
        <span class="ug">${tech.gi}</span>
        <div class="ut" style="flex:1"><b>${tech.name}</b>
          <div class="uc">${tech.desc}</div>
          ${!done && !isActive ? `<div class="uc">${costStr} · ⏱${tech.time}s</div>` : ''}
          ${tech.requires.length ? `<div class="uc" style="color:#888">Requires: ${tech.requires.map(r => RESEARCH_TREE[r]?.name || r).join(', ')}</div>` : ''}
        </div>
        ${done ? '<span style="color:#7bc043;font-size:18px">✔</span>' : ''}
        ${isActive ? '<span style="color:#f2c14e;font-size:11px">…</span>' : ''}
        ${canDo && !active ? `<button class="ubtn${!canAfford ? ' dim' : ''}" data-tech="${tech.id}" ${!canAfford ? 'disabled' : ''}>Research</button>` : ''}
      </div>`;
    }
  }

  html += '<div class="mfoot"><button class="mclose" id="research-done">Close</button></div>';
  modal.innerHTML = html;
  mbg.style.display = 'flex';

  modal.querySelectorAll('[data-tech]').forEach(btn => {
    btn.onclick = () => {
      const result = engine.startResearch(btn.dataset.tech);
      if (result.success) {
        const tech = RESEARCH_TREE[btn.dataset.tech];
        toast(`🧪 Researching ${tech.name}…`, 'good');
        openResearchMenu();
      } else {
        toast(result.error, 'bad');
      }
    };
  });

  document.getElementById('research-done').onclick = closeModal;
}

// ============================================================
// HERO PANEL
// ============================================================

function openHeroPanel() {
  const modal = document.getElementById('modal');
  const mbg = document.getElementById('mbg');
  const hero = engine.state.hero;

  if (!hero) {
    toast('No hero found.', 'bad');
    return;
  }

  const xpForNext = HeroSystem.xpForLevel(hero.level);
  const xpProgress = hero.level >= MAX_HERO_LEVEL ? 1 : Math.min(1, hero.xp / xpForNext);

  let html = `<h2>👑 ${hero.name}</h2>
    <div class="sub">Level ${hero.level} · ${hero.xp} XP · ${hero.skillPoints} skill point${hero.skillPoints !== 1 ? 's' : ''}</div>`;

  // XP bar
  if (hero.level < MAX_HERO_LEVEL) {
    html += `<div style="font-size:11px;color:#cdb78f;margin-bottom:3px">XP to next level: ${hero.xp} / ${xpForNext}</div>`;
    html += `<div class="bar" style="margin-bottom:10px"><i style="width:${Math.round(xpProgress * 100)}%;background:linear-gradient(90deg,#c8a840,#8a7020)"></i></div>`;
  } else {
    html += '<div class="sub" style="color:#f2c14e">⭐ Max Level Reached!</div>';
  }

  html += '<div style="color:#f2c14e;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:8px 0 6px">Skills</div>';

  for (const [skillId, skill] of Object.entries(HERO_SKILLS)) {
    const pts = hero.skills[skillId] || 0;
    const canSpend = hero.skillPoints > 0 && pts < skill.maxPoints;
    html += `<div class="urow">
      <span class="ug">${skill.gi}</span>
      <div class="ut" style="flex:1">
        <b>${skill.name}</b> <span style="color:#f2c14e">${pts}/${skill.maxPoints}</span>
        <div class="uc">${skill.desc}</div>
      </div>
      ${canSpend ? `<button class="ubtn" data-skill="${skillId}">+1</button>` : ''}
    </div>`;
  }

  html += '<div class="mfoot"><button class="mclose" id="hero-done">Close</button></div>';
  modal.innerHTML = html;
  mbg.style.display = 'flex';

  modal.querySelectorAll('[data-skill]').forEach(btn => {
    btn.onclick = () => {
      const result = HeroSystem.spendSkillPoint(engine.state.hero, btn.dataset.skill);
      if (result.success) {
        engine.save(true);
        openHeroPanel();
      } else {
        toast(result.error, 'bad');
      }
    };
  });

  document.getElementById('hero-done').onclick = closeModal;
}

// ============================================================
// INBOX
// ============================================================

function openInbox(filterType = null) {
  const modal = document.getElementById('modal');
  const mbg = document.getElementById('mbg');
  const inbox = engine.state.inbox || [];

  const TABS = [
    { id: null, label: '📬 All' },
    { id: MSG_TYPES.BATTLE, label: '⚔️ Battles' },
    { id: MSG_TYPES.CONSTRUCTION, label: '🔨 Builds' },
    { id: MSG_TYPES.SYSTEM, label: '📢 System' },
  ];

  const unread = MessageSystem.unreadCount(inbox);
  let html = `<h2>📨 Inbox ${unread > 0 ? `<span style="font-size:13px;color:#c83a3a">(${unread} unread)</span>` : ''}</h2>`;

  // Tabs
  html += '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">';
  for (const tab of TABS) {
    const active = filterType === tab.id;
    html += `<button class="${active ? 'matk' : 'mclose'}" style="flex:1;padding:5px;font-size:11px" data-tab="${tab.id ?? ''}">${tab.label}</button>`;
  }
  html += '</div>';

  if (unread > 0) {
    html += '<div style="text-align:right;margin-bottom:6px"><button class="mclose" id="mark-all-read" style="font-size:10px;padding:3px 8px">Mark all read</button></div>';
  }

  const messages = MessageSystem.filter(inbox, filterType);

  if (messages.length === 0) {
    html += '<div style="color:#cdb78f;text-align:center;padding:20px">No messages</div>';
  } else {
    for (const msg of messages.slice(0, 30)) {
      const time = new Date(msg.timestamp).toLocaleString();
      const isRead = msg.read;
      html += `<div class="urow" style="${!isRead ? 'border-color:#c8942e' : ''}" data-msg="${msg.id}">
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between">
            <b style="color:${isRead ? '#cdb78f' : 'var(--gold)'}">${msg.subject}</b>
            <span style="font-size:9px;color:#888">${time}</span>
          </div>
          <div class="uc" style="white-space:pre-line;margin-top:3px">${msg.body}</div>
        </div>
        <button class="ubtn" style="padding:3px 7px;font-size:10px;align-self:flex-start" data-del="${msg.id}">🗑</button>
      </div>`;
    }
  }

  html += '<div class="mfoot"><button class="mclose" id="inbox-done">Close</button></div>';
  modal.innerHTML = html;
  mbg.style.display = 'flex';

  // Tab clicks
  modal.querySelectorAll('[data-tab]').forEach(btn => {
    btn.onclick = () => {
      const t = btn.dataset.tab || null;
      openInbox(t === '' ? null : t);
    };
  });

  // Mark all read
  const marBtn = document.getElementById('mark-all-read');
  if (marBtn) {
    marBtn.onclick = () => {
      MessageSystem.markAllRead(engine.state.inbox || []);
      engine.save(true);
      refreshHUD();
      openInbox(filterType);
    };
  }

  // Mark read on hover, delete buttons
  modal.querySelectorAll('[data-msg]').forEach(row => {
    row.onclick = () => {
      MessageSystem.markRead(engine.state.inbox || [], +row.dataset.msg);
      engine.save(true);
      refreshHUD();
    };
  });
  modal.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      MessageSystem.delete(engine.state.inbox || [], +btn.dataset.del);
      engine.save(true);
      refreshHUD();
      openInbox(filterType);
    };
  });

  document.getElementById('inbox-done').onclick = closeModal;
}

// ============================================================
// QUESTS PANEL
// ============================================================

function openQuestsPanel(filterType = null) {
  const modal = document.getElementById('modal');
  const mbg = document.getElementById('mbg');
  const completedSet = new Set(engine.state.questsCompleted || []);

  const TABS = [
    { id: null, label: '📜 All' },
    { id: QUEST_TYPES.STORY, label: '📖 Story' },
    { id: QUEST_TYPES.DAILY, label: '☀️ Daily' },
    { id: QUEST_TYPES.ACHIEVEMENT, label: '🏆 Achievements' },
  ];

  let html = '<h2>📜 Quests</h2>';

  // Tabs
  html += '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">';
  for (const tab of TABS) {
    const active = filterType === tab.id;
    html += `<button class="${active ? 'matk' : 'mclose'}" style="flex:1;padding:5px;font-size:11px" data-qtab="${tab.id ?? ''}">${tab.label}</button>`;
  }
  html += '</div>';

  const quests = Object.values(QUEST_DEFS).filter(q => {
    if (filterType && q.type !== filterType) return false;
    // Show available + completed, hide locked (prereqs not met)
    if (completedSet.has(q.id)) return true;
    if (q.requires && !q.requires.every(r => completedSet.has(r))) return false;
    return true;
  });

  if (quests.length === 0) {
    html += '<div style="color:#cdb78f;text-align:center;padding:20px">No quests available</div>';
  }

  for (const q of quests) {
    const done = completedSet.has(q.id);
    const met = q.condition(engine.state);
    const rewardStr = Object.entries(q.reward || {}).map(([r, v]) => `+${v} ${r}`).join(', ');

    html += `<div class="urow" style="${done ? 'opacity:0.5' : ''}">
      <span class="ug">${q.gi}</span>
      <div class="ut" style="flex:1">
        <b style="color:${done ? '#7bc043' : 'var(--gold)'}">${q.title} ${done ? '✔' : met ? '✅' : ''}</b>
        <div class="uc">${q.desc}</div>
        ${rewardStr ? `<div class="uc" style="color:#f2c14e">🎁 ${rewardStr}${q.xp ? ` · +${q.xp} XP` : ''}</div>` : ''}
      </div>
    </div>`;
  }

  html += '<div class="mfoot"><button class="mclose" id="quests-done">Close</button></div>';
  modal.innerHTML = html;
  mbg.style.display = 'flex';

  modal.querySelectorAll('[data-qtab]').forEach(btn => {
    btn.onclick = () => {
      const t = btn.dataset.qtab || null;
      openQuestsPanel(t === '' ? null : t);
    };
  });

  document.getElementById('quests-done').onclick = closeModal;
}

// ============================================================
// WORLD MAP
// ============================================================

function showWorldMap() {
  engine.state.view = 'world';
  document.getElementById('worldmap').style.display = 'flex';
  renderWorldMap();
}

function hideWorldMap() {
  engine.state.view = 'castle';
  document.getElementById('worldmap').style.display = 'none';
}

function renderWorldMap() {
  const field = document.getElementById('wmField');
  field.innerHTML = '';

  // Terrain blobs
  const terrains = [
    ['#4a86b8', 18, 70, 160],
    ['#4a86b8', 86, 40, 120],
    ['#3a7a3a', 40, 82, 150],
    ['#3a7a3a', 78, 82, 120],
    ['#9a8a6a', 50, 12, 140],
  ];

  terrains.forEach(([color, x, y, size]) => {
    const div = document.createElement('div');
    div.className = 'wm-terr';
    div.style.background = color;
    div.style.width = size + 'px';
    div.style.height = size * 0.7 + 'px';
    div.style.left = x + '%';
    div.style.top = y + '%';
    div.style.transform = 'translate(-50%,-50%)';
    field.appendChild(div);
  });

  // Your castle
  const castleDiv = document.createElement('div');
  castleDiv.className = 'wm-node castle';
  castleDiv.style.left = '50%';
  castleDiv.style.top = '50%';
  castleDiv.innerHTML = '<div class="badge">🏰</div><div class="lbl">Your Keep</div>';
  field.appendChild(castleDiv);

  // Targets
  for (const node of engine.state.world) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'wm-node' + (node.owned ? ' owned' : '');
    nodeDiv.style.left = node.x + '%';
    nodeDiv.style.top = node.y + '%';
    nodeDiv.innerHTML = `
      <div class="badge">${node.icon}</div>
      <div class="lbl">${node.name}</div>
      <div class="str">${node.owned ? '✔ Yours' : '⚔ ' + node.strength}</div>
    `;
    nodeDiv.onclick = () => openAttackModal(node);
    field.appendChild(nodeDiv);
  }
}

function openAttackModal(node) {
  const power = engine.getArmyPower();
  const canWin = power >= node.strength;

  const modal = document.getElementById('modal');
  const mbg = document.getElementById('mbg');

  let html = `<h2>${node.icon} ${node.name}</h2>`;

  if (node.owned) {
    html += `<div class="sub">This outpost is already yours. It sends you ${Object.entries(node.income)
      .map(([r, v]) => `+${v} ${r}/tick`)
      .join(', ')}.</div>`;
    html += '<div class="mfoot"><button class="mclose" id="attack-close">Close</button></div>';
  } else {
    html += `<div class="sub">${node.outpost ? 'Capture for permanent income.' : 'Raid for one-time loot.'}</div>`;
    html += '<div style="font-size:13px;color:#cdb78f">Enemy strength</div>';
    html += '<div class="bar"><i style="width:100%;background:linear-gradient(90deg,#c83a3a,#7a1a1a)"></i></div>';
    html += `<div style="display:flex;justify-content:flex-end;font-size:13px;margin:-4px 0 8px"><b style="color:#f2c14e">${node.strength}</b></div>`;
    html += '<div style="font-size:13px;color:#cdb78f">Your army power</div>';
    const progressPercent = Math.min(100, (power / Math.max(node.strength, power)) * 100);
    html += `<div class="bar"><i style="width:${progressPercent}%;background:linear-gradient(90deg,#7bc043,#3a7a1e)"></i></div>`;
    html += `<div style="display:flex;justify-content:space-between;font-size:13px;margin:-4px 0 2px">
      <span style="color:#9c9">${engine.getArmyCount()} soldiers</span>
      <b style="color:#f2c14e">${power}</b>
    </div>`;
    html += `<div class="sub" style="margin-top:8px">${canWin ? '✅ You should win, but expect losses.' : '⚠️ Too weak — likely defeat.'}</div>`;
    html += '<div class="mfoot"><button class="mclose" id="attack-cancel">Cancel</button><button class="matk" id="attack-go">⚔️ Attack</button></div>';
  }

  modal.innerHTML = html;
  mbg.style.display = 'flex';

  const closeBtn = document.getElementById('attack-close') || document.getElementById('attack-cancel');
  if (closeBtn) closeBtn.onclick = closeModal;

  const attackBtn = document.getElementById('attack-go');
  if (attackBtn) {
    attackBtn.onclick = () => {
      const result = engine.attack(node.id);
      if (result.success) {
        let msg = result.result === 'victory' ? `⚔️ Victory at ${result.targetName}!` : `💀 Defeat at ${result.targetName}...`;
        if (result.xpGained) msg += ` (+${result.xpGained} XP)`;
        if (result.levelsGained > 0) msg += ` 👑 Lord levelled up!`;
        toast(msg, result.result === 'victory' ? 'good' : 'bad');
        refreshHUD();
        renderWorldMap();
        closeModal();
      }
    };
  }
}

// ============================================================
// RENDERING
// ============================================================

function render() {
  if (engine.state.view === 'castle') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3e5a22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render ground
    const lo = -MARGIN;
    const hi = GRID - 1 + MARGIN;
    for (let x = lo; x <= hi; x++) {
      for (let y = lo; y <= hi; y++) {
        drawGround(x, y);
      }
    }

    // Render hover
    if (hover && buildable(hover.x, hover.y)) {
      const tileKey = `${hover.x},${hover.y}`;
      const occupied = !!engine.state.tiles[tileKey] || engine.construction.queue.some(q => !q.completed && q.x === hover.x && q.y === hover.y);
      const placing = selected && selected !== 'demolish';
      let color = 'rgba(255,255,255,.25)';

      if (placing) {
        color = occupied || !canAffordBuilding(selected) ? 'rgba(212,84,58,.5)' : 'rgba(123,192,67,.55)';
      }

      if (selected === 'demolish') {
        color = occupied ? 'rgba(212,84,58,.5)' : 'rgba(255,255,255,.12)';
      }

      const { sx, sy } = tileToScreen(hover.x, hover.y);
      drawDiamond(sx, sy);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Render buildings
    const objects = [];

    // Outer features
    for (let x = lo; x <= hi; x++) {
      for (let y = lo; y <= hi; y++) {
        if (!inGrid(x, y) && ringOut(x, y) >= 2) {
          objects.push({ x, y, kind: 'feat' });
        }
      }
    }

    // Perimeter
    for (const p of perim) {
      objects.push({ x: p.x, y: p.y, kind: 'perim', type: p.type });
    }

    // Buildings (placed)
    for (const k in engine.state.tiles) {
      const [x, y] = k.split(',').map(Number);
      objects.push({ x, y, kind: 'bld', type: engine.state.tiles[k].type });
    }

    // Under-construction scaffolds
    for (const item of engine.construction.queue) {
      if (item.completed) continue;
      if (engine.state.tiles[`${item.x},${item.y}`]) continue; // already placed (upgrade)
      const progress = item.duration > 0 ? Math.min(1, (Date.now() - item.startTime) / item.duration) : 0;
      objects.push({ x: item.x, y: item.y, kind: 'scaffold', type: item.buildingType, progress });
    }

    // Sort and render
    objects.sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.x - b.x);

    for (const o of objects) {
      if (o.kind === 'feat') {
        drawOuterFeature(o.x, o.y);
      } else if (o.kind === 'perim') {
        const def = o.type === 'gate' ? { shape: 'gate', h: 34 } : { shape: 'pwall', h: 24 };
        drawBuilding(o.x, o.y, def);
      } else if (o.kind === 'scaffold') {
        const def = BUILDINGS[o.type];
        if (def) drawScaffold(o.x, o.y, def, o.progress);
      } else {
        const def = BUILDINGS[o.type];
        if (def) drawBuilding(o.x, o.y, def);
      }
    }
  }

  requestAnimationFrame(render);
}

// Draw an under-construction scaffold at tile x,y with progress 0..1
function drawScaffold(x, y, def, progress) {
  const { sx, sy } = tileToScreen(x, y);
  if (!onScreen(sx, sy)) return;
  const cx = sx;
  const baseY = sy + TILE_H;
  const w = TILE_W * 0.44;

  // Ground shadow
  groundShadow(cx, baseY, w * 0.95);

  // Draw partial building clipped to progress
  const buildH = Math.max(4, Math.ceil(def.h * progress));
  ctx.save();
  // Clip to only show progress portion from bottom
  ctx.beginPath();
  ctx.rect(cx - TILE_W, baseY - buildH - 2, TILE_W * 2, buildH + 2);
  ctx.clip();
  ctx.globalAlpha = 0.55;
  drawBuilding(x, y, def);
  ctx.restore();

  // Wooden scaffold poles
  ctx.save();
  ctx.strokeStyle = '#8a6030';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.85;
  const poles = [
    [cx - w, baseY],
    [cx + w, baseY],
    [cx - w * 0.5, baseY - TILE_H * 0.25],
    [cx + w * 0.5, baseY - TILE_H * 0.25],
  ];
  for (const [px, py] of poles) {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - def.h * 0.9);
    ctx.stroke();
  }
  // Cross-beams
  ctx.beginPath();
  ctx.moveTo(cx - w, baseY - def.h * 0.3);
  ctx.lineTo(cx + w, baseY - def.h * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w, baseY - def.h * 0.65);
  ctx.lineTo(cx + w, baseY - def.h * 0.65);
  ctx.stroke();
  ctx.restore();

  // Progress label above
  const pct = Math.round(progress * 100);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#2a1808';
  ctx.beginPath();
  ctx.roundRect(cx - 20, baseY - def.h - 22, 40, 14, 3);
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.font = 'bold 9px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(pct + '%', cx, baseY - def.h - 11);
  ctx.restore();
}

function drawDiamond(sx, sy) {
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2);
  ctx.lineTo(sx, sy + TILE_H);
  ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2);
  ctx.closePath();
}

function drawGround(gx, gy) {
  const { sx, sy } = tileToScreen(gx, gy);
  if (!onScreen(sx, sy)) return;

  const n = noise(gx, gy);

  if (inGrid(gx, gy)) {
    const g = n > 0.78 ? '#7aab3e' : n > 0.4 ? '#8ec24a' : '#86bb43';
    drawDiamond(sx, sy);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,90,30,.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (n > 0.6) {
      ctx.strokeStyle = '#6f9a35';
      ctx.lineWidth = 1.3;
      const tx = sx + (n - 0.5) * 26;
      const ty = sy + (TILE_H * 0.55);
      for (let i = -1; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(tx + i * 3, ty);
        ctx.lineTo(tx + i * 3 + i * 2, ty - 5);
        ctx.stroke();
      }
    }
    return;
  }

  const ro = ringOut(gx, gy);

  if (ro === 1) {
    // Moat water
    drawDiamond(sx, sy);
    const t = Date.now() / 900 + gx * 0.6 + gy * 0.4;
    const c = Math.floor(20 * Math.sin(t));
    ctx.fillStyle = shade('#2f6db0', c);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx - 12, sy + (TILE_H * 0.5) + Math.sin(t) * 2);
    ctx.lineTo(sx + 12, sy + (TILE_H * 0.5) + Math.cos(t) * 2);
    ctx.stroke();
  } else {
    // Outer land
    const g = n > 0.7 ? '#6f9a35' : '#79a83c';
    drawDiamond(sx, sy);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(50,80,25,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawBuilding(x, y, def) {
  const { sx, sy } = tileToScreen(x, y);
  const cx = sx;
  const baseY = sy + TILE_H;
  const w = (TILE_W * 0.44);

  if (!onScreen(sx, sy)) return;

  groundShadow(cx, baseY, w * 0.95);

  switch (def.shape) {
    case 'tree': {
      ctx.fillStyle = '#5a3a1e';
      ctx.fillRect(cx - 3, baseY - 16, 6, 16);
      for (let i = 0; i < 3; i++) {
        const fy = baseY - 16 - i * 12;
        const fw = 20 - i * 4;
        ctx.beginPath();
        ctx.fillStyle = shade(def.roof, i * 9 - 4);
        ctx.moveTo(cx, fy - fw);
        ctx.lineTo(cx + fw, fy);
        ctx.lineTo(cx, fy + fw * 0.55);
        ctx.lineTo(cx - fw, fy);
        ctx.closePath();
        ctx.fill();
      }
      return;
    }

    case 'wall': {
      const b = isoBox(cx, baseY, w, def.h, def.body);
      battlements(b, def.body);
      stoneCourses(cx, baseY, w, def.h, 3);
      return;
    }

    case 'tower': {
      const b = isoBox(cx, baseY, w * 0.74, def.h, def.body);
      battlements(b, def.body);
      stoneCourses(cx, baseY, w * 0.74, def.h, 5);
      flag(cx, b.TB.y - 6, '#c83a3a');
      return;
    }

    case 'pwall': {
      const b = isoBox(cx, baseY, w * 0.92, def.h, '#9a948a');
      battlements(b, '#9a948a');
      stoneCourses(cx, baseY, w * 0.92, def.h, 3);
      return;
    }

    case 'gate': {
      isoBox(cx - w * 0.7, baseY, w * 0.34, def.h, '#8a847a');
      isoBox(cx + w * 0.7, baseY, w * 0.34, def.h, '#8a847a');
      const b = isoBox(cx, baseY, w * 0.55, def.h * 0.7, '#9a948a');
      battlements(b, '#9a948a');
      ctx.fillStyle = 'rgba(20,12,4,.8)';
      ctx.beginPath();
      ctx.moveTo(cx - 1, baseY - 2);
      ctx.lineTo(cx - 12, baseY - (TILE_H * 0.2) - 2);
      ctx.lineTo(cx - 12, baseY - 22);
      ctx.quadraticCurveTo(cx - 1, baseY - 30, cx - 1, baseY - 22);
      ctx.closePath();
      ctx.fill();
      flag(cx - w * 0.7, baseY - (TILE_H * 0.23) - def.h, '#3c5fa0');
      flag(cx + w * 0.7, baseY - (TILE_H * 0.23) - def.h, '#3c5fa0');
      return;
    }

    case 'keep': {
      isoBox(cx - w * 0.6, baseY, w * 0.4, def.h * 0.7, shade(def.body, -6));
      isoBox(cx + w * 0.6, baseY, w * 0.4, def.h * 0.7, shade(def.body, -6));
      const b = isoBox(cx, baseY, w * 0.8, def.h, def.body);
      battlements(b, def.body);
      const ap = hipRoof(cx, baseY, b, def.roof, 22);
      flag(ap.x, ap.y, '#3c5fa0');
      return;
    }

    case 'mill': {
      const b = isoBox(cx, baseY, w * 0.5, def.h, def.body);
      hipRoof(cx, baseY, b, def.roof, 12);
      ctx.save();
      ctx.translate(cx, baseY - def.h * 0.65);
      ctx.strokeStyle = '#4a3018';
      ctx.lineWidth = 3;
      ctx.fillStyle = '#efe2c0';
      const rot = Date.now() / 1400;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2 + (i === 0 ? rot : 0));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -22);
        ctx.stroke();
        ctx.fillRect(-5, -22, 9, 12);
      }
      ctx.restore();
      return;
    }

    case 'quarry': {
      const b = isoBox(cx, baseY, w * 0.9, def.h, def.body);
      ctx.fillStyle = shade(def.body, -30);
      for (let i = 0; i < 5; i++) {
        const a = noise(x + i, y);
        ctx.beginPath();
        ctx.arc(cx + (a - 0.5) * w, b.TB.y + (TILE_H * 0.2) - noise(i, x) * 8, 5 + a * 4, 0, 7);
        ctx.fill();
      }
      return;
    }

    case 'farm': {
      const b = isoBox(cx, baseY, w, def.h * 0.5, def.body);
      ctx.strokeStyle = shade(def.body, -40);
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 5, baseY - def.h * 0.5 - (TILE_H * 0.1));
        ctx.lineTo(cx + i * 5 + 10, baseY - def.h * 0.5 - (TILE_H * 0.1) - 5);
        ctx.stroke();
      }
      const bb = isoBox(cx - w * 0.4, baseY, w * 0.32, def.h * 0.9, '#9a5a3a');
      hipRoof(cx - w * 0.4, baseY, bb, '#6a2a1e', 10);
      return;
    }

    default: {
      const b = isoBox(cx, baseY, w * 0.78, def.h, def.body);
      hipRoof(cx, baseY, b, def.roof, def.h > 30 ? 16 : 13);
      ctx.strokeStyle = shade(def.body, -50);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, baseY);
      ctx.lineTo(cx, baseY - def.h);
      ctx.stroke();
      ctx.fillStyle = '#3a2c14';
      ctx.fillRect(cx - 8, baseY - def.h * 0.55, 5, 7);
      ctx.fillStyle = '#f2d98a';
      ctx.fillRect(cx - 7, baseY - def.h * 0.55 + 1, 3, 2);
      ctx.fillStyle = 'rgba(30,18,6,.7)';
      ctx.beginPath();
      ctx.moveTo(cx - 1, baseY - 2);
      ctx.lineTo(cx - 9, baseY - (TILE_H * 0.18) - 2);
      ctx.lineTo(cx - 9, baseY - (TILE_H * 0.18) - 12);
      ctx.lineTo(cx - 1, baseY - 12);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawOuterFeature(gx, gy) {
  const n = noise(gx * 3, gy * 3);
  const { sx, sy } = tileToScreen(gx, gy);

  if (!onScreen(sx, sy)) return;

  const cx = sx;
  const baseY = sy + TILE_H;

  if (n > 0.86) {
    groundShadow(cx, baseY, 12);
    ctx.fillStyle = '#4a3018';
    ctx.fillRect(cx - 2, baseY - 12, 4, 12);
    for (let i = 0; i < 3; i++) {
      const fy = baseY - 12 - i * 9;
      const fw = 14 - i * 3;
      ctx.beginPath();
      ctx.fillStyle = shade('#2f7a3a', i * 8 - 2);
      ctx.moveTo(cx, fy - fw);
      ctx.lineTo(cx + fw, fy);
      ctx.lineTo(cx, fy + fw * 0.55);
      ctx.lineTo(cx - fw, fy);
      ctx.closePath();
      ctx.fill();
    }
  } else if (n > 0.74) {
    groundShadow(cx, baseY, 9);
    ctx.fillStyle = '#8a847a';
    ctx.beginPath();
    ctx.arc(cx, baseY - 5, 7, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#a8a298';
    ctx.beginPath();
    ctx.arc(cx - 2, baseY - 7, 4, 0, 7);
    ctx.fill();
  }
}

// Helper rendering functions
function groundShadow(cx, baseY, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,30,10,.22)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 1, r, r * 0.5, 0, 0, 7);
  ctx.fill();
  ctx.restore();
}

function isoBox(cx, baseY, w, h, body) {
  const lo = (TILE_H * 0.23);
  const hi = (TILE_H * 0.46);
  const left = shade(body, -46);
  const right = shade(body, -22);
  const top = shade(body, 16);

  const TL = { x: cx - w, y: baseY - lo - h };
  const TR = { x: cx + w, y: baseY - lo - h };
  const TB = { x: cx, y: baseY - hi - h };
  const TF = { x: cx, y: baseY - h };

  ctx.fillStyle = left;
  ctx.beginPath();
  ctx.moveTo(cx - w, baseY - lo);
  ctx.lineTo(cx, baseY);
  ctx.lineTo(TF.x, TF.y);
  ctx.lineTo(TL.x, TL.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(cx + w, baseY - lo);
  ctx.lineTo(cx, baseY);
  ctx.lineTo(TF.x, TF.y);
  ctx.lineTo(TR.x, TR.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(TB.x, TB.y);
  ctx.lineTo(TR.x, TR.y);
  ctx.lineTo(TF.x, TF.y);
  ctx.lineTo(TL.x, TL.y);
  ctx.closePath();
  ctx.fill();

  return { TL, TR, TB, TF, w, h, lo, hi };
}

function hipRoof(cx, baseY, b, roof, rH = 16) {
  const apex = { x: cx, y: b.TB.y - rH };

  ctx.fillStyle = shade(roof, -26);
  ctx.beginPath();
  ctx.moveTo(b.TL.x, b.TL.y);
  ctx.lineTo(b.TB.x, b.TB.y);
  ctx.lineTo(apex.x, apex.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shade(roof, -8);
  ctx.beginPath();
  ctx.moveTo(b.TR.x, b.TR.y);
  ctx.lineTo(b.TB.x, b.TB.y);
  ctx.lineTo(apex.x, apex.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shade(roof, 12);
  ctx.beginPath();
  ctx.moveTo(b.TL.x, b.TL.y);
  ctx.lineTo(b.TF.x, b.TF.y);
  ctx.lineTo(apex.x, apex.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shade(roof, 2);
  ctx.beginPath();
  ctx.moveTo(b.TR.x, b.TR.y);
  ctx.lineTo(b.TF.x, b.TF.y);
  ctx.lineTo(apex.x, apex.y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = shade(roof, -34);
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(b.TL.x, b.TL.y + (apex.y - b.TL.y) * t);
    ctx.lineTo(b.TF.x, b.TF.y + (apex.y - b.TF.y) * t);
    ctx.lineTo(b.TR.x, b.TR.y + (apex.y - b.TR.y) * t);
    ctx.stroke();
  }

  return apex;
}

function battlements(b, col) {
  ctx.fillStyle = shade(col, 8);
  const p = [b.TL, b.TF, b.TR, b.TB];
  for (let s = 0; s < 4; s++) {
    const a = p[s];
    const c = p[(s + 1) % 4];
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      ctx.fillRect(a.x + (c.x - a.x) * t - 3, a.y + (c.y - a.y) * t - 6, 6, 6);
    }
  }
}

function flag(x, y, col) {
  ctx.strokeStyle = '#2a1c0c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 18);
  ctx.stroke();

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x + 14, y - 14);
  ctx.lineTo(x, y - 9);
  ctx.closePath();
  ctx.fill();
}

function stoneCourses(cx, baseY, w, h, n) {
  ctx.strokeStyle = 'rgba(40,30,20,.3)';
  ctx.lineWidth = 1;
  for (let i = 1; i < n; i++) {
    const yy = baseY - (h * i) / n;
    ctx.beginPath();
    ctx.moveTo(cx - w, yy - (TILE_H * 0.23));
    ctx.lineTo(cx, yy);
    ctx.lineTo(cx + w, yy - (TILE_H * 0.23));
    ctx.stroke();
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function tileToScreen(x, y) {
  return {
    sx: engine.state.cam.x + (x - y) * (TILE_W / 2),
    sy: engine.state.cam.y + (x + y) * (TILE_H / 2),
  };
}

function screenToTile(px, py) {
  const dx = px - engine.state.cam.x;
  const dy = py - engine.state.cam.y;
  return {
    x: Math.floor((dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2),
    y: Math.floor((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2),
  };
}

function inGrid(x, y) {
  return x >= 0 && y >= 0 && x < GRID && y < GRID;
}

function buildable(x, y) {
  return inGrid(x, y) && !isEdge(x, y);
}

function isEdge(x, y) {
  return x === 0 || y === 0 || x === GRID - 1 || y === GRID - 1;
}

function isGate(x, y) {
  return x === GATE.x && y === GATE.y;
}

function ringOut(gx, gy) {
  const ox = gx < 0 ? -gx : gx > GRID - 1 ? gx - (GRID - 1) : 0;
  const oy = gy < 0 ? -gy : gy > GRID - 1 ? gy - (GRID - 1) : 0;
  return Math.max(ox, oy);
}

function onScreen(sx, sy) {
  return sx > -(TILE_W * 2) && sx < canvas.width + (TILE_W * 2) && sy > -(TILE_H * 6) && sy < canvas.height + (TILE_H * 3);
}

function shade(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + a;
  let g = ((n >> 8) & 255) + a;
  let b = (n & 255) + a;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function noise(x, y) {
  let n = ((x + 200) * 374761393 + (y + 200) * 668265263) >>> 0;
  n = ((n ^ (n >> 13)) * 1274126177) >>> 0;
  return ((n >>> 0) % 1000) / 1000;
}

function buildPerimeter() {
  perim = [];
  const seen = {};
  for (let i = 0; i < GRID; i++) {
    const coords = [
      [i, 0],
      [i, GRID - 1],
      [0, i],
      [GRID - 1, i],
    ];
    for (const [x, y] of coords) {
      const k = `${x},${y}`;
      if (seen[k]) continue;
      seen[k] = 1;
      perim.push({ x, y, type: isGate(x, y) ? 'gate' : 'pwall' });
    }
  }
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function centerCamera() {
  resize();
  engine.state.cam.x = canvas.width / 2;
  engine.state.cam.y = canvas.height / 2 - (GRID * TILE_H) / 2 + 30;
  engine.state.cam.set = true;
}

function buildToolBar() {
  const bar = document.getElementById('buildbar');
  bar.innerHTML = '';

  for (const type of TOOLS) {
    const def = BUILDINGS[type];
    const btn = document.createElement('div');
    btn.className = 'btn';
    btn.dataset.type = type;

    let cost = '';
    if (def.baseCost) {
      for (const r in def.baseCost) {
        cost += `<b>${def.baseCost[r]}</b>${resourceIcon(r)} `;
      }
    }
    if (def.needsWorker) cost += '👤';

    btn.innerHTML = `
      <div class="gi">${def.gi}</div>
      <div class="nm">${def.name}</div>
      <div class="cost">${cost || '&nbsp;'}</div>
    `;

    btn.onclick = () => selectTool(type);
    bar.appendChild(btn);
  }

  // Demolish tool
  const demolish = document.createElement('div');
  demolish.className = 'btn tool';
  demolish.dataset.type = 'demolish';
  demolish.innerHTML = '<div class="gi">💥</div><div class="nm">Demolish</div><div class="cost">+50% back</div>';
  demolish.onclick = () => selectTool('demolish');
  bar.appendChild(demolish);
}

function selectTool(type) {
  selected = selected === type ? null : type;
  document.querySelectorAll('#buildbar .btn').forEach((e) => e.classList.toggle('sel', e.dataset.type === selected));
  canvas.classList.toggle('placing', !!selected);
  document.getElementById('hint').style.display = selected ? 'block' : 'none';
  closeSelPanel();
}

function canAffordBuilding(type) {
  const def = BUILDINGS[type];
  if (!def) return false;

  const cost = ConstructionSystem.getCost(def, 1);
  for (const r in cost) {
    if ((engine.state.res[r] || 0) < cost[r]) return false;
  }

  if (def.needsWorker) {
    const stats = engine.getStats();
    if (stats.popUsed + def.needsWorker > stats.popCap) return false;
  }

  return true;
}

// ============================================================
// INPUT HANDLING
// ============================================================

let drag = null;
let moved = false;

function getEventPos(e) {
  const rect = canvas.getBoundingClientRect();
  const p = e.touches ? e.touches[0] : e;
  return { x: p.clientX - rect.left, y: p.clientY - rect.top };
}

canvas.addEventListener('mousemove', (e) => {
  const p = getEventPos(e);
  hover = screenToTile(p.x, p.y);
  if (drag) {
    moved = true;
    engine.state.cam.x = drag.cx + (p.x - drag.px);
    engine.state.cam.y = drag.cy + (p.y - drag.py);
  }
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2) return;
  const p = getEventPos(e);
  drag = { px: p.x, py: p.y, cx: engine.state.cam.x, cy: engine.state.cam.y };
  moved = false;
  canvas.classList.add('dragging');
});

window.addEventListener('mouseup', (e) => {
  canvas.classList.remove('dragging');
  if (!drag) return;
  const wd = moved;
  drag = null;
  if (wd) return;
  const p = getEventPos(e);
  const t = screenToTile(p.x, p.y);
  if (!inGrid(t.x, t.y)) return;
  if (selected === 'demolish') demolishBuilding(t.x, t.y);
  else if (selected) tryPlaceBuilding(t.x, t.y);
  else engine.state.tiles[`${t.x},${t.y}`] ? openSelPanel(t.x, t.y) : closeSelPanel();
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  selectTool(selected);
});

canvas.addEventListener('touchstart', (e) => {
  const p = getEventPos(e);
  drag = { px: p.x, py: p.y, cx: engine.state.cam.x, cy: engine.state.cam.y };
  moved = false;
});

canvas.addEventListener('touchmove', (e) => {
  const p = getEventPos(e);
  hover = screenToTile(p.x, p.y);
  if (drag) {
    moved = true;
    engine.state.cam.x = drag.cx + (p.x - drag.px);
    engine.state.cam.y = drag.cy + (p.y - drag.py);
  }
});

canvas.addEventListener('touchend', () => {
  if (drag && !moved) {
    const t = screenToTile(drag.px, drag.py);
    if (inGrid(t.x, t.y)) {
      if (selected === 'demolish') demolishBuilding(t.x, t.y);
      else if (selected) tryPlaceBuilding(t.x, t.y);
      else engine.state.tiles[`${t.x},${t.y}`] ? openSelPanel(t.x, t.y) : closeSelPanel();
    }
  }
  drag = null;
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.getElementById('mbg').style.display === 'flex') closeModal();
    else if (engine.state.view === 'world') hideWorldMap();
    else if (selected) selectTool(selected);
    else closeSelPanel();
  }
});

// ============================================================
// BUTTONS
// ============================================================

document.getElementById('saveBtn').onclick = () => {
  const result = engine.save();
  if (result.success) toast(result.message, 'good');
  else toast(result.message, 'bad');
};

document.getElementById('resetBtn').onclick = () => {
  if (confirm('Raze your empire and start over?')) {
    engine.reset();
    centerCamera();
    refreshHUD();
    hideWorldMap();
    toast('New empire founded!', 'good');
  }
};

document.getElementById('recruitBtn').onclick = openRecruitMenu;
document.getElementById('worldBtn').onclick = showWorldMap;
document.getElementById('researchBtn').onclick = openResearchMenu;
document.getElementById('heroBtn').onclick = openHeroPanel;
document.getElementById('inboxBtn').onclick = openInbox;
document.getElementById('questsBtn').onclick = openQuestsPanel;
document.getElementById('wmRecruit').onclick = openRecruitMenu;
document.getElementById('wmBack').onclick = hideWorldMap;

// ============================================================
// START
// ============================================================

export { init };

window.addEventListener('resize', resize);
