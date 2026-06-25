import { GameEngine } from '../js/engine.js';
import { SaveSystem } from '../js/save.js';

async function run() {
  console.log('Starting smoke test...');

  const engine = new GameEngine();
  engine.init();

  // Place a house at 5,5
  const res = engine.placeBuilding(5, 5, 'house');
  if (!res.success) {
    console.error('Place building failed:', res.error);
    process.exit(2);
  }

  const item = res.item;
  console.log('Queued item duration (ms):', item.duration);

  // Fast-forward completion
  item.startTime = Date.now() - item.duration - 10;

  const tickRes = engine.tick();
  if (!tickRes.constructionDone) {
    console.error('Construction did not complete after fast-forward');
    process.exit(3);
  }

  const key = `${item.x},${item.y}`;
  if (!engine.state.tiles[key]) {
    console.error('Tile not placed after construction');
    process.exit(4);
  }

  if (!engine.state.buildingLevels[key]) {
    console.error('Building level not recorded');
    process.exit(5);
  }

  console.log('Construction completed and building level set:', engine.state.buildingLevels[key]);

  // Test migration helper
  const migrated = SaveSystem.migrateV3toV4({ res: engine.state.res, army: engine.state.army, tiles: engine.state.tiles });
  if (!migrated || migrated.version !== 4) {
    console.error('Migration failed');
    process.exit(6);
  }

  console.log('Save migration OK. Smoke test passed.');
  process.exit(0);
}

run().catch((e) => { console.error('Test error', e); process.exit(1); });
