import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';

// Resolve database path relative to project root
const dbPath = join(process.cwd(), 'pachimon.db');
export const db = new DatabaseSync(dbPath);

/**
 * Initializes the database tables if they do not exist
 */
export function dbInit() {
  // 1. Players Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      rank_points INTEGER DEFAULT 0,
      money INTEGER DEFAULT 500,
      current_area TEXT DEFAULT NULL,
      current_state TEXT DEFAULT 'IDLE',
      last_login TEXT,
      created_at TEXT
    )
  `);

  // 2. Monsters Table (Individual Pachimon owned by players)
  db.exec(`
    CREATE TABLE IF NOT EXISTS monsters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      monster_no INTEGER NOT NULL,
      nickname TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      hp INTEGER NOT NULL,
      max_hp INTEGER NOT NULL,
      attack INTEGER NOT NULL,
      defense INTEGER NOT NULL,
      speed INTEGER NOT NULL,
      intelligence INTEGER NOT NULL,
      charm INTEGER NOT NULL,
      personality TEXT NOT NULL,
      favorite_food TEXT NOT NULL,
      status TEXT DEFAULT 'BOX', -- PARTY_1, PARTY_2, PARTY_3, BOX
      created_at TEXT,
      FOREIGN KEY(player_id) REFERENCES players(id)
    )
  `);

  // 3. Encyclopedia Table (図鑑)
  db.exec(`
    CREATE TABLE IF NOT EXISTS encyclopedia (
      player_id TEXT NOT NULL,
      monster_no INTEGER NOT NULL,
      status TEXT NOT NULL, -- SEEN, PROTECTED
      discovered_at TEXT,
      PRIMARY KEY (player_id, monster_no),
      FOREIGN KEY(player_id) REFERENCES players(id)
    )
  `);

  // 4. Inventory Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      player_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      PRIMARY KEY (player_id, item_id),
      FOREIGN KEY(player_id) REFERENCES players(id)
    )
  `);

  // 5. Missions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      mission_type TEXT NOT NULL, -- CAPTURE, EXPLORE, OBSERVE
      target_value TEXT NOT NULL, -- Target monster_no, area, etc.
      target_count INTEGER NOT NULL,
      current_count INTEGER DEFAULT 0,
      reward_money INTEGER DEFAULT 0,
      reward_points INTEGER DEFAULT 0,
      reward_items TEXT, -- JSON string mapping item_id -> quantity
      status TEXT DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, CLAIMED
      FOREIGN KEY(player_id) REFERENCES players(id)
    )
  `);

  // 6. Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      player_id TEXT NOT NULL,
      setting_key TEXT NOT NULL,
      setting_value TEXT NOT NULL,
      PRIMARY KEY (player_id, setting_key),
      FOREIGN KEY(player_id) REFERENCES players(id)
    )
  `);

  console.log('Database initialized successfully at:', dbPath);
}

// ==========================================
// PLAYER SERVICES
// ==========================================

export function getPlayer(userId) {
  const stmt = db.prepare('SELECT * FROM players WHERE id = ?');
  return stmt.get(userId);
}

export function createPlayer(userId, username) {
  const now = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO players (id, username, rank_points, money, current_state, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?)');
  stmt.run(userId, username, 0, 500, 'IDLE', now, now);

  // Give initial items
  const giveItemStmt = db.prepare('INSERT OR REPLACE INTO inventory (player_id, item_id, quantity) VALUES (?, ?, ?)');
  giveItemStmt.run(userId, 'box_normal', 5);
  giveItemStmt.run(userId, 'food_standard', 5);

  return getPlayer(userId);
}

export function savePlayer(userId, updates) {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  values.push(userId);

  const query = `UPDATE players SET ${fields.join(', ')} WHERE id = ?`;
  const stmt = db.prepare(query);
  stmt.run(...values);

  return getPlayer(userId);
}

// ==========================================
// MONSTER SERVICES
// ==========================================

export function getMonster(monsterId) {
  const stmt = db.prepare('SELECT * FROM monsters WHERE id = ?');
  return stmt.get(monsterId);
}

export function getPlayerMonsters(userId) {
  const stmt = db.prepare('SELECT * FROM monsters WHERE player_id = ? ORDER BY level DESC, id ASC');
  return stmt.all(userId);
}

export function getPlayerParty(userId) {
  const stmt = db.prepare("SELECT * FROM monsters WHERE player_id = ? AND status LIKE 'PARTY_%' ORDER BY status ASC");
  return stmt.all(userId);
}

export function setMonsterStatus(monsterId, status) {
  const stmt = db.prepare('UPDATE monsters SET status = ? WHERE id = ?');
  stmt.run(status, monsterId);
}

export function createMonster(userId, monsterData) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO monsters (
      player_id, monster_no, nickname, level, exp, hp, max_hp,
      attack, defense, speed, intelligence, charm, personality, favorite_food, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    userId,
    monsterData.monster_no,
    monsterData.nickname,
    monsterData.level || 1,
    monsterData.exp || 0,
    monsterData.hp,
    monsterData.max_hp,
    monsterData.attack,
    monsterData.defense,
    monsterData.speed,
    monsterData.intelligence,
    monsterData.charm,
    monsterData.personality,
    monsterData.favorite_food,
    monsterData.status || 'BOX',
    now
  );

  // Return the auto-generated ID of the inserted row
  // Note: in node:sqlite, run() returns an object containing changes and lastInsertRowid
  const monsterId = result.lastInsertRowid;
  return getMonster(monsterId);
}

