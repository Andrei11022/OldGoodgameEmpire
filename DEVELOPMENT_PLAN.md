Free Empire — Development Plan
===============================

Purpose
-------
This document records the project's high-level design, phased roadmap, and the full feature/script provided by the lead designer. It locks the vision and rules so we don't deviate while implementing the modular modernization.

Important Rules
----------------
- Never break existing mechanics.
- Refactor when necessary instead of adding hacks.
- Every new feature must integrate with the existing save system.
- Every system must be modular.
- Avoid duplicated code.
- Write production-quality JavaScript.
- Preserve performance.
- Whenever a feature requires new UI, make it consistent with the medieval theme already used in the game.

Core Features & Requirements (canonical script)
-----------------------------------------------
1. BUILDING LEVELS
- Replace the current "spam more buildings" system.
- Every production building should be upgradeable up to Level 20.
- Each level increases production, upgrade cost, and upgrade duration.
- Buildings should visually improve with every few levels.
- Add an Upgrade button inside the building window.

2. CONSTRUCTION TIMERS
- Nothing finishes instantly anymore: placement, upgrades, walls, castle expansions, barracks upgrades, etc. all take time.
- Example durations: House 15s, Farm 30s, Barracks 2m, Castle L5 30m.
- Show progress bars, remaining time, queue status, and construction animation.

3. CASTLE LEVEL SYSTEM
- Player starts with a Small Wooden Keep (Castle Level 1).
- Castle levels unlock map expansion, new building slots, new buildings, changed graphics, increased storage, population, and prestige.
- Levels progression example up to Royal Castle.

4. CASTLE EXPANSIONS
- Allow purchasing new land; expansions cost resources and time; increase map size and buildable area; multiple expansion rings supported.

5. WALL SYSTEM
- Walls become individual upgradeable objects with levels from palisade → royal wall; affect appearance, health, defense, and construction time.

6. MESSAGE SYSTEM
- Add Inbox with tabs: Battle Reports, Player Messages, System Messages, Construction Finished, Scout Reports.
- Messages support subject, body, timestamp, read/unread, delete.

7. BATTLE REPORTS
- Every battle creates a report with attacker, defender, army sizes, casualties, loot, winner, time.

8. TECHNOLOGY TREE
- Research building and timed research for upgrades (e.g., Faster Woodcutting, Masonry, Agriculture, Military Training, Castle Engineering, Economy).

9. HERO SYSTEM
- Create a Lord/Hero with level, XP, equipment, skills that affect attack, defense, gathering, construction speed.

10. QUEST SYSTEM
- Daily, story, and achievement quests with rewards (gold, resources, gems, XP).

11. WORLD MAP
- Replace static targets with procedurally generated kingdoms: neutral castles, bandits, villages, players, ruins, trade towns.
- Each location has strength, loot, owner, distance, travel time.

12. ARMY TRAVEL
- Armies travel with time; states: Marching, Attacking, Returning, Stationed.

13. BUILDING MENU
- Buildings should display level, production, upgrade cost, upgrade duration, description, requirements, worker usage, storage.

14. ECONOMY
- Food consumption, worker happiness, tax rate, gold upkeep, population growth.

15. NOTIFICATIONS
- Popup notifications for construction finished, research complete, attack incoming, message received, resources full.

16. PRESTIGE
- Prestige points earned from castle level, victories, decorations, research; unlock cosmetic upgrades.

17. DECORATIONS
- Gardens, flags, statues, roads, trees, fountains; increase prestige.

18. SAVE SYSTEM
- Extend save data to include building levels, construction timers, messages, reports, hero, research, castle level, expansions, prestige, quests.

19. CODE QUALITY
- Split project into modules (buildings.js, castle.js, research.js, combat.js, messages.js, construction.js, world.js, economy.js, ui.js, save.js).
- Avoid a single giant index.html.

