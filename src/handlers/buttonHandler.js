import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, StringSelectMenuBuilder } from 'discord.js';
import { 
  getPlayer, createPlayer, savePlayer, 
  createMonster, getPlayerParty, getEncyclopedia, 
  getInventory, updateInventoryItem, getMissions, 
  claimMissionReward, updateMissionProgress, updateEncyclopedia, getPlayerMonsters
} from '../database.js';
import { MONSTERS, AREAS, PERSONALITIES, ITEMS, WEATHERS } from '../config.js';
import { 
  calculateMonsterStats, generateRandomWildMonster, 
  getRankName, generateDailyMissionsBlueprint 
} from '../utils/helpers.js';
import { 
  generateProfileCard, generateEncounterCard, generateMonsterDetailCard, generateBattleCard
} from '../utils/canvasGenerator.js';
import { db } from '../database.js';
import { activeTrades, activePvPs, activeBattles } from '../utils/sessionManager.js';

export async function handleButton(interaction) {
  const userId = interaction.user.id;
  const customId = interaction.customId;

  // ----------------------------------------------------
  // STARTER CHOICE BUTTONS
  // ----------------------------------------------------
  if (customId.startsWith('starter_')) {
    const starterNo = parseInt(customId.split('_')[1]);
    const template = MONSTERS[starterNo];

    if (!template) {
      return interaction.reply({ content: '無効な初期パチモンが選択されました。', ephemeral: true });
    }

    let player = getPlayer(userId);
    if (player) {
      return interaction.reply({ content: 'すでに登録されています。', ephemeral: true });
    }

    // 1. Create player
    player = createPlayer(userId, interaction.user.username);

    // 2. Generate starter monster
    const level = 5;
    const stats = calculateMonsterStats(starterNo, level, 'のんき');
    const monsterData = {
      monster_no: starterNo,
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
      status: 'PARTY_1' // Set to slot 1
    };

    const newMonster = createMonster(userId, monsterData);

    // 3. Log protected in encyclopedia
    updateEncyclopedia(userId, starterNo, 'PROTECTED');

    // 4. Generate daily missions
    const missions = generateDailyMissionsBlueprint();
    for (const m of missions) {
      db.prepare(`
        INSERT INTO missions (
          player_id, mission_type, target_value, target_count, current_count,
          reward_money, reward_points, reward_items, status
        ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'ACTIVE')
      `).run(userId, m.mission_type, m.target_value.toString(), m.target_count, m.reward_money, m.reward_points, JSON.stringify(m.reward_items));
    }

    const embed = new EmbedBuilder()
      .setTitle('🎉 調査員登録完了！')
      .setDescription(
        `おめでとう！ **${interaction.user.username}** が正式にパチモン調査隊に任命された！\n` +
        `最初の相棒として **${template.name}** (Lv.5) が君のチームに加わったぞ。\n\n` +
        `**【初期支給品】**\n` +
        `・標準保護ボックス 📦 x5\n` +
        `・パチモンフード 🍖 x5\n` +
        `・調査資金 $500 🪙\n\n` +
        `準備ができたら、下のボタンからメインメニューを開こう！`
      )
      .setColor('#4CAF50');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('menu_mypage')
        .setLabel('メインメニューを開く')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🏠')
    );

    return interaction.update({
      embeds: [embed],
      components: [row]
    });
  }

  // Check if player is registered for all menu/game actions
  const player = getPlayer(userId);
  if (!player) {
    return interaction.reply({
      content: '調査員データが見つかりません。まずは \`/start\` から登録してください。',
      ephemeral: true
    });
  }

  // ----------------------------------------------------
  // MAIN MENU ACTIONS
  // ----------------------------------------------------
  if (customId === 'menu_mypage') {
    // Show Profile Card (essentially reload menu)
    await interaction.deferUpdate();
    const party = getPlayerParty(userId);
    const zukan = getEncyclopedia(userId);
    const zukanCount = Object.keys(zukan).filter(no => zukan[no] === 'PROTECTED').length;
    const rankName = getRankName(player.rank_points);

    const cardBuffer = await generateProfileCard(player, rankName, party, zukanCount);
    const attachment = new AttachmentBuilder(cardBuffer, { name: 'profile_card.png' });

    const embed = new EmbedBuilder()
      .setTitle('🏠 パチモン調査隊 本部ダッシュボード')
      .setDescription(`調査員 **${player.username}** のライセンス情報です。`)
      .setImage('attachment://profile_card.png')
      .setColor('#00E5FF');

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_zukan').setLabel('📖 コーデックス').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('menu_investigate').setLabel('🧭 調査').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('menu_party').setLabel('🎒 手持ち').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('menu_care').setLabel('🍖 お世話').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_battle').setLabel('⚔ バトル').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('menu_missions').setLabel('📜 依頼').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('menu_shop').setLabel('🪙 ショップ').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('menu_settings').setLabel('⚙ 設定').setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [row1, row2]
    });
  }

  if (customId === 'menu_zukan' || customId === 'zukan_page_1' || customId === 'zukan_page_2') {
    // Show Encyclopedia List
    await interaction.deferUpdate();
    const zukan = getEncyclopedia(userId);
    const totalSpecies = 30;
    const protectedCount = Object.keys(zukan).filter(no => zukan[no] === 'PROTECTED').length;
    const seenCount = Object.keys(zukan).length;

    const page = customId === 'zukan_page_2' ? 2 : 1;
    const startNo = page === 1 ? 1 : 16;
    const endNo = page === 1 ? 15 : 30;

    const embed = new EmbedBuilder()
      .setTitle('📖 パチモン・コーデックス')
      .setDescription(
        `**調査完了率:** ${Math.floor((protectedCount / totalSpecies) * 100)}%\n` +
        `・保護した種類: \`${protectedCount} / ${totalSpecies}\` 種\n` +
        `・遭遇した種類: \`${seenCount} / ${totalSpecies}\` 種\n\n` +
        `下のリストから、詳細データを見たいパチモンを選択してください（No.${startNo}〜No.${endNo}を表示中）`
      )
      .setColor('#9E9E9E');

    // Build Select Menu options
    const selectOptions = [];
    for (let no = startNo; no <= endNo; no++) {
      const template = MONSTERS[no];
      const status = zukan[no];
      let label = `No.${String(no).padStart(3, '0')} ???`;
      let emoji = '🔒';

      if (status === 'PROTECTED') {
        label = `No.${String(no).padStart(3, '0')} ${template.name}`;
        emoji = '✅';
      } else if (status === 'SEEN') {
        label = `No.${String(no).padStart(3, '0')} ${template.name} (未保護)`;
        emoji = '👀';
      }

      selectOptions.push({
        label,
        value: `zukan_view_${no}`,
        emoji,
        description: status === 'PROTECTED' ? template.classification : '未保護'
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('zukan_select')
      .setPlaceholder('パチモンを選択して詳細を表示')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('zukan_page_1')
        .setLabel('No.001〜015')
        .setStyle(page === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId('zukan_page_2')
        .setLabel('No.016〜030')
        .setStyle(page === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(page === 2),
      new ButtonBuilder()
        .setCustomId('menu_mypage')
        .setLabel('戻る')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [], // Clear old attachments
      components: [selectRow, navRow]
    });
  }

  if (customId === 'menu_investigate') {
    // Show Biome/Area list
    await interaction.deferUpdate();
    const embed = new EmbedBuilder()
      .setTitle('🧭 調査エリアの選択')
      .setDescription(
        `どこに調査へ行きますか？\n` +
        `エリアによって出現するパチモンの種類やレア度、出現率が異なります。`
      )
      .setColor('#4CAF50')
      .addFields(
        Object.values(AREAS).map(area => ({
          name: `${area.emoji} ${area.name}`,
          value: area.description,
          inline: true
        }))
      );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('area_select')
      .setPlaceholder('調査エリアを選択してください')
      .addOptions(
        Object.values(AREAS).map(area => ({
          label: area.name,
          value: `area_go_${area.id}`,
          emoji: area.emoji,
          description: area.description.substring(0, 50)
        }))
      );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: [selectRow, navRow]
    });
  }

  if (customId === 'menu_party') {
    // Show Party screen
    await interaction.deferUpdate();
    const party = getPlayerParty(userId);

    const embed = new EmbedBuilder()
      .setTitle('🎒 手持ちパチモン')
      .setDescription(
        `調査時に連れて歩くパチモンです（最大3匹）。\n` +
        `お世話やトレーニングでの育成対象になります。`
      )
      .setColor('#FF9800');

    const buttons = [];
    for (let i = 0; i < 3; i++) {
      const monster = party[i];
      const slotNum = i + 1;
      
      if (monster) {
        embed.addFields({
          name: `Slot ${slotNum}: ${monster.nickname} (Lv.${monster.level})`,
          value: `タイプ: ${MONSTERS[monster.monster_no].type} | HP: ${monster.hp}/${monster.max_hp}\n` +
                 `ATK: ${monster.attack} | DEF: ${monster.defense} | SPD: ${monster.speed} | 性格: ${monster.personality}`,
          inline: false
        });

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`party_box_${monster.id}`)
            .setLabel(`Slot ${slotNum} 預ける`)
            .setStyle(ButtonStyle.Danger)
        );

        if (slotNum > 1) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`party_lead_${monster.id}`)
              .setLabel(`Slot ${slotNum} 先頭へ`)
              .setStyle(ButtonStyle.Success)
          );
        }
      } else {
        embed.addFields({
          name: `Slot ${slotNum}: [空きスロット]`,
          value: `パチモンが入っていません。`,
          inline: false
        });
      }
    }

    // Add buttons for changing/replacing party
    const row1 = new ActionRowBuilder().addComponents(buttons);
    
    // Add select menu for Box monsters to add to party
    const boxMonsters = getPlayerMonsters(userId).filter(m => !m.status.startsWith('PARTY_'));
    const rows = [];
    
    if (row1.components.length > 0) {
      rows.push(row1);
    }

    if (boxMonsters.length > 0 && party.length < 3) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('party_add_select')
        .setPlaceholder('ボックスのパチモンを手持ちに加える')
        .addOptions(
          boxMonsters.slice(0, 25).map(m => ({
            label: `${m.nickname} (Lv.${m.level})`,
            value: `party_add_${m.id}`,
            description: `タイプ: ${MONSTERS[m.monster_no].type} | 性格: ${m.personality}`
          }))
        );
      rows.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
    );
    rows.push(navRow);

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: rows
    });
  }

  // Box a party member
  if (customId.startsWith('party_box_')) {
    const monsterId = parseInt(customId.split('_')[2]);
    
    // Set status to BOX
    db.prepare("UPDATE monsters SET status = 'BOX' WHERE id = ? AND player_id = ?").run(monsterId, userId);
    
    // Auto shift remaining slots if needed (handled simply in query next time)
    // Redirect back to party menu
    const wrappedInteraction = Object.create(interaction);
    wrappedInteraction.customId = 'menu_party';
    return handleButton(wrappedInteraction);
  }

  // Make a party member the lead (Slot 1)
  if (customId.startsWith('party_lead_')) {
    const monsterId = parseInt(customId.split('_')[2]);

    // Get current party
    const party = getPlayerParty(userId);
    const targetMonster = party.find(m => m.id === monsterId);
    const leadMonster = party.find(m => m.status === 'PARTY_1');

    if (targetMonster) {
      if (leadMonster) {
        // Swap their statuses
        const oldStatus = targetMonster.status;
        db.prepare('UPDATE monsters SET status = ? WHERE id = ? AND player_id = ?').run(leadMonster.status, targetMonster.id, userId);
        db.prepare('UPDATE monsters SET status = ? WHERE id = ? AND player_id = ?').run(oldStatus, leadMonster.id, userId);
      } else {
        // Just move to PARTY_1
        db.prepare("UPDATE monsters SET status = 'PARTY_1' WHERE id = ? AND player_id = ?").run(targetMonster.id, userId);
      }
    }

    // Redirect back to party menu
    const wrappedInteraction = Object.create(interaction);
    wrappedInteraction.customId = 'menu_party';
    return handleButton(wrappedInteraction);
  }

  if (customId === 'menu_care') {
    // Open Care select screen
    await interaction.deferUpdate();
    const party = getPlayerParty(userId);

    if (party.length === 0) {
      return interaction.editReply({
        content: '手持ちのパチモンがいません。まずは \`/menu\` から「手持ち」画面を開いてパチモンを追加してください！',
        embeds: [], components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
        )]
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🍖 パチモンの「お世話」')
      .setDescription(
        `手持ちのパチモンを可愛がってお世話しよう。\n` +
        `お世話をすると親密になり、経験値(EXP)を獲得できます。\n\n` +
        `**お世話するパチモンを選択してください：**`
      )
      .setColor('#E91E63');

    const row = new ActionRowBuilder().addComponents(
      party.map((m, idx) => 
        new ButtonBuilder()
          .setCustomId(`care_select_${m.id}`)
          .setLabel(`${m.nickname} (Lv.${m.level})`)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: [row, navRow]
    });
  }

  // Care Selection triggered
  if (customId.startsWith('care_select_')) {
    await interaction.deferUpdate();
    const monsterId = parseInt(customId.split('_')[2]);
    const monster = db.prepare('SELECT * FROM monsters WHERE id = ? AND player_id = ?').get(monsterId, userId);

    if (!monster) {
      return interaction.editReply({ content: 'パチモンが見つかりません。', components: [] });
    }

    const inventory = getInventory(userId);
    const foodCount = inventory.food_standard || 0;

    const embed = new EmbedBuilder()
      .setTitle(`🍖 ${monster.nickname} のお世話パネル`)
      .setDescription(
        `何をしてあげますか？\n` +
        `・ごはん：フードを1個消費してお腹を満たす(EXP+15)\n` +
        `・遊ぶ：一緒に全力で遊ぶ(EXP+10)\n` +
        `・休ませる：睡眠をとらせてリフレッシュ(EXP+8)\n` +
        `・ブラッシング：優しく毛並みを整える(EXP+8)`
      )
      .addFields([
        { name: 'ステータス', value: `Lv.${monster.level} (EXP: ${monster.exp})`, inline: true },
        { name: '好物', value: monster.favorite_food, inline: true },
        { name: 'パチモンフード在庫', value: `🍖 x${foodCount}個`, inline: true }
      ])
      .setColor('#E91E63');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`care_action_feed_${monsterId}`).setLabel('🍖 ごはんをあげる').setStyle(ButtonStyle.Success).setDisabled(foodCount <= 0),
      new ButtonBuilder().setCustomId(`care_action_play_${monsterId}`).setLabel('🎾 一緒に遊ぶ').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`care_action_rest_${monsterId}`).setLabel('💤 休ませる').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`care_action_brush_${monsterId}`).setLabel('🧼 ブラッシング').setStyle(ButtonStyle.Secondary)
    );

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_care').setLabel('戻る').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: [row, navRow]
    });
  }

  // Care execution actions
  if (customId.startsWith('care_action_')) {
    await interaction.deferUpdate();
    const parts = customId.split('_');
    const action = parts[2]; // feed, play, rest, brush
    const monsterId = parseInt(parts[3]);
    let monster = db.prepare('SELECT * FROM monsters WHERE id = ? AND player_id = ?').get(monsterId, userId);

    if (!monster) return interaction.editReply({ content: 'パチモンが見つかりません。' });

    let xpGained = 0;
    let message = '';
    
    if (action === 'feed') {
      const inventory = getInventory(userId);
      if ((inventory.food_standard || 0) <= 0) {
        return interaction.followUp({ content: 'パチモンフードがありません！', ephemeral: true });
      }
      updateInventoryItem(userId, 'food_standard', -1);
      xpGained = 15;
      message = `🍖 **${monster.nickname}** にパチモンフードをあげた！ 美味しそうに食べている！（EXP +${xpGained}）`;
    } else if (action === 'play') {
      xpGained = 10;
      message = `🎾 **${monster.nickname}** と遊んだ！ 楽しそうに走り回っている！（EXP +${xpGained}）`;
    } else if (action === 'rest') {
      xpGained = 8;
      message = `💤 **${monster.nickname}** を休ませた！ すやすや眠っている...（EXP +${xpGained}）`;
    } else if (action === 'brush') {
      xpGained = 8;
      message = `🧼 **${monster.nickname}** をブラッシングした！ 毛並みがツヤツヤになった！（EXP +${xpGained}）`;
    }

    // Apply XP & check Level up
    const currentLvl = monster.level;
    const currentXP = monster.exp + xpGained;
    
    // Level curves: 50 * level ^ 1.4
    const getXPNeeded = (l) => Math.floor(50 * Math.pow(l, 1.4));
    let newLvl = currentLvl;
    let finalXP = currentXP;
    let leveledUp = false;

    while (true) {
      const needed = getXPNeeded(newLvl);
      if (finalXP >= needed) {
        finalXP -= needed;
        newLvl += 1;
        leveledUp = true;
      } else {
        break;
      }
    }

    let levelUpMsg = '';
    if (leveledUp) {
      const newStats = calculateMonsterStats(monster.monster_no, newLvl, monster.personality);
      db.prepare(`
        UPDATE monsters SET 
          level = ?, exp = ?, hp = ?, max_hp = ?,
          attack = ?, defense = ?, speed = ?, intelligence = ?, charm = ?
        WHERE id = ?
      `).run(
        newLvl, finalXP, newStats.hp, newStats.max_hp,
        newStats.attack, newStats.defense, newStats.speed, newStats.intelligence, newStats.charm,
        monsterId
      );
      levelUpMsg = `\n🆙 **レベルアップ！** Lv.${currentLvl} ➡️ **Lv.${newLvl}** に上昇！ 各種ステータスが上昇した！`;
    } else {
      db.prepare('UPDATE monsters SET exp = ? WHERE id = ?').run(finalXP, monsterId);
    }

    // Refresh monster data
    monster = db.prepare('SELECT * FROM monsters WHERE id = ? AND player_id = ?').get(monsterId, userId);

    const updatedInventory = getInventory(userId);
    const foodCount = updatedInventory.food_standard || 0;

    const embed = new EmbedBuilder()
      .setTitle(`🍖 ${monster.nickname} のお世話パネル`)
      .setDescription(`${message}${levelUpMsg}`)
      .addFields([
        { name: 'ステータス', value: `Lv.${monster.level} (EXP: ${monster.exp} / ${getXPNeeded(monster.level)})`, inline: true },
        { name: '好物', value: monster.favorite_food, inline: true },
        { name: 'パチモンフード在庫', value: `🍖 x${foodCount}個`, inline: true }
      ])
      .setColor('#E91E63');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`care_action_feed_${monsterId}`).setLabel('🍖 ごはんをあげる').setStyle(ButtonStyle.Success).setDisabled(foodCount <= 0),
      new ButtonBuilder().setCustomId(`care_action_play_${monsterId}`).setLabel('🎾 一緒に遊ぶ').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`care_action_rest_${monsterId}`).setLabel('💤 休ませる').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`care_action_brush_${monsterId}`).setLabel('🧼 ブラッシング').setStyle(ButtonStyle.Secondary)
    );

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_care').setLabel('戻る').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      components: [row, navRow]
    });
  }

  if (customId === 'menu_missions') {
    // Show Missions
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }
    const missions = getMissions(userId);

    const embed = new EmbedBuilder()
      .setTitle('📜 調査依頼ボード')
      .setDescription(
        `本部から下された現在の調査依頼だ。\n` +
        `完了したら「報酬を受け取る」ボタンをタップしてボーナスを獲得しよう！`
      )
      .setColor('#3F51B5');

    const rows = [];
    const claimButtons = [];

    if (missions.length === 0) {
      embed.setDescription('現在アクティブな依頼はありません。また明日来てください。');
    } else {
      for (const m of missions) {
        let statusEmoji = '⚙️ 進行中';
        let statusText = `進行度: \`${m.current_count} / ${m.target_count}\``;
        
        if (m.status === 'COMPLETED') {
          statusEmoji = '✅ 達成！';
          statusText = `報酬受取可能です！`;
          
          claimButtons.push(
            new ButtonBuilder()
              .setCustomId(`mission_claim_${m.id}`)
              .setLabel(`No.${m.id} の報酬を受取`)
              .setStyle(ButtonStyle.Success)
          );
        } else if (m.status === 'CLAIMED') {
          statusEmoji = '🎁 受取済み';
          statusText = `クリア済み`;
        }

        // Parse reward items
        const rewards = JSON.parse(m.reward_items || '{}');
        const rewardsText = Object.entries(rewards).map(([id, qty]) => `${ITEMS[id]?.emoji || ''}${ITEMS[id]?.name} x${qty}`).join(', ') || 'なし';

        let desc = '探索を完了する';
        if (m.mission_type === 'EXPLORE') {
          desc = `${AREAS[m.target_value]?.emoji} ${AREAS[m.target_value]?.name}を探索する`;
        } else if (m.mission_type === 'CAPTURE') {
          desc = 'パチモンを保護する';
        } else if (m.mission_type === 'OBSERVE') {
          desc = '👀 観察を実行する';
        }

        embed.addFields({
          name: `依頼 No.${m.id}: ${desc} [${statusEmoji}]`,
          value: `・目標: ${m.target_count}回 | ${statusText}\n` +
                 `・報酬: $${m.reward_money} 🪙 | ${m.reward_points}P | アイテム: ${rewardsText}`,
          inline: false
        });
      }
    }

    if (claimButtons.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(claimButtons.slice(0, 5)));
    }

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
    );
    rows.push(navRow);

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: rows
    });
  }

  // Claim Mission reward
  if (customId.startsWith('mission_claim_')) {
    await interaction.deferUpdate();
    const missionId = parseInt(customId.split('_')[2]);
    const rewards = claimMissionReward(userId, missionId);

    if (rewards) {
      const itemsText = Object.entries(rewards.items).map(([id, qty]) => `${ITEMS[id]?.emoji}${ITEMS[id]?.name} x${qty}`).join(', ') || 'なし';
      await interaction.followUp({
        content: `🎁 **依頼達成報酬を獲得！**\n` +
                 `・資金: +$${rewards.money}\n` +
                 `・コーデックス調査P: +${rewards.points}P\n` +
                 `・アイテム: ${itemsText}`,
        ephemeral: true
      });
    }

    // Reload missions board
    const wrappedInteraction = Object.create(interaction);
    wrappedInteraction.customId = 'menu_missions';
    return handleButton(wrappedInteraction);
  }

  if (customId === 'menu_settings') {
    // Show settings screen
    await interaction.deferUpdate();
    const embed = new EmbedBuilder()
      .setTitle('⚙ 調査員設定')
      .setDescription(
        `各種設定の調整が可能です。\n` +
        `現在のバージョン: \`Pachimon Battle Ver 0.3\`\n\n` +
        `・調査員名: **${player.username}**\n` +
        `・登録日時: \`${player.created_at}\``
      )
      .setColor('#607D8B');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('settings_change_nickname')
        .setLabel('ニックネーム変更 (Coming Soon)')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: [row, navRow]
    });
  }

  if (customId === 'menu_shop') {
    // Show shop screen
    await interaction.deferUpdate();

    const embed = new EmbedBuilder()
      .setTitle('🪙 よろず屋（アイテムショップ）')
      .setDescription(
        `パチモン調査に役立つアイテムを販売しています。\n` +
        `現在の所持金: **$${player.money.toLocaleString()}**\n\n` +
        `**【販売アイテム一覧】**\n` +
        `📦 **標準保護ボックス** - $100\n` +
        `🗃 **スーパー保護ボックス** - $300\n` +
        `🔒 **特級保護ボックス** - $1000\n` +
        `🍖 **パチモンフード** - $50 (お世話用エサ)\n` +
        `🥬 **新鮮キャベツ** - $80 (草タイプ用エサ)\n` +
        `🔋 **単三乾電池** - $80 (電気タイプ用エサ)\n` +
        `🍢 **ねぎま（タレ）** - $100 (肉食系用エサ)`
      )
      .setColor('#FFD700');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('shop_item_select')
      .setPlaceholder('購入するアイテムを選択してください')
      .addOptions(
        Object.values(ITEMS).map(item => ({
          label: `${item.name} ($${item.price})`,
          value: `shop_buy_${item.id}`,
          emoji: item.emoji,
          description: item.desc.substring(0, 50)
        }))
      );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: [selectRow, navRow]
    });
  }

  // ----------------------------------------------------
  // INVESTIGATION / EXPLORE FLOWS
  // ----------------------------------------------------
  if (customId === 'explore_proceed') {
    // Explore forward in the current area!
    await interaction.deferUpdate();
    
    const areaId = player.current_area;
    if (!areaId) {
      return interaction.editReply({ content: '調査エリアが選択されていません。', components: [] });
    }

    savePlayer(userId, { current_state: 'INVESTIGATING' });

    // Roll random weather change (10% chance)
    let weatherId = 'Sunny';
    const activeWeatherRow = db.prepare("SELECT setting_value FROM settings WHERE player_id = ? AND setting_key = 'active_weather'").get(userId);
    if (activeWeatherRow) {
      weatherId = activeWeatherRow.setting_value;
    }
    
    if (Math.random() < 0.15) {
      const area = AREAS[areaId];
      const wChoices = Object.keys(area.weatherChance);
      const wRates = Object.values(area.weatherChance);
      const wRand = Math.random();
      let wSum = 0;
      for (let i = 0; i < wChoices.length; i++) {
        wSum += wRates[i];
        if (wRand <= wSum) {
          weatherId = wChoices[i];
          break;
        }
      }
      db.prepare("INSERT OR REPLACE INTO settings (player_id, setting_key, setting_value) VALUES (?, 'active_weather', ?)").run(userId, weatherId);
    }

    // Trigger mission progress increment
    updateMissionProgress(userId, 'EXPLORE', areaId);

    // Roll encounter chance (70% find a Pachimon)
    if (Math.random() < 0.70) {
      // Find a monster!
      const wildMonster = generateRandomWildMonster(areaId, player.rank_points);
      
      // Store active encounter JSON
      db.prepare("INSERT OR REPLACE INTO settings (player_id, setting_key, setting_value) VALUES (?, 'active_encounter', ?)").run(userId, JSON.stringify(wildMonster));
      
      // Set state to ENCOUNTER
      savePlayer(userId, { current_state: 'ENCOUNTER' });

      // Add to encyclopedia as SEEN
      updateEncyclopedia(userId, wildMonster.monster_no, 'SEEN');

      // Generate card
      const cardBuffer = await generateEncounterCard(wildMonster, areaId, weatherId);
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'encounter.png' });

      const embed = new EmbedBuilder()
        .setTitle(`❗ パチモン発見！`)
        .setDescription(
          `**何かいる！！**\n` +
          `No.${wildMonster.monster_no} **${wildMonster.name}** が現れた！\n` +
          `行動を選択してください。`
        )
        .setImage('attachment://encounter.png')
        .setColor('#FF1744');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('encounter_observe').setLabel('👀 観察').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('encounter_protect_menu').setLabel('🤝 保護').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('encounter_battle').setLabel('⚔ バトル (簡易戦闘)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('encounter_escape').setLabel('🏃 逃げる').setStyle(ButtonStyle.Secondary)
      );

      return interaction.editReply({
        embeds: [embed],
        files: [attachment],
        components: [row]
      });
    } else {
      // Find money or item, or nothing
      const randEvent = Math.random();
      let findMsg = '';
      if (randEvent < 0.4) {
        const foundMoney = 50 + Math.floor(Math.random() * 50);
        savePlayer(userId, { money: player.money + foundMoney });
        findMsg = `🪙 探索中に落ちていたサイフを見つけた！ **$${foundMoney}** を手に入れた！`;
      } else if (randEvent < 0.7) {
        updateInventoryItem(userId, 'food_standard', 1);
        findMsg = `🍖 探索中に野生の木の実かと思ったら **パチモンフード** を1個拾った！`;
      } else {
        findMsg = `🍃 しばらく歩いたが、辺りには風の音しか聞こえない...`;
      }

      const weather = WEATHERS[weatherId];
      const embed = new EmbedBuilder()
        .setTitle(`${AREAS[areaId].emoji} ${AREAS[areaId].name} を探索中...`)
        .setDescription(
          `${findMsg}\n\n` +
          `現在の天候: ${weather.emoji} **${weather.name}**`
        )
        .setColor('#4CAF50');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('explore_proceed').setLabel('👣 さらに進む').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('explore_leave').setLabel('🏃 本部に戻る').setStyle(ButtonStyle.Danger)
      );

      return interaction.editReply({
        embeds: [embed],
        files: [],
        components: [row]
      });
    }
  }

  if (customId === 'explore_leave') {
    // Leave area back to menu
    db.prepare("DELETE FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").run(userId);
    savePlayer(userId, { current_state: 'IDLE', current_area: null });

    const wrappedInteraction = Object.create(interaction);
    wrappedInteraction.customId = 'menu_mypage';
    return handleButton(wrappedInteraction);
  }

  if (customId === 'encounter_escape') {
    // Escape from encounter, stay in the area!
    await interaction.deferUpdate();
    db.prepare("DELETE FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").run(userId);
    savePlayer(userId, { current_state: 'IDLE' });

    const embed = new EmbedBuilder()
      .setTitle('🏃 逃走成功')
      .setDescription('パチモンから無事に逃げ出しました！')
      .setColor('#78909C');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('explore_proceed').setLabel('👣 調査を続ける').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('explore_leave').setLabel('🏠 本部に戻る').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: [row]
    });
  }

  // ----------------------------------------------------
  // ENCOUNTER ACTIONS
  // ----------------------------------------------------
  if (customId === 'encounter_observe') {
    await interaction.deferUpdate();

    const activeEncounterRow = db.prepare("SELECT setting_value FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").get(userId);
    if (!activeEncounterRow) return interaction.editReply({ content: '遭遇しているパチモンがいません。', components: [] });

    const wildMonster = JSON.parse(activeEncounterRow.setting_value);
    
    // Decrease caution by 20-30%
    const oldCaution = wildMonster.caution;
    const decrement = 20 + Math.floor(Math.random() * 10);
    wildMonster.caution = Math.max(10, wildMonster.caution - decrement);

    // Save updated encounter
    db.prepare("INSERT OR REPLACE INTO settings (player_id, setting_key, setting_value) VALUES (?, 'active_encounter', ?)").run(userId, JSON.stringify(wildMonster));

    // Update mission progress
    updateMissionProgress(userId, 'OBSERVE', 'ANY');

    // Retrieve weather
    let weatherId = 'Sunny';
    const activeWeatherRow = db.prepare("SELECT setting_value FROM settings WHERE player_id = ? AND setting_key = 'active_weather'").get(userId);
    if (activeWeatherRow) weatherId = activeWeatherRow.setting_value;

    const cardBuffer = await generateEncounterCard(wildMonster, player.current_area, weatherId);
    const attachment = new AttachmentBuilder(cardBuffer, { name: 'encounter.png' });

    const embed = new EmbedBuilder()
      .setTitle(`👀 観察を実行！`)
      .setDescription(
        `じーっと様子をうかがった...\n` +
        `**${wildMonster.name}** は君との距離を測っているようだ。\n` +
        `警戒心が下がった！ (\`警戒度: ${oldCaution}% ➡️ ${wildMonster.caution}%\`)`
      )
      .setImage('attachment://encounter.png')
      .setColor('#FF1744');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('encounter_observe').setLabel('👀 観察').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('encounter_protect_menu').setLabel('🤝 保護').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('encounter_battle').setLabel('⚔ バトル (簡易戦闘)').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('encounter_escape').setLabel('🏃 逃げる').setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [row]
    });
  }

  if (customId === 'encounter_protect_menu') {
    // Show protection item menu
    await interaction.deferUpdate();

    const inventory = getInventory(userId);
    const boxes = [
      { id: 'box_normal', label: '標準保護ボックス 📦', rate: '1.0x' },
      { id: 'box_super', label: 'スーパー保護ボックス 🗃', rate: '1.5x' },
      { id: 'box_master', label: '特級保護ボックス 🔒', rate: '3.0x' }
    ];

    const menuOptions = [];
    for (const b of boxes) {
      const owned = inventory[b.id] || 0;
      menuOptions.push({
        label: `${b.label} (所持: ${owned}個)`,
        value: `capture_use_${b.id}`,
        description: `保護倍率: ${b.rate} ${owned <= 0 ? '【在庫切れ】' : ''}`
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('capture_box_select')
      .setPlaceholder('使用する保護ボックスを選択')
      .addOptions(menuOptions);

    const embed = new EmbedBuilder()
      .setTitle('🤝 保護の実行')
      .setDescription(
        `保護ボックスを投げて、パチモンの保護を試みます。\n` +
        `どれを使いますか？`
      )
      .setColor('#4CAF50');

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('encounter_back').setLabel('キャンセル').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: [row, navRow]
    });
  }

  if (customId === 'encounter_back') {
    // Go back to encounter dashboard
    await interaction.deferUpdate();

    const activeEncounterRow = db.prepare("SELECT setting_value FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").get(userId);
    if (!activeEncounterRow) return interaction.editReply({ content: '遭遇しているパチモンがいません。', components: [] });

    const wildMonster = JSON.parse(activeEncounterRow.setting_value);
    let weatherId = 'Sunny';
    const activeWeatherRow = db.prepare("SELECT setting_value FROM settings WHERE player_id = ? AND setting_key = 'active_weather'").get(userId);
    if (activeWeatherRow) weatherId = activeWeatherRow.setting_value;

    const cardBuffer = await generateEncounterCard(wildMonster, player.current_area, weatherId);
    const attachment = new AttachmentBuilder(cardBuffer, { name: 'encounter.png' });

    const embed = new EmbedBuilder()
      .setTitle(`❗ パチモン発見！`)
      .setDescription(
        `No.${wildMonster.monster_no} **${wildMonster.name}** が現れている！\n` +
        `行動を選択してください。`
      )
      .setImage('attachment://encounter.png')
      .setColor('#FF1744');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('encounter_observe').setLabel('👀 観察').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('encounter_protect_menu').setLabel('🤝 保護').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('encounter_battle').setLabel('⚔ バトル (簡易戦闘)').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('encounter_escape').setLabel('🏃 逃げる').setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [row]
    });
  }

  // ----------------------------------------------------
  // BATTLE ENGINE (PHASE 2 PREVIEW / AUTOBATTLE IN PHASE 1)
  // ----------------------------------------------------
  if (customId === 'menu_battle') {
    await interaction.deferUpdate();
    const party = getPlayerParty(userId);

    if (party.length === 0) {
      return interaction.editReply({
        content: '手持ちのパチモンがいません。「手持ち」画面からパチモンを連れてきてください！',
        embeds: [], components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
        )]
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('⚔ 模擬バトル（トレーニングマッチ）')
      .setDescription(
        `あなたの手持ちパチモンを鍛えよう！\n` +
        `仮想の野生パチモンと模擬戦を行います。勝利すると、手持ち全員に **EXP +20** が付与されます。\n\n` +
        `バトルの先発を選択してください：`
      )
      .setColor('#F44336');

    const row = new ActionRowBuilder().addComponents(
      party.map((m, idx) => 
        new ButtonBuilder()
          .setCustomId(`battle_start_with_${m.id}`)
          .setLabel(`${m.nickname} (Lv.${m.level})`)
          .setStyle(ButtonStyle.Danger)
      )
    );

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: [row, navRow]
    });
  }

  // Start the battle simulation
  if (customId.startsWith('battle_start_with_') || customId === 'encounter_battle') {
    await interaction.deferUpdate();

    let myMonster = null;
    let wildMonster = null;

    if (customId === 'encounter_battle') {
      // Battle from investigation encounter
      const activeEncounterRow = db.prepare("SELECT setting_value FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").get(userId);
      if (!activeEncounterRow) return interaction.editReply({ content: '遭遇しているパチモンがいません。' });
      wildMonster = JSON.parse(activeEncounterRow.setting_value);

      const party = getPlayerParty(userId);
      if (party.length === 0) {
        return interaction.editReply({ content: '手持ちのパチモンがいないため、バトルを仕掛けられません！' });
      }
      myMonster = party[0]; // Auto-select first slot
    } else {
      // Training battle
      const myId = parseInt(customId.split('_')[3]);
      myMonster = db.prepare('SELECT * FROM monsters WHERE id = ? AND player_id = ?').get(myId, userId);
      
      // Spawn random wild opponent
      wildMonster = generateRandomWildMonster('FOREST', player.rank_points);
    }

    if (!myMonster) return interaction.editReply({ content: 'パチモンが見つかりません。' });

    // Initialize session and start turn-based interactive battle
    const areaId = (customId === 'encounter_battle') ? (player.current_area || 'FOREST') : 'FOREST';
    let weatherId = 'Sunny';
    const activeWeatherRow = db.prepare("SELECT setting_value FROM settings WHERE player_id = ? AND setting_key = 'active_weather'").get(userId);
    if (activeWeatherRow) {
      weatherId = activeWeatherRow.setting_value;
    }

    // Clear any existing battle session
    activeBattles.delete(userId);

    const session = {
      userId: userId,
      type: (customId === 'encounter_battle') ? 'WILD' : 'MOCK',
      myMonster: myMonster,
      opponentMonster: wildMonster,
      myHP: myMonster.hp,
      opponentHP: wildMonster.hp,
      myShield: false,
      opponentShield: false,
      myStatus: 'NONE',
      opponentStatus: 'NONE',
      mySleepTurns: 0,
      opponentSleepTurns: 0,
      areaId: areaId,
      weatherId: weatherId,
      combatLogs: ['⚔ 戦闘開始！コマンドを選択してください。'],
      turn: 1
    };

    activeBattles.set(userId, session);

    // Set player state to BATTLE
    savePlayer(userId, { current_state: 'BATTLE' });

    // Generate initial battle card image
    const cardBuffer = await generateBattleCard(
      myMonster, wildMonster, session.myHP, session.opponentHP, 
      session.myStatus, session.opponentStatus, areaId, weatherId
    );
    const attachment = new AttachmentBuilder(cardBuffer, { name: 'battle.png' });

    const embed = new EmbedBuilder()
      .setTitle(session.type === 'WILD' ? `⚔ 野生戦闘: VS ${wildMonster.name}` : `⚔ 模擬戦闘: VS ${wildMonster.name}`)
      .setDescription(session.combatLogs.join('\n'))
      .setImage('attachment://battle.png')
      .setColor('#FF5722');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('battle_action_attack').setLabel('⚔ 攻撃').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('battle_action_defense').setLabel('🛡 防御').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('battle_action_special').setLabel('✨ 特技').setStyle(ButtonStyle.Success)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [row]
    });
  }

  // ----------------------------------------------------
  // INTERACTIVE BATTLE ACTION HANDLERS
  // ----------------------------------------------------
  if (customId === 'battle_action_attack' || customId === 'battle_action_defense' || customId === 'battle_action_special') {
    await interaction.deferUpdate();
    const session = activeBattles.get(userId);

    if (!session) {
      return interaction.followUp({ content: '戦闘セッションが見つかりません。期限切れか既に終了した可能性があります。', ephemeral: true });
    }

    session.combatLogs = []; // Clear logs for this turn
    session.combatLogs.push(`**[ターン ${session.turn}]**`);

    // Reset shields at start of turn (they only last 1 turn)
    session.myShield = false;
    session.opponentShield = false;

    // --------------------------------------------------
    // 1. PLAYER'S TURN START & STATUS AILMENT CHECK
    // --------------------------------------------------
    let playerCanAct = true;

    if (session.myStatus === 'SLEEP') {
      session.mySleepTurns--;
      if (session.mySleepTurns <= 0) {
        session.myStatus = 'NONE';
        session.combatLogs.push(`💤 **${session.myMonster.nickname}** は目が覚めた！`);
      } else {
        session.combatLogs.push(`💤 **${session.myMonster.nickname}** はぐっすり眠っている...`);
        playerCanAct = false;
      }
    } else if (session.myStatus === 'PARALYSIS') {
      if (Math.random() < 0.3) {
        session.combatLogs.push(`⚡ **${session.myMonster.nickname}** は体がしびれて動けない！`);
        playerCanAct = false;
      }
    }

    // --------------------------------------------------
    // 2. PLAYER'S ACTION EXECUTION
    // --------------------------------------------------
    if (playerCanAct) {
      if (customId === 'battle_action_attack') {
        const dmg = Math.max(1, Math.floor((session.myMonster.attack * 0.5) - (session.opponentMonster.defense * 0.25) + Math.random() * 5));
        session.opponentHP -= dmg;
        session.combatLogs.push(`💥 **${session.myMonster.nickname}** の攻撃！ **${session.opponentMonster.name}** に \`${dmg}\` ダメージ！`);
      } 
      else if (customId === 'battle_action_defense') {
        session.myShield = true;
        session.combatLogs.push(`🛡 **${session.myMonster.nickname}** は守りを固めている！`);
      } 
      else if (customId === 'battle_action_special') {
        // Type-based special skill
        const type = MONSTERS[session.myMonster.monster_no]?.type || '無';
        
        if (type === '炎') {
          const dmg = Math.max(1, Math.floor((session.myMonster.attack * 0.75) - (session.opponentMonster.defense * 0.25) + Math.random() * 8));
          session.opponentHP -= dmg;
          session.combatLogs.push(`🔥 **${session.myMonster.nickname}** の **火の粉**！ **${session.opponentMonster.name}** に \`${dmg}\` 大ダメージ！`);
        } 
        else if (type === '水') {
          const dmg = Math.max(1, Math.floor((session.myMonster.attack * 0.4) - (session.opponentMonster.defense * 0.2) + Math.random() * 4));
          session.opponentHP -= dmg;
          session.myHP = Math.min(session.myMonster.max_hp, session.myHP + 15);
          session.combatLogs.push(`💧 **${session.myMonster.nickname}** の **水鉄砲**！ **${session.opponentMonster.name}** に \`${dmg}\` ダメージ！さらに自分のHPを \`15\` 回復！`);
        } 
        else if (type === '草') {
          const dmg = Math.max(1, Math.floor((session.myMonster.attack * 0.3) - (session.opponentMonster.defense * 0.2) + Math.random() * 3));
          session.opponentHP -= dmg;
          session.combatLogs.push(`🍃 **${session.myMonster.nickname}** の **毒の粉**！ **${session.opponentMonster.name}** に \`${dmg}\` ダメージ！`);
          if (session.opponentStatus === 'NONE' && Math.random() < 0.5) {
            session.opponentStatus = 'POISON';
            session.combatLogs.push(`😈 **${session.opponentMonster.name}** はどく状態になった！`);
          }
        } 
        else if (type === '雷') {
          const dmg = Math.max(2, Math.floor((session.myMonster.attack * 0.45) + Math.random() * 5)); // Ignore defense
          session.opponentHP -= dmg;
          session.combatLogs.push(`⚡ **${session.myMonster.nickname}** の **10万ボルト**！ 防御を貫通して **${session.opponentMonster.name}** に \`${dmg}\` ダメージ！`);
          if (session.opponentStatus === 'NONE' && Math.random() < 0.3) {
            session.opponentStatus = 'PARALYSIS';
            session.combatLogs.push(`⚡ **${session.opponentMonster.name}** はまひ状態になった！`);
          }
        } 
        else if (type === '鋼') {
          session.myShield = true;
          session.combatLogs.push(`🔩 **${session.myMonster.nickname}** の **鉄壁**！ ガードを完全に固めた！`);
        } 
        else if (type === '超') {
          session.combatLogs.push(`🔮 **${session.myMonster.nickname}** の **催眠術**！`);
          if (session.opponentStatus === 'NONE' && Math.random() < 0.6) {
            session.opponentStatus = 'SLEEP';
            session.opponentSleepTurns = 1 + Math.floor(Math.random() * 2);
            session.combatLogs.push(`💤 **${session.opponentMonster.name}** は眠ってしまった！`);
          } else {
            session.combatLogs.push(`🍃 しかし、術は不発に終わった。`);
          }
        } 
        else {
          let isCrit = Math.random() < 0.35;
          let mult = isCrit ? 1.5 : 1.0;
          const dmg = Math.max(1, Math.floor(((session.myMonster.attack * 0.5) - (session.opponentMonster.defense * 0.25)) * mult + Math.random() * 5));
          session.opponentHP -= dmg;
          session.combatLogs.push(`${isCrit ? '🎯 **会心の一撃！** ' : ''}⚪ **${session.myMonster.nickname}** の **体当たり**！ **${session.opponentMonster.name}** に \`${dmg}\` ダメージ！`);
        }
      }
    }

    // Check opponent death immediately
    if (session.opponentHP <= 0) {
      activeBattles.delete(userId);
      return executeBattleEnd(interaction, session, 'PLAYER');
    }

    // --------------------------------------------------
    // 4. OPPONENT'S (AI) TURN START & STATUS AILMENT CHECK
    // --------------------------------------------------
    let opponentCanAct = true;

    if (session.opponentStatus === 'SLEEP') {
      session.opponentSleepTurns--;
      if (session.opponentSleepTurns <= 0) {
        session.opponentStatus = 'NONE';
        session.combatLogs.push(`💤 **${session.opponentMonster.name}** は目が覚めた！`);
      } else {
        session.combatLogs.push(`💤 **${session.opponentMonster.name}** はぐっすり眠っている...`);
        opponentCanAct = false;
      }
    } else if (session.opponentStatus === 'PARALYSIS') {
      if (Math.random() < 0.3) {
        session.combatLogs.push(`⚡ **${session.opponentMonster.name}** は体がしびれて動けない！`);
        opponentCanAct = false;
      }
    }

    // --------------------------------------------------
    // 5. OPPONENT'S ACTION EXECUTION
    // --------------------------------------------------
    if (opponentCanAct) {
      const aiRoll = Math.random();
      
      if (aiRoll < 0.70) {
        let dmg = Math.max(1, Math.floor((session.opponentMonster.attack * 0.5) - (session.myMonster.defense * 0.25) + Math.random() * 5));
        if (session.myShield) {
          const type = MONSTERS[session.myMonster.monster_no]?.type || '無';
          if (type === '鋼' && customId === 'battle_action_special') {
            dmg = Math.max(1, Math.floor(dmg * 0.25));
            const reflect = 5 + Math.floor(Math.random() * 5);
            session.opponentHP -= reflect;
            session.combatLogs.push(`💥 **${session.opponentMonster.name}** の攻撃！ **${session.myMonster.nickname}** に \`${dmg}\` ダメージ！ (鉄壁で75%カット)`);
            session.combatLogs.push(`🔩 **${session.myMonster.nickname}** は反射ダメージで **${session.opponentMonster.name}** に \`${reflect}\` ダメージを与えた！`);
          } else {
            dmg = Math.max(1, Math.floor(dmg * 0.5));
            session.combatLogs.push(`💥 **${session.opponentMonster.name}** の攻撃！ **${session.myMonster.nickname}** に \`${dmg}\` ダメージ！ (ガードした)`);
          }
        } else {
          session.combatLogs.push(`💥 **${session.opponentMonster.name}** の攻撃！ **${session.myMonster.nickname}** に \`${dmg}\` ダメージ！`);
        }
        session.myHP -= dmg;
      } 
      else if (aiRoll < 0.85) {
        session.opponentShield = true;
        session.combatLogs.push(`🛡 **${session.opponentMonster.name}** は守りを固めている！`);
      } 
      else {
        const oppType = MONSTERS[session.opponentMonster.monster_no]?.type || '無';
        
        if (oppType === '炎') {
          let dmg = Math.max(1, Math.floor((session.opponentMonster.attack * 0.75) - (session.myMonster.defense * 0.25) + Math.random() * 8));
          if (session.myShield) dmg = Math.max(1, Math.floor(dmg * 0.5));
          session.myHP -= dmg;
          session.combatLogs.push(`🔥 **${session.opponentMonster.name}** の **火の粉**！ **${session.myMonster.nickname}** に \`${dmg}\` 大ダメージ！`);
        } 
        else if (oppType === '水') {
          let dmg = Math.max(1, Math.floor((session.opponentMonster.attack * 0.4) - (session.myMonster.defense * 0.2) + Math.random() * 4));
          if (session.myShield) dmg = Math.max(1, Math.floor(dmg * 0.5));
          session.myHP -= dmg;
          session.opponentHP = Math.min(session.opponentMonster.max_hp, session.opponentHP + 15);
          session.combatLogs.push(`💧 **${session.opponentMonster.name}** の **水鉄砲**！ **${session.myMonster.nickname}** に \`${dmg}\` ダメージ！さらにHPを \`15\` 回復！`);
        } 
        else if (oppType === '草') {
          let dmg = Math.max(1, Math.floor((session.opponentMonster.attack * 0.3) - (session.myMonster.defense * 0.2) + Math.random() * 3));
          if (session.myShield) dmg = Math.max(1, Math.floor(dmg * 0.5));
          session.myHP -= dmg;
          session.combatLogs.push(`🍃 **${session.opponentMonster.name}** の **毒の粉**！ **${session.myMonster.nickname}** に \`${dmg}\` ダメージ！`);
          if (session.myStatus === 'NONE' && Math.random() < 0.5) {
            session.myStatus = 'POISON';
            session.combatLogs.push(`😈 **${session.myMonster.nickname}** はどく状態になった！`);
          }
        } 
        else if (oppType === '雷') {
          const dmg = Math.max(2, Math.floor((session.opponentMonster.attack * 0.45) + Math.random() * 5));
          session.myHP -= dmg;
          session.combatLogs.push(`⚡ **${session.opponentMonster.name}** の **10万ボルト**！ 防御を貫通して **${session.myMonster.nickname}** に \`${dmg}\` ダメージ！`);
          if (session.myStatus === 'NONE' && Math.random() < 0.3) {
            session.myStatus = 'PARALYSIS';
            session.combatLogs.push(`⚡ **${session.myMonster.nickname}** はまひ状態になった！`);
          }
        } 
        else if (oppType === '鋼') {
          session.opponentShield = true;
          session.combatLogs.push(`🔩 **${session.opponentMonster.name}** の **鉄壁**！`);
        } 
        else if (oppType === '超') {
          session.combatLogs.push(`🔮 **${session.opponentMonster.name}** の **催眠術**！`);
          if (session.myStatus === 'NONE' && Math.random() < 0.6) {
            session.myStatus = 'SLEEP';
            session.mySleepTurns = 1 + Math.floor(Math.random() * 2);
            session.combatLogs.push(`💤 **${session.myMonster.nickname}** は眠ってしまった！`);
          } else {
            session.combatLogs.push(`🍃 しかし、術は不発に終わった。`);
          }
        } 
        else {
          let isCrit = Math.random() < 0.35;
          let mult = isCrit ? 1.5 : 1.0;
          let dmg = Math.max(1, Math.floor(((session.opponentMonster.attack * 0.5) - (session.myMonster.defense * 0.25)) * mult + Math.random() * 5));
          if (session.myShield) dmg = Math.max(1, Math.floor(dmg * 0.5));
          session.myHP -= dmg;
          session.combatLogs.push(`${isCrit ? '🎯 **会心の一撃！** ' : ''}⚪ **${session.opponentMonster.name}** の **体当たり**！ **${session.myMonster.nickname}** に \`${dmg}\` ダメージ！`);
        }
      }
    }

    // Check opponent reflect/poison death (e.g. reflection kills AI on its turn)
    if (session.opponentHP <= 0) {
      activeBattles.delete(userId);
      return executeBattleEnd(interaction, session, 'PLAYER');
    }

    // Check player death
    if (session.myHP <= 0) {
      activeBattles.delete(userId);
      return executeBattleEnd(interaction, session, 'WILD');
    }

    // --------------------------------------------------
    // 6. END OF TURN SLIP DAMAGE (POISON CHECK)
    // --------------------------------------------------
    if (session.myStatus === 'POISON') {
      const poisonDmg = Math.max(1, Math.floor(session.myMonster.max_hp * 0.10));
      session.myHP -= poisonDmg;
      session.combatLogs.push(`😈 **${session.myMonster.nickname}** は毒のダメージを受けている！ (\`-${poisonDmg}\` HP)`);
    }

    if (session.opponentStatus === 'POISON') {
      const poisonDmg = Math.max(1, Math.floor(session.opponentMonster.max_hp * 0.10));
      session.opponentHP -= poisonDmg;
      session.combatLogs.push(`😈 **${session.opponentMonster.name}** は毒 of のダメージを受けている！ (\`-${poisonDmg}\` HP)`);
    }

    // Check double death or win/lose from poison
    if (session.opponentHP <= 0 && session.myHP <= 0) {
      activeBattles.delete(userId);
      return executeBattleEnd(interaction, session, 'DRAW');
    }
    if (session.opponentHP <= 0) {
      activeBattles.delete(userId);
      return executeBattleEnd(interaction, session, 'PLAYER');
    }
    if (session.myHP <= 0) {
      activeBattles.delete(userId);
      return executeBattleEnd(interaction, session, 'WILD');
    }

    // --------------------------------------------------
    // 7. RENDER NEXT TURN
    // --------------------------------------------------
    session.turn++;

    const cardBuffer = await generateBattleCard(
      session.myMonster, session.opponentMonster, session.myHP, session.opponentHP,
      session.myStatus, session.opponentStatus, session.areaId, session.weatherId
    );
    const attachment = new AttachmentBuilder(cardBuffer, { name: 'battle.png' });

    const embed = new EmbedBuilder()
      .setTitle(session.type === 'WILD' ? `⚔ 野生戦闘: VS ${session.opponentMonster.name}` : `⚔ 模擬戦闘: VS ${session.opponentMonster.name}`)
      .setDescription(session.combatLogs.join('\n'))
      .setImage('attachment://battle.png')
      .setColor('#FF5722');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('battle_action_attack').setLabel('⚔ 攻撃').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('battle_action_defense').setLabel('🛡 防御').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('battle_action_special').setLabel('✨ 特技').setStyle(ButtonStyle.Success)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [row]
    });
  }

  // ----------------------------------------------------
  // TRADE BUTTON HANDLERS
  // ----------------------------------------------------
  if (customId.startsWith('trade_confirm_a_') || customId.startsWith('trade_confirm_b_')) {
    await interaction.deferUpdate();
    const prefix = customId.startsWith('trade_confirm_a_') ? 'trade_confirm_a_' : 'trade_confirm_b_';
    const sessionId = customId.substring(prefix.length);
    const session = activeTrades.get(sessionId);

    if (!session) {
      return interaction.followUp({ content: '交換セッションが見つかりません。期限切れかキャンセルされた可能性があります。', ephemeral: true });
    }

    if (prefix === 'trade_confirm_a_') {
      if (userId !== session.userA) {
        return interaction.followUp({ content: 'この確定ボタンは提案者（User A）のみ押せます。', ephemeral: true });
      }
      session.confirmA = true;
    } else {
      if (userId !== session.userB) {
        return interaction.followUp({ content: 'この確定ボタンは相手（User B）のみ押せます。', ephemeral: true });
      }
      session.confirmB = true;
    }

    const userAUser = await interaction.client.users.fetch(session.userA);
    const userBUser = await interaction.client.users.fetch(session.userB);
    const monsterA = db.prepare('SELECT * FROM monsters WHERE id = ?').get(session.monsterA);
    const monsterB = db.prepare('SELECT * FROM monsters WHERE id = ?').get(session.monsterB);

    if (session.confirmA && session.confirmB) {
      // Execute the trade!
      // Swap player_ids and set status to BOX
      db.prepare("UPDATE monsters SET player_id = ?, status = 'BOX' WHERE id = ?").run(session.userB, session.monsterA);
      db.prepare("UPDATE monsters SET player_id = ?, status = 'BOX' WHERE id = ?").run(session.userA, session.monsterB);

      // Clean up session
      activeTrades.delete(sessionId);

      const embed = new EmbedBuilder()
        .setTitle('🎉 交換成立！')
        .setDescription(
          `🤝 **${userAUser.username}** と **${userBUser.username}** のパチモン交換が成立しました！\n\n` +
          `**【交換内容】**\n` +
          `・**${userAUser.username}** へ: **${monsterB.nickname}** (Lv.${monsterB.level})\n` +
          `・**${userBUser.username}** へ: **${monsterA.nickname}** (Lv.${monsterA.level})\n\n` +
          `交換されたパチモンはそれぞれの**ボックス**に送られました。手持ちから編成して連れていくことができます。`
        )
        .setColor('#81C784');

      return interaction.editReply({
        embeds: [embed],
        components: []
      });
    } else {
      // Update confirmation status screen
      const embed = new EmbedBuilder()
        .setTitle('🤝 パチモン交換の最終確認')
        .setDescription(
          `以下のパチモン交換を確定しますか？\n` +
          `お互いが「交換を確定する」ボタンを押すと、交換が完了します。\n\n` +
          `**【交換内容】**\n` +
          `・**${userAUser.username}** から提供: **${monsterA.nickname}** (Lv.${monsterA.level} / ${MONSTERS[monsterA.monster_no]?.name || '不明'})\n` +
          `・**${userBUser.username}** から提供: **${monsterB.nickname}** (Lv.${monsterB.level} / ${MONSTERS[monsterB.monster_no]?.name || '不明'})\n\n` +
          `現在の確定状況:\n` +
          `・**${userAUser.username}**: ${session.confirmA ? '✅ 確定済み' : '⏳ 待機中'}\n` +
          `・**${userBUser.username}**: ${session.confirmB ? '✅ 確定済み' : '⏳ 待機中'}`
        )
        .setColor('#4CAF50');

      const buttonA = new ButtonBuilder()
        .setCustomId(`trade_confirm_a_${sessionId}`)
        .setLabel(`${userAUser.username} が確定`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(session.confirmA);

      const buttonB = new ButtonBuilder()
        .setCustomId(`trade_confirm_b_${sessionId}`)
        .setLabel(`${userBUser.username} が確定`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(session.confirmB);

      const cancelButton = new ButtonBuilder()
        .setCustomId(`trade_cancel_${sessionId}`)
        .setLabel('キャンセル')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(buttonA, buttonB, cancelButton);

      return interaction.editReply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  if (customId.startsWith('trade_cancel_')) {
    await interaction.deferUpdate();
    const sessionId = customId.substring('trade_cancel_'.length);
    activeTrades.delete(sessionId);

    return interaction.editReply({
      content: '❌ 交換申請はキャンセルされました。',
      embeds: [],
      components: []
    });
  }

  // ----------------------------------------------------
  // PVP BUTTON HANDLERS
  // ----------------------------------------------------
  if (customId.startsWith('pvp_decline_')) {
    await interaction.deferUpdate();
    const sessionId = customId.substring('pvp_decline_'.length);
    const session = activePvPs.get(sessionId);

    if (!session) {
      return interaction.followUp({ content: '対戦セッションが見つかりません。期限切れか既に終了した可能性があります。', ephemeral: true });
    }

    if (userId !== session.userB) {
      return interaction.followUp({ content: 'この操作は対戦を挑まれたプレイヤーのみ実行できます。', ephemeral: true });
    }

    activePvPs.delete(sessionId);

    return interaction.editReply({
      content: '🏃 対戦の挑戦は辞退されました。',
      embeds: [],
      components: []
    });
  }

  if (customId.startsWith('pvp_accept_')) {
    await interaction.deferUpdate();
    const sessionId = customId.substring('pvp_accept_'.length);
    const session = activePvPs.get(sessionId);

    if (!session) {
      return interaction.followUp({ content: '対戦セッションが見つかりません。期限切れか既に終了した可能性があります。', ephemeral: true });
    }

    if (userId !== session.userB) {
      return interaction.followUp({ content: 'この操作は対戦を挑まれたプレイヤーのみ実行できます。', ephemeral: true });
    }

    // Get party details
    const partyA = getPlayerParty(session.userA);
    const partyB = getPlayerParty(session.userB);

    if (partyA.length === 0 || partyB.length === 0) {
      activePvPs.delete(sessionId);
      return interaction.editReply({
        content: '❌ どちらかのプレイヤーの手持ちパチモンがいないため、対戦を開始できませんでした。',
        embeds: [],
        components: []
      });
    }

    const myMonsterA = partyA[0]; // Lead of User A
    const myMonsterB = partyB[0]; // Lead of User B

    // Simulate turn-based PvP Battle!
    let hpA = myMonsterA.hp;
    let hpB = myMonsterB.hp;
    const combatLogs = [];

    const userAUser = await interaction.client.users.fetch(session.userA);
    const userBUser = await interaction.client.users.fetch(session.userB);

    combatLogs.push(`⚔ **対戦（PvP）開始！**`);
    combatLogs.push(`・**${userAUser.username}**: **${myMonsterA.nickname}** (Lv.${myMonsterA.level} / HP: ${hpA})`);
    combatLogs.push(`・**${userBUser.username}**: **${myMonsterB.nickname}** (Lv.${myMonsterB.level} / HP: ${hpB})\n`);

    let turn = 1;
    // Determine order by speed
    let first = myMonsterA.speed >= myMonsterB.speed ? 'A' : 'B';

    while (hpA > 0 && hpB > 0 && turn <= 15) {
      combatLogs.push(`**[ターン ${turn}]**`);
      
      if (first === 'A') {
        // A attacks B
        const dmg = Math.max(1, Math.floor((myMonsterA.attack * 0.5) - (myMonsterB.defense * 0.2) + Math.random() * 5));
        hpB -= dmg;
        combatLogs.push(`💥 **${myMonsterA.nickname}** の攻撃！ **${myMonsterB.nickname}** に \`${dmg}\` ダメージを与えた！ (残HP: ${Math.max(0, hpB)})`);
        
        if (hpB <= 0) break;

        // B attacks A
        const dmgB = Math.max(1, Math.floor((myMonsterB.attack * 0.5) - (myMonsterA.defense * 0.2) + Math.random() * 5));
        hpA -= dmgB;
        combatLogs.push(`💥 **${myMonsterB.nickname}** の攻撃！ **${myMonsterA.nickname}** に \`${dmgB}\` ダメージを与えた！ (残HP: ${Math.max(0, hpA)})`);
      } else {
        // B attacks A
        const dmgB = Math.max(1, Math.floor((myMonsterB.attack * 0.5) - (myMonsterA.defense * 0.2) + Math.random() * 5));
        hpA -= dmgB;
        combatLogs.push(`💥 **${myMonsterB.nickname}** の攻撃！ **${myMonsterA.nickname}** に \`${dmgB}\` ダメージを与えた！ (残HP: ${Math.max(0, hpA)})`);
        
        if (hpA <= 0) break;

        // A attacks B
        const dmg = Math.max(1, Math.floor((myMonsterA.attack * 0.5) - (myMonsterB.defense * 0.2) + Math.random() * 5));
        hpB -= dmg;
        combatLogs.push(`💥 **${myMonsterA.nickname}** の攻撃！ **${myMonsterB.nickname}** に \`${dmg}\` ダメージを与えた！ (残HP: ${Math.max(0, hpB)})`);
      }
      
      combatLogs.push('');
      turn++;
    }

    let winner = null;
    let winnerUserId = null;
    let loserUserId = null;
    let winnerMonsterName = '';
    let winnerUsername = '';

    if (hpA <= 0) {
      winner = 'B';
      winnerUserId = session.userB;
      loserUserId = session.userA;
      winnerMonsterName = myMonsterB.nickname;
      winnerUsername = userBUser.username;
      combatLogs.push(`\n🏆 **${userBUser.username} の勝利！**`);
    } else if (hpB <= 0) {
      winner = 'A';
      winnerUserId = session.userA;
      loserUserId = session.userB;
      winnerMonsterName = myMonsterA.nickname;
      winnerUsername = userAUser.username;
      combatLogs.push(`\n🏆 **${userAUser.username} の勝利！**`);
    } else {
      combatLogs.push(`\n⏳ **引き分け！制限ターン数に達しました。**`);
    }

    // Award XP and rewards
    let rewardMsg = '';
    if (winner) {
      // Winner reward: $100 and 50 points
      const winnerPlayer = getPlayer(winnerUserId);
      const loserPlayer = getPlayer(loserUserId);
      savePlayer(winnerUserId, { money: winnerPlayer.money + 100, rank_points: winnerPlayer.rank_points + 50 });
      savePlayer(loserUserId, { money: loserPlayer.money + 20 }); // Consolation prize

      // Award XP to winner monster
      const xpGained = 30 + Math.floor(myMonsterA.level * 2);
      const winningMonster = winner === 'A' ? myMonsterA : myMonsterB;
      
      const getXPNeeded = (l) => Math.floor(50 * Math.pow(l, 1.4));
      let newLvl = winningMonster.level;
      let finalXP = winningMonster.exp + xpGained;
      let leveledUp = false;

      while (true) {
        const needed = getXPNeeded(newLvl);
        if (finalXP >= needed) {
          finalXP -= needed;
          newLvl += 1;
          leveledUp = true;
        } else {
          break;
        }
      }

      if (leveledUp) {
        const newStats = calculateMonsterStats(winningMonster.monster_no, newLvl, winningMonster.personality);
        db.prepare(`
          UPDATE monsters SET 
            level = ?, exp = ?, hp = ?, max_hp = ?,
            attack = ?, defense = ?, speed = ?, intelligence = ?, charm = ?
          WHERE id = ?
        `).run(
          newLvl, finalXP, newStats.hp, newStats.max_hp,
          newStats.attack, newStats.defense, newStats.speed, newStats.intelligence, newStats.charm,
          winningMonster.id
        );
        rewardMsg = `\n🌟 **${winningMonster.nickname}** は \`${xpGained}\` EXPを獲得！ **Lv.${winningMonster.level} ➡️ Lv.${newLvl}** に上がった！\n` +
                    `🪙 **${winnerUsername}** は勝利報酬として **$100** & **50P** を獲得しました！\n` +
                    `🪙 敗者にも参加賞として **$20** が贈られます。`;
      } else {
        db.prepare('UPDATE monsters SET exp = ? WHERE id = ?').run(finalXP, winningMonster.id);
        rewardMsg = `\n🌟 **${winningMonster.nickname}** は \`${xpGained}\` EXPを獲得しました！\n` +
                    `🪙 **${winnerUsername}** は勝利報酬として **$100** & **50P** を獲得しました！\n` +
                    `🪙 敗者にも参加賞として **$20** が贈られます。`;
      }
    } else {
      rewardMsg = `\n🪙 引き分けのため、双方に参加賞として **$20** が贈られます。`;
      const playerA = getPlayer(session.userA);
      const playerB = getPlayer(session.userB);
      savePlayer(session.userA, { money: playerA.money + 20 });
      savePlayer(session.userB, { money: playerB.money + 20 });
    }

    activePvPs.delete(sessionId);

    const embed = new EmbedBuilder()
      .setTitle('⚔ 対戦結果')
      .setDescription(
        combatLogs.join('\n') + `\n` + rewardMsg
      )
      .setColor('#FF5722');

    return interaction.editReply({
      embeds: [embed],
      components: []
    });
  }
}

/**
 * Executes post-combat rewards, experience gains, level curves, and resets status states
 */
async function executeBattleEnd(interaction, session, winner) {
  const userId = session.userId;
  const myMonster = session.myMonster;
  const wildMonster = session.opponentMonster;
  const player = getPlayer(userId);

  const combatLogs = [];
  let xpMsg = '';
  let rewardMsg = '';

  if (winner === 'PLAYER') {
    combatLogs.push(`🏆 **味方の勝利！**`);
    
    // Award XP
    const xpGained = 20 + Math.floor(myMonster.level * 1.5);
    const getXPNeeded = (l) => Math.floor(50 * Math.pow(l, 1.4));
    let newLvl = myMonster.level;
    let finalXP = myMonster.exp + xpGained;
    let leveledUp = false;

    while (true) {
      const needed = getXPNeeded(newLvl);
      if (finalXP >= needed) {
        finalXP -= needed;
        newLvl += 1;
        leveledUp = true;
      } else {
        break;
      }
    }

    if (leveledUp) {
      const newStats = calculateMonsterStats(myMonster.monster_no, newLvl, myMonster.personality);
      db.prepare(`
        UPDATE monsters SET 
          level = ?, exp = ?, hp = ?, max_hp = ?,
          attack = ?, defense = ?, speed = ?, intelligence = ?, charm = ?
        WHERE id = ?
      `).run(
        newLvl, finalXP, newStats.hp, newStats.max_hp,
        newStats.attack, newStats.defense, newStats.speed, newStats.intelligence, newStats.charm,
        myMonster.id
      );
      xpMsg = `🌟 **${myMonster.nickname}** は \`${xpGained}\` EXPを獲得！ **Lv.${myMonster.level} ➡️ Lv.${newLvl}** に上がった！`;
    } else {
      db.prepare('UPDATE monsters SET exp = ? WHERE id = ?').run(finalXP, myMonster.id);
      xpMsg = `🌟 **${myMonster.nickname}** は \`${xpGained}\` EXPを獲得しました！`;
    }

    // Money reward
    const moneyGained = 30 + Math.floor(Math.random() * 20);
    savePlayer(userId, { money: player.money + moneyGained });
    rewardMsg = `🪙 勝利報酬として **$${moneyGained}** を獲得！`;

    // Clear active encounter if it was wild
    if (session.type === 'WILD') {
      db.prepare("DELETE FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").run(userId);
    }
  } else if (winner === 'WILD') {
    combatLogs.push(`💀 **味方の敗北...**`);
    xpMsg = `🌟 経験値は得られませんでした。もっとトレーニングしよう！`;
    if (session.type === 'WILD') {
      db.prepare("DELETE FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").run(userId);
    }
  } else {
    combatLogs.push(`⏳ **引き分け！**`);
    if (session.type === 'WILD') {
      db.prepare("DELETE FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").run(userId);
    }
  }

  // Clear player state back to IDLE
  savePlayer(userId, { current_state: 'IDLE' });

  const embed = new EmbedBuilder()
    .setTitle(session.type === 'WILD' ? `⚔ バトル結果: VS ${wildMonster.name}` : '⚔ 模擬戦結果')
    .setDescription(
      combatLogs.join('\n') + `\n\n` + xpMsg + `\n` + rewardMsg
    )
    .setColor(winner === 'PLAYER' ? '#4CAF50' : '#F44336');

  const buttons = [];
  if (session.type === 'WILD' && player.current_area) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('explore_proceed')
        .setLabel('👣 調査を続ける')
        .setStyle(ButtonStyle.Success)
    );
  }
  buttons.push(
    new ButtonBuilder()
      .setCustomId(session.type === 'WILD' ? 'explore_leave' : 'menu_battle')
      .setLabel(session.type === 'WILD' ? '本部に戻る' : 'もう一度バトルする')
      .setStyle(ButtonStyle.Primary)
  );

  const row = new ActionRowBuilder().addComponents(buttons);

  return interaction.editReply({
    embeds: [embed],
    files: [], // Clear card image from result
    components: [row]
  });
}
