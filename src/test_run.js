import fs from 'fs';
import { join } from 'path';
import { dbInit, getPlayer, createPlayer, createMonster, getPlayerParty, getEncyclopedia, getInventory, updateInventoryItem, db } from './database.js';
import { generateRandomWildMonster, calculateCaptureChance, calculateMonsterStats } from './utils/helpers.js';
import { generateEncounterCard, generateProfileCard, generateMonsterDetailCard } from './utils/canvasGenerator.js';
import { MONSTERS } from './config.js';

console.log('🧪 Starting Pachimon Battle Game Engine Tests...');

async function runTests() {
  try {
    // 1. Initialize SQLite database
    console.log('1. Initializing database...');
    dbInit();

    const testUserId = 'test_user_99999';

    // Cleanup old test data if present
    db.prepare('DELETE FROM monsters WHERE player_id = ?').run(testUserId);
    db.prepare('DELETE FROM encyclopedia WHERE player_id = ?').run(testUserId);
    db.prepare('DELETE FROM inventory WHERE player_id = ?').run(testUserId);
    db.prepare('DELETE FROM missions WHERE player_id = ?').run(testUserId);
    db.prepare('DELETE FROM players WHERE id = ?').run(testUserId);

    // Wait briefly for delete
    await new Promise(r => setTimeout(r, 100));

    // 2. Create player
    console.log('2. Creating player profile...');
    const player = createPlayer(testUserId, 'TesterAgent');
    if (!player || player.username !== 'TesterAgent') {
      throw new Error('Player creation failed or username mismatch!');
    }
    console.log('✅ Player created successfully:', player);

    // Verify initial inventory
    const inventory = getInventory(testUserId);
    console.log('✅ Initial inventory:', inventory);
    if (inventory.box_normal !== 5 || inventory.food_standard !== 5) {
      throw new Error('Initial inventory items are incorrect!');
    }

    // 3. Create a starter monster
    console.log('3. Spawning starter monster No.3 (たかし)...');
    const template = MONSTERS[3];
    const stats = calculateMonsterStats(3, 5, 'おくびょう');
    const monsterData = {
      monster_no: 3,
      nickname: 'たかし初号機',
      level: 5,
      exp: 10,
      hp: stats.hp,
      max_hp: stats.max_hp,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      intelligence: stats.intelligence,
      charm: stats.charm,
      personality: 'おくびょう',
      favorite_food: template.favoriteFood,
      status: 'PARTY_1'
    };

    const starter = createMonster(testUserId, monsterData);
    if (!starter || starter.nickname !== 'たかし初号機') {
      throw new Error('Monster creation failed!');
    }
    console.log('✅ Starter monster spawned:', starter);

    // Verify party contains starter
    const party = getPlayerParty(testUserId);
    console.log('✅ Player party count:', party.length);
    if (party.length !== 1 || party[0].nickname !== 'たかし初号機') {
      throw new Error('Party list incorrect!');
    }

    // 4. Generate wild encounter
    console.log('4. Generating random wild encounter in Forest (🌳 森)...');
    const wild = generateRandomWildMonster('FOREST', 0);
    console.log(`✅ Wild Pachimon encountered: No.${wild.monster_no} ${wild.name} (Lv.${wild.level}, Caution: ${wild.caution}%)`);

    // 5. Test capture calculations
    console.log('5. Calculating capture probabilities...');
    const normalChance = calculateCaptureChance(wild, 'box_normal', null, 'Sunny');
    const masterChance = calculateCaptureChance(wild, 'box_master', null, 'Sunny');
    const rainyChance = calculateCaptureChance(wild, 'box_normal', null, 'Rainy');
    
    console.log(` - Standard Box (Sunny): ${(normalChance * 100).toFixed(1)}%`);
    console.log(` - Master Box (Sunny): ${(masterChance * 100).toFixed(1)}%`);
    console.log(` - Standard Box (Rainy): ${(rainyChance * 100).toFixed(1)}%`);

    if (masterChance <= normalChance || rainyChance > normalChance) {
      throw new Error('Capture chance multipliers are mathematically invalid!');
    }

    // 6. Test Canvas Rendering and save to disk
    console.log('6. Testing Canvas rendering...');
    
    // Encounter Card
    console.log(' - Rendering Wild Encounter card...');
    const encounterBuffer = await generateEncounterCard(wild, 'FOREST', 'Sunny');
    fs.writeFileSync('test_encounter.png', encounterBuffer);
    console.log('✅ Saved test_encounter.png');

    // Profile Card
    console.log(' - Rendering Trainer Profile card...');
    const profileBuffer = await generateProfileCard(player, '初心者', party, 1);
    fs.writeFileSync('test_profile.png', profileBuffer);
    console.log('✅ Saved test_profile.png');

    // Zukan Detail Card
    console.log(' - Rendering Pachimon Detail card...');
    const zukanBuffer = await generateMonsterDetailCard(MONSTERS[3], starter, 'PROTECTED');
    fs.writeFileSync('test_zukan.png', zukanBuffer);
    console.log('✅ Saved test_zukan.png');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Game engine is robust.');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

runTests();