20. FUTURE MULTIPLAYER READY
- Design systems to be backend-connectable later. Use IDs for players, buildings, messages, armies, reports, quests. Keep systems data-driven.

Final Goal
----------
The finished game should feel like a modern browser MMO where the player slowly develops a small wooden keep into a massive medieval empire over many hours of gameplay with meaningful progression, persistent timers, construction queues, research, heroes, diplomacy, battle reports, and expandable castles.

Phased Roadmap (Phase 1 — 4)
----------------------------
Phase 1 (foundation):
- Modularize code, implement building levels (1-20) formulas, construction timers, extended save format (v4) with timers & buildingLevels, basic UI for timers and building upgrade.

Phase 2 (core gameplay):
- Castle level system, expansions, wall system, research building and tech tree, hero prototype.

Phase 3 (systems & polish):
- World map procedural generation, army travel, battle reports, message/inbox system, quests, prestige, decorations.

Phase 4 (multiplayer prep & polish):
- Backend-ready events/IDs, syncing model, anti-cheat considerations, performance profiling, UI polish and QA.

Notes
-----
- This file is the canonical development script. Implementations must reference this document before design decisions.
- Any changes to these core rules require explicit sign-off.

# ==================================================
PHASE 2 – VISUAL OVERHAUL & ASSET PIPELINE
# ==================================================

The objective of this phase is to transform the current programmer prototype into a polished medieval browser strategy game inspired by the visual quality, atmosphere and progression of classic browser strategy games.

IMPORTANT RULES
---------------
• Never break existing gameplay.
• Never remove existing systems.
• Preserve saves whenever possible.
• Every new feature must be modular.
• Never duplicate code.
• Follow the existing modular architecture.
• Continue using ES Modules.
• Performance matters.
• Mobile compatibility must remain.
• Every implemented system must be documented inside DEVELOPMENT_PLAN.md.

ART DIRECTION
-------------
The game should use ONE consistent visual style.

Art style:
• Stylized hand-painted medieval fantasy.
• 2:1 isometric perspective.
• Warm earthy color palette.
• Soft ambient baked shadows.
• Consistent sunlight from the upper-left.
• Bright, colorful medieval villages.
• Exaggerated readable silhouettes.
• Cartoon realism.
• High-quality browser MMO appearance.
• No pixel art.
• No photorealistic textures.
• Every building should appear to belong to the same world.

Whenever sprites are generated later, they must follow this exact style.

ASSET PIPELINE
--------------
Create a proper asset system.

Create folders:

```
assets/
	music/
	sfx/
	sprites/
		buildings/
		castle/
		units/
		decorations/
		ui/
	effects/
	fonts/
```

ASSET MANAGER
-------------
Create a new AssetManager module (js/assetManager.js).

Responsibilities:
• preload images
• preload sounds
• cache assets
• report loading progress
• provide placeholder assets when files are missing
• avoid loading the same asset twice
• expose simple methods:
	- AssetManager.load() — Begin preload phase, return promise
	- AssetManager.getSprite(key) — Retrieve cached sprite by key, or placeholder
	- AssetManager.getAudio(key) — Retrieve cached audio by key, or placeholder
	- AssetManager.isLoaded() — Boolean: all critical assets ready
	- AssetManager.getProgress() — Number 0–1: loading progress

The game should continue working even if artwork is missing.

SPRITE RENDERER
---------------
Replace procedural building rendering with a hybrid renderer (js/spriteRenderer.js).

Rules:
• IF a sprite exists → draw the sprite.
• IF the sprite does not exist → use the existing procedural renderer.

This allows gradual replacement of placeholder graphics without breaking the game.

Integration points:
• Integrate into main render loop in main.js
• Call SpriteRenderer.drawBuilding(ctx, x, y, buildingType, level) before procedural fallback
• Preserve all existing procedural rendering
• No change to game logic

BUILDING SPRITES
---------------
Every building should support multiple appearances.

Examples (per building type):

House:
- Level 1
- Level 5
- Level 10
- Level 20

