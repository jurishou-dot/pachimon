import { SlashCommandBuilder } from 'discord.js';
import { getPlayer, savePlayer, updateInventoryItem, createMonster, db } from '../database.js';
import { MONSTERS } from '../config.js';
import { calculateMonsterStats } from '../utils/helpers.js';

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('【デバッグ用】管理者コマンド')
  .addSubcommand(sub => sub
    .setName('give_item')
    .setDescription('自分自身にアイテムを付与します')
    .addStringOption(opt => opt.setName('item').setDescription('付与するアイテム').setRequired(true).addChoices(
      { name: '📦 標準保護ボックス', value: 'box_normal' },
      { name: '🗃 スーパー保護ボックス', value: 'box_super' },
      { name: '🔒 特級保護ボックス', value: 'box_master' },
      { name: '🍖 パチモンフード', value: 'food_standard' },
      { name: '🥬 新鮮キャベツ', value: 'bait_cabbage' },
      { name: '🔋 単三乾電池', value: 'bait_battery' },
      { name: '🍢 ねぎま（タレ）', value: 'bait_yakitori' }
    ))
    .addIntegerOption(opt => opt.setName('quantity').setDescription('数量（マイナスも可）').setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName('give_money')
    .setDescription('お金を増減させます')
    .addIntegerOption(opt => opt.setName('amount').setDescription('金額（マイナスも可）').setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName('give_points')
    .setDescription('図鑑調査ポイント（ランクポイント）を増減させます')
    .addIntegerOption(opt => opt.setName('amount').setDescription('ポイント数（マイナスも可）').setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName('spawn')
    .setDescription('任意のパチモンを指定レベルで手持ち/ボックスに直接追加します')
    .addIntegerOption(opt => opt.setName('monster_no').setDescription('図鑑番号 (1-30)').setRequired(true))
    .addIntegerOption(opt => opt.setName('level').setDescription('レベル (1-100)').setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName('reset')
    .setDescription('自分の調査員データを完全に削除してリセットします（テスト用）')
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const player = getPlayer(userId);
  const subcommand = interaction.options.getSubcommand();

  if (!player && subcommand !== 'reset') {
    return interaction.reply({
      content: `調査員登録がされていません。まずは \`/start\` コマンドを入力して登録を行ってください！`,
      ephemeral: true
    });
  }

  // Debug is open to any user for dev purposes, but we can restrict if needed.
  if (subcommand === 'give_item') {
    const item = interaction.options.getString('item');
    const qty = interaction.options.getInteger('quantity');
    const newQty = updateInventoryItem(userId, item, qty);
    
    return interaction.reply({
      content: `🎒 アイテム \`${item}\` を \`${qty}\` 個付与しました。（現在庫: \`${newQty}\`）`,
      ephemeral: true
    });
  }

  if (subcommand === 'give_money') {
    const amount = interaction.options.getInteger('amount');
    const newMoney = Math.max(0, player.money + amount);
    savePlayer(userId, { money: newMoney });
    
    return interaction.reply({
      content: `🪙 お金を \`${amount}\` 増減しました。（現在の所持金: \`$${newMoney.toLocaleString()}\`）`,
      ephemeral: true
    });
  }

  if (subcommand === 'give_points') {
    const amount = interaction.options.getInteger('amount');
    const newPoints = Math.max(0, player.rank_points + amount);
    savePlayer(userId, { rank_points: newPoints });

    return interaction.reply({
      content: `✨ 調査ポイントを \`${amount}\` 増減しました。（現在のポイント: \`${newPoints}\`）`,
      ephemeral: true
    });
  }

  if (subcommand === 'spawn') {
    const monsterNo = interaction.options.getInteger('monster_no');
    const level = interaction.options.getInteger('level') || 10;
    
    const template = MONSTERS[monsterNo];
    if (!template) {
      return interaction.reply({
        content: `指定された図鑑番号 No.${monsterNo} は存在しません。(1〜30の間で指定してください)`,
        ephemeral: true
      });
    }

    const stats = calculateMonsterStats(monsterNo, level, 'のんき');
    const monsterData = {
      monster_no: monsterNo,
      nickname: template.name,
      level: level,
      exp: 0,
      hp: stats.hp,
      max_hp: stats.max_hp,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      intelligence: stats.intelligence,
      charm: stats.charm,
      personality: 'のんき',
      favorite_food: template.favoriteFood,
      status: 'BOX'
    };

    const newMonster = createMonster(userId, monsterData);
    
    return interaction.reply({
      content: `👾 **No.${monsterNo} ${template.name}** (Lv.${level}) をあなたのボックスに召喚しました！`,
      ephemeral: true
    });
  }

  if (subcommand === 'reset') {
    try {
      db.prepare('DELETE FROM monsters WHERE player_id = ?').run(userId);
      db.prepare('DELETE FROM encyclopedia WHERE player_id = ?').run(userId);
      db.prepare('DELETE FROM inventory WHERE player_id = ?').run(userId);
      db.prepare('DELETE FROM missions WHERE player_id = ?').run(userId);
      db.prepare('DELETE FROM settings WHERE player_id = ?').run(userId);
      db.prepare('DELETE FROM players WHERE id = ?').run(userId);

      return interaction.reply({
        content: `💥 あなたのすべての調査データ（プレイヤー、所持パチモン、図鑑、インベントリ）を初期化しました。\`/start\` で再登録が可能です。`,
        ephemeral: true
      });
    } catch (err) {
      return interaction.reply({
        content: `リセット処理中にエラーが発生しました: ${err.message}`,
        ephemeral: true
      });
    }
  }
}
