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