Farm, Barracks, Market, Storehouse, Tower, Walls:
- Similar level-based progression

Appearance should improve every few levels:
• larger roofs
• stone instead of wood
• better decorations
• banners
• chimneys
• additional floors
• improved details

Sprite key naming convention:
`building_${type}_lvl${level}.png`
Example: `building_house_lvl1.png`, `building_house_lvl5.png`

CASTLE VISUAL EVOLUTION
-----------------------
Castle upgrades should become visually impressive.

Visual progression:

Wooden Keep (Level 1)
	↓
Stone Keep (Level 2)
	↓
Fortified Keep (Level 3)
	↓
Castle (Level 4)
	↓
Grand Castle (Level 5)
	↓
Royal Castle (Level 6)

Each level should visibly change:
• walls (wooden → stone → reinforced stone → iron)
• gate (simple → grand → fortified)
• courtyard (small → medium → large)
• towers (none → single → multiple)
• flags (absent → present → multiple)
• stonework (none → simple → intricate)
• decorations (minimal → moderate → elaborate)
• ground (dirt → cobblestone → paved)

Sprite key naming convention:
`castle_lvl${level}.png`
Example: `castle_lvl1.png`, `castle_lvl6.png`

ENVIRONMENT
-----------
Support decorative assets to improve immersion.

Examples:
• roads
• bridges
• flowers
• grass
• trees
• rocks
• fences
• crates
• barrels
• wells
• market stalls
• torches
• campfires
• bushes
• water

These should render as additional overlay sprites or particle effects.

ANIMATIONS
----------
Support animated sprites.

Examples:
• flags waving
• windmills rotating
• water animated
• chimneys emitting smoke
• construction scaffolding
• workers building
• trees moving slightly
• torches flickering

Implementation:
• Use sprite sheets with frame sequences
• Store frame count and timing in AssetManager metadata
• Update sprite renderer to support frame animation
• Update every render tick or on timer

Sprite key naming convention for animated assets:
`animation_${name}_frame${frameNumber}.png`
Example: `animation_flag_frame0.png`, `animation_flag_frame1.png`, etc.

VISUAL EFFECTS
--------------
Add lightweight particle effects.

Examples:
• construction dust
• upgrade sparkles
• resource collection
• battle impacts
• smoke
• fire
• gold collection

Implementation:
• Create ParticleSystem module (js/particleSystem.js)
• Render particles as simple shapes or small sprites
• Support fade-out, movement, rotation
• Pool particles for performance

Trigger effects:
• On construction start/finish
• On upgrade completion
• On resource collection
• On battle victory/defeat
• On prestige gain

MEDIEVAL UI
-----------
Upgrade the interface.

Replace temporary UI with polished medieval panels.

