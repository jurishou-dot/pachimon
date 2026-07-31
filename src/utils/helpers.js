import { MONSTERS, AREAS, PERSONALITIES, WEATHERS, ITEMS, RANK_POINTS_THRESHOLDS } from '../config.js';

/**
 * Calculates current player rank name based on their rank points
 * @param {number} points 
 * @returns {string} Rank name
 */
export function getRankName(points) {
  let activeRank = RANK_POINTS_THRESHOLDS[0].rank;
  for (const threshold of RANK_POINTS_THRESHOLDS) {
    if (points >= threshold.points) {
      activeRank = threshold.rank;
    } else {
      break;
    }
  }
  return activeRank;
}

/**
 * Calculates monster stats based on base stats, level, and personality
 * @param {number} monsterNo 
 * @param {number} level 
 * @param {string} personalityName 
 * @returns {object} Calculated stats
 */
export function calculateMonsterStats(monsterNo, level, personalityName) {
  const template = MONSTERS[monsterNo];
  if (!template) throw new Error(`Invalid monster template No: ${monsterNo}`);

  const base = template.baseStats;
  const personality = PERSONALITIES.find(p => p.name === personalityName) || { bonus: {} };

  const calcStat = (baseVal, bonusMultiplier = 1.0) => {
    // Linear growth: base + 10% per level above 1, then apply personality bonus
    const scale = 1 + 0.1 * (level - 1);
    return Math.floor(baseVal * scale * bonusMultiplier);
  };

  const hp = calcStat(base.hp); // HP doesn't usually get personality bonuses in standard setup, but we could
  
  return {
    hp: hp,
    max_hp: hp,
    attack: calcStat(base.attack, personality.bonus.attack || 1.0),
    defense: calcStat(base.defense, personality.bonus.defense || 1.0),
    speed: calcStat(base.speed, personality.bonus.speed || 1.0),
    intelligence: calcStat(base.intelligence, personality.bonus.intelligence || 1.0),
    charm: calcStat(base.charm, personality.bonus.charm || 1.0)
  };
}

/**
 * Generates a random wild monster encounter in the specified area
 * @param {string} areaId 
 * @param {number} playerRankPoints - Optionally scale level based on rank
 * @returns {object} Wild monster instance details
 */
export function generateRandomWildMonster(areaId, playerRankPoints = 0) {
  const area = AREAS[areaId];
  if (!area) throw new Error(`Invalid area: ${areaId}`);

  // Weighted random spawn selection
  const rand = Math.random();
  let sum = 0;
  let selectedNo = 3; // Default to Takashi

  for (const [noStr, rate] of Object.entries(area.spawnRates)) {
    sum += rate;
    if (rand <= sum) {
      selectedNo = parseInt(noStr);
      break;
    }
  }

  const template = MONSTERS[selectedNo];
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  
  // Level ranges from 1 to 5 (higher rank points slightly increase level range)
  const rankBonus = Math.floor(playerRankPoints / 500);
  const minLvl = Math.max(1, 1 + rankBonus);
  const maxLvl = Math.max(5, 5 + rankBonus);
  const level = Math.floor(Math.random() * (maxLvl - minLvl + 1)) + minLvl;

  const stats = calculateMonsterStats(selectedNo, level, personality.name);

  // Initial caution meter (警戒度) from 40 to 100 based on personality/rarity
  let baseCaution = 70 + Math.floor(Math.random() * 30);
  if (personality.name === 'おくびょう') baseCaution += 10;
  if (personality.name === 'のんき') baseCaution -= 20;
  baseCaution = Math.max(20, Math.min(100, baseCaution));

  return {
    monster_no: selectedNo,
    name: template.name,
    type: template.type,
    nickname: template.name,
    level,
    personality: personality.name,
    favorite_food: template.favoriteFood,
    caution: baseCaution,
    hp: stats.hp,
    max_hp: stats.max_hp,
    attack: stats.attack,
    defense: stats.defense,
    speed: stats.speed,
    intelligence: stats.intelligence,
    charm: stats.charm
  };
}

/**
 * Calculates the exact capture success probability (0.0 to 1.0)
 * @param {object} wildMonster 
 * @param {string} boxItemId 
 * @param {string} foodItemId 
 * @param {string} weatherId 
 * @returns {number} Probability between 0 and 1
 */