export function updateMonster(monsterId, updates) {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  values.push(monsterId);

  const query = `UPDATE monsters SET ${fields.join(', ')} WHERE id = ?`;
  const stmt = db.prepare(query);
  stmt.run(...values);

  return getMonster(monsterId);
}

// ==========================================
// ENCYCLOPEDIA SERVICES
// ==========================================

export function getEncyclopedia(userId) {
  const stmt = db.prepare('SELECT * FROM encyclopedia WHERE player_id = ?');
  const rows = stmt.all(userId);
  const zukan = {};
  for (const row of rows) {
    zukan[row.monster_no] = row.status;
  }
  return zukan;
}

export function updateEncyclopedia(userId, monsterNo, status) {
  const now = new Date().toISOString();
  
  // Check if existing status is already 'PROTECTED'
  const checkStmt = db.prepare('SELECT status FROM encyclopedia WHERE player_id = ? AND monster_no = ?');
  const existing = checkStmt.get(userId, monsterNo);

  if (existing) {
    if (existing.status === 'PROTECTED') {
      // Already protected, don't demote to seen
      return;
    }
    if (existing.status === 'SEEN' && status === 'PROTECTED') {
      // Upgrade from seen to protected
      const updateStmt = db.prepare('UPDATE encyclopedia SET status = ?, discovered_at = ? WHERE player_id = ? AND monster_no = ?');
      updateStmt.run(status, now, userId, monsterNo);
    }
  } else {
    // New entry
    const insertStmt = db.prepare('INSERT INTO encyclopedia (player_id, monster_no, status, discovered_at) VALUES (?, ?, ?, ?)');
    insertStmt.run(userId, monsterNo, status, now);
  }
}

// ==========================================
// INVENTORY SERVICES
// ==========================================

export function getInventory(userId) {
  const stmt = db.prepare('SELECT * FROM inventory WHERE player_id = ?');
  const rows = stmt.all(userId);
  const items = {};
  for (const row of rows) {
    items[row.item_id] = row.quantity;
  }
  return items;
}

export function updateInventoryItem(userId, itemId, amount) {
  // Check current quantity
  const checkStmt = db.prepare('SELECT quantity FROM inventory WHERE player_id = ? AND item_id = ?');
  const row = checkStmt.get(userId, itemId);
  const current = row ? row.quantity : 0;
  const newQty = Math.max(0, current + amount);

  const stmt = db.prepare('INSERT OR REPLACE INTO inventory (player_id, item_id, quantity) VALUES (?, ?, ?)');
  stmt.run(userId, itemId, newQty);

  return newQty;
}

// ==========================================
// MISSION SERVICES
// ==========================================

export function getMissions(userId) {
  const stmt = db.prepare('SELECT * FROM missions WHERE player_id = ? ORDER BY status ASC, id ASC');
  return stmt.all(userId);
}

export function createMission(userId, missionData) {
  const stmt = db.prepare(`
    INSERT INTO missions (
      player_id, mission_type, target_value, target_count, current_count,
      reward_money, reward_points, reward_items, status
    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'ACTIVE')
  `);
  
  const itemsStr = missionData.reward_items ? JSON.stringify(missionData.reward_items) : '{}';
  stmt.run(
    userId,
    missionData.mission_type,
    missionData.target_value.toString(),
    missionData.target_count,
    missionData.reward_money || 0,
    missionData.reward_points || 0,
    itemsStr
  );
}

export function updateMissionProgress(userId, missionType, targetValue) {
  const stmt = db.prepare("SELECT * FROM missions WHERE player_id = ? AND mission_type = ? AND target_value = ? AND status = 'ACTIVE'");
  const activeMissions = stmt.all(userId, missionType, targetValue.toString());

  for (const mission of activeMissions) {
    const newCount = mission.current_count + 1;
    if (newCount >= mission.target_count) {
      const updateStmt = db.prepare("UPDATE missions SET current_count = ?, status = 'COMPLETED' WHERE id = ?");
      updateStmt.run(mission.target_count, mission.id);
    } else {
      const updateStmt = db.prepare('UPDATE missions SET current_count = ? WHERE id = ?');
      updateStmt.run(newCount, mission.id);
    }
  }
}

export function claimMissionReward(userId, missionId) {
  const stmt = db.prepare('SELECT * FROM missions WHERE id = ? AND player_id = ?');
  const mission = stmt.get(missionId, userId);

  if (!mission || mission.status !== 'COMPLETED') {
    return null;
  }

  // Claim
  const updateStmt = db.prepare("UPDATE missions SET status = 'CLAIMED' WHERE id = ?");
  updateStmt.run(missionId);

  // Apply money & points
  const player = getPlayer(userId);
  const newMoney = player.money + mission.reward_money;
  const newPoints = player.rank_points + mission.reward_points;
  
  savePlayer(userId, { money: newMoney, rank_points: newPoints });

  // Apply items
  const items = JSON.parse(mission.reward_items || '{}');
  for (const [itemId, qty] of Object.entries(items)) {
    updateInventoryItem(userId, itemId, qty);
  }

  return {
    money: mission.reward_money,
    points: mission.reward_points,
    items
  };
}