Improve appearance of:
• resource bar (carved wood frame, ornate text)
• construction queue (scrollable parchment-style list)
• research menu (scholar's desk aesthetic)
• hero menu (heraldic portrait frame)
• quest window (scroll/parchment)
• building window (stone-carved frame)
• castle window (royal purple/gold theme)
• message inbox (locked book/ledger aesthetic)
• tooltips (parchment with torn edges)
• buttons (carved wood with iron rivets)

Buttons should look:
• carved from wood and iron
• have shadow/depth
• show hover state (glow, slight scale)
• show active state (pressed, inset)

AUDIO SYSTEM
------------
Create AudioManager module (js/audioManager.js).

Support:
• background music
• ambient sounds
• button clicks
• construction sounds
• battle sounds
• notifications
• independent music and sound effect volume
• mute
• looping
• fade in
• fade out
• pause
• resume

The main background theme already exists.

Load it automatically from: `assets/music/theme.mp3`

Requirements:
• Loop the music continuously
• Start music only after the user's first interaction (browser autoplay compatibility)
• Add a Settings menu where the player can adjust:
	- Music Volume (0–100%)
	- SFX Volume (0–100%)
	- Mute Music (toggle)
	- Mute SFX (toggle)

API:
- AudioManager.init() — Setup audio context
- AudioManager.playMusic(path, loop=true) — Load and play background music
- AudioManager.playSFX(path) — Play one-shot sound effect
- AudioManager.stop(key) — Stop playing audio by key
- AudioManager.setMusicVolume(0–1) — Set music volume
- AudioManager.setSFXVolume(0–1) — Set SFX volume
- AudioManager.setMuted(type, bool) — Mute/unmute music or sfx

PROJECT STRUCTURE
-----------------
Continue improving the modular architecture.

Expected new modules:
```
js/
	assetManager.js      (new)
	audioManager.js      (new)
	spriteRenderer.js    (new)
	particleSystem.js    (new)
	[existing modules...]
```

Keep responsibilities separated.
Never place large systems inside main.js.
Prefer dedicated modules.

IMPLEMENTATION ORDER
--------------------
1. Update DEVELOPMENT_PLAN.md ✓
2. Create AssetManager (js/assetManager.js)
3. Create AudioManager (js/audioManager.js)
4. Automatically play assets/music/theme.mp3
5. Create SpriteRenderer (js/spriteRenderer.js)
6. Integrate SpriteRenderer with the current renderer
7. Add loading screen
8. Add loading progress bar
9. Add medieval settings menu
10. Refactor only where necessary

IMPORTANT
---------
Do NOT generate placeholder AI artwork.

Instead, build the infrastructure so that artwork can be later dropped into the assets folders and it will immediately be used by the game without additional code changes.

Preserve every existing gameplay feature while implementing these systems.

PHASE 2 IMPLEMENTATION LOG (2026-06-26)
---------------------------------------

Implemented Systems (Infrastructure Only)
----------------------------------------
1. AssetManager (`js/assetManager.js`)
- Responsibilities implemented:
	- Preload images and audio from a manifest.
	- Cache loaded assets.
	- Prevent duplicate loading (deduplicated manifest + pending request tracking).
	- Report loading progress (`getProgress()`).
	- Provide fallback placeholders for missing files.
	- Keep renderer-independent architecture.
- Public API:
	- `load(manifest)`
	- `getSprite(path)`
	- `getAudio(path)`
	- `has(path)`
	- `getProgress()`
	- `isFinished()`

2. AudioManager (`js/audioManager.js`)
- Responsibilities implemented:
	- Background music and SFX playback.
	- Looping support.
	- Fade in / fade out support.
	- Mute toggles for music and SFX.
	- Pause and resume.
	- Independent music and SFX volume controls.
	- Settings callbacks for persistence integration.

3. Audio Persistence
- Save integration updated to persist audio settings in save data:
	- `musicVolume`
	- `sfxVolume`
	- `muteMusic`
	- `muteSfx`
- Save migration/fallback behavior preserves compatibility for existing saves.

4. First-Interaction Theme Startup
- Theme asset path: `assets/music/theme.mp3`
- Behavior:
	- Preloaded by AssetManager.
	- Not auto-played on page load.
	- Starts only after first pointer interaction.
	- Loops continuously once started.

5. Medieval Settings Window
- Added settings panel with:
	- Music Volume slider.
	- SFX Volume slider.
	- Mute Music toggle.
	- Mute SFX toggle.
	- Reset Audio action.
- Audio continues while opening/closing UI panels.

6. Medieval Loading Screen
- Added startup loading overlay with:
	- “Loading Assets...” text.
	- Progress bar.
	- Percentage indicator.
- Game initialization waits for asset preload completion before main loop/render startup.

7. Asset Folder Pipeline Structure
- Created folder tree for manual asset drop-in:
	- `assets/music/`
	- `assets/sfx/`
	- `assets/sprites/buildings/`
	- `assets/sprites/castle/`
	- `assets/sprites/units/`
	- `assets/sprites/decorations/`
	- `assets/sprites/ui/`
	- `assets/effects/`
	- `assets/fonts/`

Out of Scope for This Step (Intentionally Not Implemented)
---------------------------------------------------------
- No sprite replacement or renderer refactor yet.
- No gameplay mechanic changes.
- No AI-generated placeholder artwork.

PHASE 2 STEP 5 LOG (Sprite Renderer Infrastructure)
---------------------------------------------------

1. AssetManager Registry Layer (extended)
- Added registry-driven lookup APIs so gameplay/render callers no longer depend on filename strings:
	- `AssetManager.getBuildingSprite(type, level, options)`
	- `AssetManager.getCastleSprite(level, options)`
	- `AssetManager.getWallSprite(level, options)`
	- `AssetManager.getUnitSprite(type, options)`
	- `AssetManager.getDecorationSprite(type, options)`
	- `AssetManager.getEffectSprite(type, options)`
- Added preload manifest helper:
	- `AssetManager.getPreloadManifest()`
- Added registry-aware audio helper:
	- `AssetManager.getMusicPath(name)`
- Building/castle/wall level fallback implemented:
	- If exact level sprite is missing, fallback probes nearest lower level until found.

2. SpriteRenderer Module (`js/spriteRenderer.js`)
- Added renderer-only module with no gameplay logic.
- Public methods:
	- `drawBuilding()`
	- `drawCastle()`
	- `drawWall()`
	- `drawDecoration()`
	- `drawUnit()`
	- `drawEffect()`
	- `drawConstruction()`
- Hybrid rendering contract:
	- Try sprite via AssetManager registry APIs.
	- If sprite not available, execute injected procedural fallback callback.

3. Future-Proof Rendering Support (infrastructure)
- SpriteRenderer payload supports:
	- animation frames / sprite-sheet frame selection
	- rotation
	- scaling
	- highlight tint
	- selection outline
	- construction progress overlay
	- damage overlay tint
	- seasonal variants
	- night tint

4. Main Loop Integration (render-only)
- Rendering flow now routes building/castle/wall/decoration/scaffold drawing through SpriteRenderer.
- Existing procedural draw functions were preserved and are now explicit fallback renderers.
- No gameplay, economy, combat, timers, or save format changes were introduced for this step.

5. Artwork Drop-In Goal
- Final architecture now supports progressive sprite adoption:
	- Drop PNG assets into registry paths.
	- Renderer automatically picks sprites when present.
	- Procedural fallback remains active when assets are absent.
	- No gameplay code changes required for future visual replacements.

PHASE 3 - CONTENT PIPELINE (INITIAL IMPLEMENTATION)
---------------------------------------------------

Rendering Freeze Rule Applied
----------------------------
- Rendering polish/features are frozen.
- Work is focused on asset authoring pipeline, discovery, and developer tooling.
- No gameplay logic, progression systems, or save schema behavior was changed for this phase.

1. Central Asset Catalog
------------------------
- Added `js/assetCatalog.js` as the canonical ID-based content manifest.
- Drawable objects now have stable IDs and metadata rather than filename coupling in callers.
- Catalog metadata includes:
	- asset id
	- category/group
	- supported levels
	- animation flag
	- source type (`single`, `sheet`, `atlas`)
	- sprite size
	- anchor point
	- optional variants field
	- source template/path

2. AssetManager Content Pipeline Upgrade
----------------------------------------
- AssetManager now resolves sprites through catalog entries instead of hardcoded filename rules.
- Added level-aware fallback via catalog supported levels (nearest lower level).
- Added catalog discovery pass:
	- `discoverCatalogAssets()` probes catalog-defined candidates for quick availability mapping.
	- New assets dropped into expected catalog paths are recognized with minimal config.
- Added catalog/debug inspection APIs:
	- `getCatalogDebugRows()`
	- `getTextureCount()`
	- `getLoadedTexturePaths()`
	- `getSpriteMeta(group, key)`
- Atlas preparation support:
	- Catalog `sourceType='atlas'` accepted.
	- Atlas image companion path handling (`*.atlas.json` -> `*.png`) prepared.

3. Sprite Sheet / Atlas Preparation
-----------------------------------
- SpriteRenderer now consumes sprite metadata from AssetManager (`frameSize`, `frameCount`, `frameMs`, `sourceType`).
- Frame timing and sheet slicing are metadata-driven.
- Atlas mode is prepped as a source type in the catalog and renderer data path.

4. Developer Debug Overlay
--------------------------
- Added optional developer overlay (toggle with `F8`).
- Overlay displays:
	- FPS
	- draw calls
	- sprite draws
	- fallback active + count
	- missing assets count
	- loaded textures
	- last asset id drawn
	- last draw status

5. Developer Asset Browser
--------------------------
- Added development-only Asset Browser (open with `F9` in developer mode, or `🧰 Assets` button when dev mode is enabled).
- Browser shows for catalog assets:
	- preview (if loaded)
	- asset id
	- category
	- source type
	- sprite size
	- resolved/discovered path
	- loaded/missing counts
	- fallback status

6. Integration Notes
--------------------
- Main startup now triggers background catalog discovery after preload.
- All systems remain modular and rendering fallback behavior remains intact.
- Asset authoring throughput is now catalog-driven and tooling-assisted for large content sets.

PHASE 4 - ANIMATION SYSTEM (FINAL INFRASTRUCTURE)
--------------------------------------------------

Scope Rule
----------
- This phase adds reusable animation infrastructure only.
- No gameplay logic, particles, or artwork content creation.
- No rendering rewrite; existing rendering stays hybrid and modular.

1. AnimationManager Module
--------------------------
- Added `js/animationManager.js` with centralized per-instance animation state.
- Public API implemented:
	- `AnimationManager.play()`
	- `AnimationManager.stop()`
	- `AnimationManager.pause()`
	- `AnimationManager.resume()`
	- `AnimationManager.update()`
	- `AnimationManager.getFrame()`
- Additional developer/runtime helpers:
	- `getInstance()`
	- `getActiveAnimations()`
	- `getDebugStats()`
	- `drainEvents()`

2. Animation Features Supported
-------------------------------
- loop / play once
- reverse playback
- speed multiplier + per-instance speed modifiers
- frame timing and frame-rate control (`frameMs`, `frameCount`)
- frame events + optional event handler callbacks
- per-instance animation state keyed by stable instance IDs
- random idle offsets
- blend transition metadata scaffold (future animation blending)

3. Source Types Supported
-------------------------
- single PNG (single-frame)
- sprite sheet (frame slicing)
- texture atlas pipeline path (frame rect support path prepared)
- skeletal animation placeholder type (`sourceType='skeletal'`) for future runtime integration

4. SpriteRenderer Integration Rule Enforced
-------------------------------------------
- SpriteRenderer now requests animation frames from AnimationManager.
- SpriteRenderer no longer computes animation time progression internally.
- Animation clip instance IDs are deterministic per rendered object instance.

5. Animation Type Coverage (catalog-level support)
--------------------------------------------------
- Catalog metadata now includes clip declarations for planned content production, including:
	- Idle
	- Construction
	- Upgrade
	- Attack
	- Walk
	- Death
	- Harvest
	- Smoke
	- Water
	- Fire
	- Flags
	- Windmill
- Destroyed remains content-dependent and can be added as clip metadata per asset when artwork is authored.

6. Developer Tooling Extension
------------------------------
- Developer overlay now shows animation telemetry:
	- active animations
	- current frame index
	- frame rate
	- atlas usage count
	- animation time
- Asset Browser now lists animation clip metadata and frame timing per catalog entry.

7. Freeze Notice
----------------
- With Phase 4 complete, core engine infrastructure is frozen.
- Next milestone shifts to large-scale asset/content production and replacing placeholders with real art.