export function calculateCaptureChance(wildMonster, boxItemId, foodItemId = null, weatherId = 'Sunny') {
  const box = ITEMS[boxItemId] || ITEMS.box_normal;
  const weather = WEATHERS[weatherId] || WEATHERS.Sunny;
  const personality = PERSONALITIES.find(p => p.name === wildMonster.personality) || { captureModifier: 1.0 };

  // Base rate calculation
  // Low level = slightly easier, High caution = harder
  // Formula base: (120 - caution)% * item catchRate
  const cautionFactor = (130 - wildMonster.caution) / 100;
  let chance = 0.35 * cautionFactor * box.catchRate;

  // Apply personality capture modifier
  chance *= personality.captureModifier;

  // Apply weather capture modifier
  chance *= weather.captureModifier;

  // Apply food bait modifier
  if (foodItemId) {
    const food = ITEMS[foodItemId];
    if (food && food.effect === 'bait') {
      const isFavorite = wildMonster.favorite_food === food.name;
      const baitBonus = isFavorite ? food.val * 2.0 : food.val;
      chance += baitBonus;
    }
  }

  // Cap chance between 5% and 95%
  return Math.max(0.05, Math.min(0.95, chance));
}

/**
 * Returns XP needed to reach next level
 * @param {number} currentLevel 
 * @returns {number} Needed XP
 */
export function getXPNeededForLevel(currentLevel) {
  // Simple RPG curve: Level 1 -> 50 XP, Level 2 -> 120 XP, Level 3 -> 220 XP, etc.
  return Math.floor(50 * Math.pow(currentLevel, 1.4));
}

/**
 * Adds XP and processes level ups
 * @param {object} monster 
 * @param {number} xpGained 
 * @returns {object} Result showing new level and stats
 */
export function addXPAndCheckLevelUp(monster, xpGained) {
  let currentLvl = monster.level;
  let currentXP = monster.exp + xpGained;
  let leveledUp = false;

  while (true) {
    const needed = getXPNeededForLevel(currentLvl);
    if (currentXP >= needed) {
      currentXP -= needed;
      currentLvl += 1;
      leveledUp = true;
    } else {
      break;
    }
  }

  if (leveledUp) {
    const newStats = calculateMonsterStats(monster.monster_no, currentLvl, monster.personality);
    return {
      leveledUp: true,
      level: currentLvl,
      exp: currentXP,
      hp: newStats.hp,
      max_hp: newStats.max_hp,
      attack: newStats.attack,
      defense: newStats.defense,
      speed: newStats.speed,
      intelligence: newStats.intelligence,
      charm: newStats.charm
    };
  }

  return {
    leveledUp: false,
    level: currentLvl,
    exp: currentXP
  };
}

/**
 * Generates 3 random daily missions for the player
 * @returns {Array} Mission blueprints
 */
export function generateDailyMissionsBlueprint() {
  const missionTypes = [
    {
      type: 'EXPLORE',
      title: (val) => `${AREAS[val].emoji} ${AREAS[val].name}を3回探索する`,
      target_value: () => {
        const keys = Object.keys(AREAS);
        return keys[Math.floor(Math.random() * keys.length)];
      },
      target_count: 3,
      reward_money: 150,
      reward_points: 30,
      reward_items: { food_standard: 2 }
    },
    {
      type: 'CAPTURE',
      title: (val) => `パチモンを3匹保護する`,
      target_value: () => 'ANY',
      target_count: 3,
      reward_money: 200,
      reward_points: 40,
      reward_items: { box_normal: 3 }
    },
    {
      type: 'OBSERVE',
      title: (val) => `👀 観察を3回実行する`,
      target_value: () => 'ANY',
      target_count: 3,
      reward_money: 100,
      reward_points: 25,
      reward_items: { food_standard: 1, bait_cabbage: 1 }
    }
  ];

  // Return exactly 3 missions (can randomize target values)
  return missionTypes.map(m => {
    const val = m.target_value();
    return {
      mission_type: m.type,
      target_value: val,
      target_count: m.target_count,
      reward_money: m.reward_money,
      reward_points: m.reward_points,
      reward_items: m.reward_items,
      description: m.title(val)
    };
  });
}
