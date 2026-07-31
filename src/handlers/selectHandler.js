import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, StringSelectMenuBuilder } from 'discord.js';
import { 
  getPlayer, savePlayer, createMonster, 
  getEncyclopedia, getInventory, updateInventoryItem, 
  updateMissionProgress, updateEncyclopedia, getPlayerParty,
  getPlayerMonsters
} from '../database.js';
import { MONSTERS, AREAS, ITEMS, WEATHERS } from '../config.js';
import { calculateCaptureChance, calculateMonsterStats } from '../utils/helpers.js';
import { generateEncounterCard, generateMonsterDetailCard } from '../utils/canvasGenerator.js';
import { db } from '../database.js';
import { handleButton } from './buttonHandler.js';
import { activeTrades } from '../utils/sessionManager.js';

export async function handleSelect(interaction) {
  const userId = interaction.user.id;
  const customId = interaction.customId;
  const selectedValue = interaction.values[0];

  const player = getPlayer(userId);
  if (!player) {
    return interaction.reply({
      content: '調査員データが見つかりません。まずは \`/start\` から登録してください。',
      ephemeral: true
    });
  }

  // ----------------------------------------------------
  // ZUKAN SELECT MENU HANDLER
  // ----------------------------------------------------
  if (customId === 'zukan_select') {
    await interaction.deferUpdate();
    const monsterNo = parseInt(selectedValue.split('_')[2]);
    const template = MONSTERS[monsterNo];

    if (!template) {
      return interaction.editReply({ content: '無効な図鑑番号です。', components: [] });
    }

    const zukan = getEncyclopedia(userId);
    const status = zukan[monsterNo] || 'LOCKED'; // SEEN, PROTECTED, LOCKED

    const cardBuffer = await generateMonsterDetailCard(template, null, status);
    const attachment = new AttachmentBuilder(cardBuffer, { name: 'zukan_card.png' });

    const embed = new EmbedBuilder()
      .setTitle(`📖 図鑑詳細: No.${String(monsterNo).padStart(3, '0')} ${template.name}`)
      .setImage('attachment://zukan_card.png')
      .setColor('#9E9E9E');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('menu_zukan')
        .setLabel('図鑑リストに戻る')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('menu_mypage')
        .setLabel('本部へ戻る')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [row]
    });
  }

  // ----------------------------------------------------
  // AREA SELECT MENU HANDLER
  // ----------------------------------------------------
  if (customId === 'area_select') {
    await interaction.deferUpdate();
    const areaId = selectedValue.split('_').slice(2).join('_');
    const area = AREAS[areaId];

    if (!area) {
      return interaction.editReply({ content: '無効なエリアです。', components: [] });
    }

    // Set player current area & state
    savePlayer(userId, { current_area: areaId, current_state: 'INVESTIGATING' });

    // Roll initial weather
    const wChoices = Object.keys(area.weatherChance);
    const wRates = Object.values(area.weatherChance);
    const wRand = Math.random();
    let wSum = 0;
    let weatherId = 'Sunny';
    for (let i = 0; i < wChoices.length; i++) {
      wSum += wRates[i];
      if (wRand <= wSum) {
        weatherId = wChoices[i];
        break;
      }
    }

    // Save weather in settings
    db.prepare("INSERT OR REPLACE INTO settings (player_id, setting_key, setting_value) VALUES (?, 'active_weather', ?)").run(userId, weatherId);

    const weather = WEATHERS[weatherId];

    const embed = new EmbedBuilder()
      .setTitle(`${area.emoji} ${area.name} に到着！`)
      .setDescription(
        `周辺の調査を開始します。\n\n` +
        `**【現在の天候】** ${weather.emoji} **${weather.name}**\n` +
        `準備ができたら「進む」ボタンをタップして調査を進めましょう！`
      )
      .setColor('#4CAF50')
      .setFooter({ text: 'ボタン操作で進行します' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('explore_proceed').setLabel('👣 進む').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('explore_leave').setLabel('🏃 本部に戻る').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      files: [],
      components: [row]
    });
  }

  // ----------------------------------------------------
  // CAPTURE BOX SELECT MENU HANDLER
  // ----------------------------------------------------
  if (customId === 'capture_box_select') {
    await interaction.deferUpdate();
    const boxItemId = selectedValue.split('_').slice(2).join('_'); // box_normal, box_super, box_master

    const inventory = getInventory(userId);
    const boxCount = inventory[boxItemId] || 0;

    if (boxCount <= 0) {
      return interaction.editReply({
        content: `❌ **${ITEMS[boxItemId].name}** の在庫がありません！他のボックスを選択するか、観察に戻ってください。`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('encounter_protect_menu').setLabel('選び直す').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('encounter_back').setLabel('観察に戻る').setStyle(ButtonStyle.Danger)
          )
        ]
      });
    }

    // Deduct 1 box from inventory
    updateInventoryItem(userId, boxItemId, -1);

    // Retrieve active encounter & weather
    const activeEncounterRow = db.prepare("SELECT setting_value FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").get(userId);
    if (!activeEncounterRow) return interaction.editReply({ content: '遭遇しているパチモンがいません。', components: [] });
    const wildMonster = JSON.parse(activeEncounterRow.setting_value);

    let weatherId = 'Sunny';
    const activeWeatherRow = db.prepare("SELECT setting_value FROM settings WHERE player_id = ? AND setting_key = 'active_weather'").get(userId);
    if (activeWeatherRow) weatherId = activeWeatherRow.setting_value;

    // Calculate Capture Success Chance
    const chance = calculateCaptureChance(wildMonster, boxItemId, null, weatherId);
    const rand = Math.random();

    if (rand <= chance) {
      // SUCCESS!
      // Create the monster instance
      const stats = calculateMonsterStats(wildMonster.monster_no, wildMonster.level, wildMonster.personality);
      const monsterData = {
        monster_no: wildMonster.monster_no,
        nickname: wildMonster.name,
        level: wildMonster.level,
        exp: 0,
        hp: stats.hp,
        max_hp: stats.max_hp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        intelligence: stats.intelligence,
        charm: stats.charm,
        personality: wildMonster.personality,
        favorite_food: wildMonster.favorite_food,
        status: 'BOX' // Default to storage box
      };

      const capturedMonster = createMonster(userId, monsterData);
      
      // Upgrade zukan status
      updateEncyclopedia(userId, wildMonster.monster_no, 'PROTECTED');

      // Update Capture mission progress
      updateMissionProgress(userId, 'CAPTURE', 'ANY');

      // Clear encounter & set state to IDLE
      db.prepare("DELETE FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").run(userId);
      savePlayer(userId, { current_state: 'IDLE' });

      // Generate card showing captured monster details
      const zukanTemplate = MONSTERS[wildMonster.monster_no];
      const cardBuffer = await generateMonsterDetailCard(zukanTemplate, capturedMonster, 'PROTECTED');
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'captured.png' });

      const successEmbed = new EmbedBuilder()
        .setTitle(`🎉 保護成功！`)
        .setDescription(
          `おめでとう！ **${wildMonster.name}** (Lv.${wildMonster.level}) の保護に成功しました！\n` +
          `このパチモンはボックスに送られました。手持ちに加えることで育成できます。\n` +
          `図鑑データが更新されました。`
        )
        .setImage('attachment://captured.png')
        .setColor('#4CAF50');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('menu_mypage').setLabel('本部に戻る').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('menu_investigate').setLabel('探索を続ける').setStyle(ButtonStyle.Success)
      );

      return interaction.editReply({
        embeds: [successEmbed],
        files: [attachment],
        components: [row]
      });

    } else {
      // FAILURE!
      // Increase caution
      const oldCaution = wildMonster.caution;
      const cautionInc = 15 + Math.floor(Math.random() * 10);
      wildMonster.caution = Math.min(100, wildMonster.caution + cautionInc);

      // Check if runs away (25% chance if caution is above 75)
      const ranAway = wildMonster.caution >= 75 && Math.random() < 0.25;

      if (ranAway) {
        // Runs away
        db.prepare("DELETE FROM settings WHERE player_id = ? AND setting_key = 'active_encounter'").run(userId);
        savePlayer(userId, { current_state: 'IDLE' });

        const escapeEmbed = new EmbedBuilder()
          .setTitle(`💨 逃げ出されてしまった...`)
          .setDescription(
            `ボックスが跳ね除けられた！\n` +
            `警戒心が高まった **${wildMonster.name}** は驚いて走り去ってしまった...`
          )
          .setColor('#78909C');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('menu_mypage').setLabel('本部に戻る').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('menu_investigate').setLabel('他の場所を調査').setStyle(ButtonStyle.Success)
        );

        return interaction.editReply({
          embeds: [escapeEmbed],
          files: [],
          components: [row]
        });
      } else {
        // Stays but caution increases
        db.prepare("INSERT OR REPLACE INTO settings (player_id, setting_key, setting_value) VALUES (?, 'active_encounter', ?)").run(userId, JSON.stringify(wildMonster));

        const cardBuffer = await generateEncounterCard(wildMonster, player.current_area, weatherId);
        const attachment = new AttachmentBuilder(cardBuffer, { name: 'encounter.png' });

        const failEmbed = new EmbedBuilder()
          .setTitle(`⚠️ 保護失敗！`)
          .setDescription(
            `カチッ... ボックスに入りきらず逃れ出た！\n` +
            `**${wildMonster.name}** はかなり警戒しているようだ... (\`警戒度: ${oldCaution}% ➡️ ${wildMonster.caution}%\`)`
          )
          .setImage('attachment://encounter.png')
          .setColor('#FF5722');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('encounter_observe').setLabel('👀 観察').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('encounter_protect_menu').setLabel('🤝 保護').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('encounter_battle').setLabel('⚔ バトル (簡易戦闘)').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('encounter_escape').setLabel('🏃 逃げる').setStyle(ButtonStyle.Secondary)
        );

        return interaction.editReply({
          embeds: [failEmbed],
          files: [attachment],
          components: [row]
        });
      }
    }
  }

  // ----------------------------------------------------
  // PARTY ADD SELECT HANDLER
  // ----------------------------------------------------
  if (customId === 'party_add_select') {
    const monsterId = parseInt(selectedValue.split('_')[2]);

    const party = getPlayerParty(userId);
    if (party.length >= 3) {
      return interaction.followUp({ content: '手持ちは最大3匹までです。預けてから追加してください。', ephemeral: true });
    }

    // Find the first empty slot number (PARTY_1, PARTY_2, PARTY_3)
    const existingSlots = party.map(m => m.status);
    let targetSlot = 'PARTY_1';
    for (let i = 1; i <= 3; i++) {
      const slot = `PARTY_${i}`;
      if (!existingSlots.includes(slot)) {
        targetSlot = slot;
        break;
      }
    }

    db.prepare('UPDATE monsters SET status = ? WHERE id = ? AND player_id = ?').run(targetSlot, monsterId, userId);

    // Refresh party screen
    const wrappedInteraction = Object.create(interaction);
    wrappedInteraction.customId = 'menu_party';
    return handleButton(wrappedInteraction);
  }

  // ----------------------------------------------------
  // SHOP ITEM SELECT HANDLER
  // ----------------------------------------------------
  if (customId === 'shop_item_select') {
    await interaction.deferUpdate();
    const itemId = selectedValue.split('_').slice(2).join('_'); // e.g. box_normal
    const item = ITEMS[itemId];

    if (!item) {
      return interaction.followUp({ content: '無効なアイテムです。', ephemeral: true });
    }

    if (player.money < item.price) {
      const embed = new EmbedBuilder()
        .setTitle('🪙 よろず屋（アイテムショップ）')
        .setDescription(
          `❌ **所持金が足りません！**\n` +
          `**${item.name}** を購入するには **$${item.price}** 必要ですが、あなたの所持金は **$${player.money}** です。\n\n` +
          `現在の所持金: **$${player.money.toLocaleString()}**`
        )
        .setColor('#F44336');

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_item_select')
        .setPlaceholder('購入するアイテムを選択してください')
        .addOptions(
          Object.values(ITEMS).map(i => ({
            label: `${i.name} ($${i.price})`,
            value: `shop_buy_${i.id}`,
            emoji: i.emoji,
            description: i.desc.substring(0, 50)
          }))
        );

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);
      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
      );

      return interaction.editReply({
        embeds: [embed],
        components: [selectRow, navRow]
      });
    }

    // Deduct money and add item to inventory
    const newMoney = player.money - item.price;
    savePlayer(userId, { money: newMoney });
    updateInventoryItem(userId, itemId, 1);

    const embed = new EmbedBuilder()
      .setTitle('🪙 よろず屋（アイテムショップ）')
      .setDescription(
        `✅ **${item.emoji} ${item.name}** を 1 個購入しました！（-$${item.price}）\n\n` +
        `現在の所持金: **$${newMoney.toLocaleString()}**`
      )
      .setColor('#FFD700');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('shop_item_select')
      .setPlaceholder('続けて購入するアイテムを選択してください')
      .addOptions(
        Object.values(ITEMS).map(i => ({
          label: `${i.name} ($${i.price})`,
          value: `shop_buy_${i.id}`,
          emoji: i.emoji,
          description: i.desc.substring(0, 50)
        }))
      );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('menu_mypage').setLabel('戻る').setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      components: [selectRow, navRow]
    });
  }

  // ----------------------------------------------------
  // TRADE SELECT A HANDLER (User A selects their monster)
  // ----------------------------------------------------
  if (customId.startsWith('trade_select_a_')) {
    await interaction.deferUpdate();
    const sessionId = customId.substring('trade_select_a_'.length);
    const session = activeTrades.get(sessionId);

    if (!session) {
      return interaction.followUp({ content: '交換セッションが見つかりません。期限切れかキャンセルされた可能性があります。', ephemeral: true });
    }

    if (interaction.user.id !== session.userA) {
      return interaction.followUp({ content: 'この操作は提案者のみ実行できます。', ephemeral: true });
    }

    const monsterId = parseInt(selectedValue.split('_').slice(3).join('_')); // e.g. trade_val_a_12 -> 12
    const monster = db.prepare('SELECT * FROM monsters WHERE id = ? AND player_id = ?').get(monsterId, session.userA);

    if (!monster) {
      return interaction.followUp({ content: '選択したパチモンが見つかりません。', ephemeral: true });
    }

    session.monsterA = monster.id;

    // Get User B's monsters
    const monstersB = getPlayerMonsters(session.userB);
    const userBUser = await interaction.client.users.fetch(session.userB);

    if (monstersB.length === 0) {
      activeTrades.delete(sessionId);
      return interaction.editReply({
        content: `❌ **${userBUser.username}** さんは交換に出せるパチモンを1匹も持っていないため、交換を継続できません。`,
        embeds: [],
        components: []
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🤝 パチモン交換の申請')
      .setDescription(
        `**提案内容:**\n` +
        `・**${interaction.user.username}**: **${monster.nickname}** (Lv.${monster.level}) を提示しました。\n\n` +
        `次に、対戦相手である **${userBUser.username}** が、交換に出すパチモンを以下のセレクトメニューから選択してください。`
      )
      .setColor('#FF9800');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`trade_select_b_${sessionId}`)
      .setPlaceholder('交換に出す自分のパチモンを選択...')
      .addOptions(
        monstersB.slice(0, 25).map(m => ({
          label: `${m.nickname} (Lv.${m.level})`,
          value: `trade_val_b_${m.id}`,
          description: `タイプ: ${MONSTERS[m.monster_no]?.type || '不明'} | 性格: ${m.personality}`
        }))
      );

    const cancelButton = new ButtonBuilder()
      .setCustomId(`trade_cancel_${sessionId}`)
      .setLabel('キャンセル')
      .setStyle(ButtonStyle.Danger);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(cancelButton);

    return interaction.editReply({
      embeds: [embed],
      components: [row1, row2]
    });
  }

  // ----------------------------------------------------
  // TRADE SELECT B HANDLER (User B selects their monster)
  // ----------------------------------------------------
  if (customId.startsWith('trade_select_b_')) {
    await interaction.deferUpdate();
    const sessionId = customId.substring('trade_select_b_'.length);
    const session = activeTrades.get(sessionId);

    if (!session) {
      return interaction.followUp({ content: '交換セッションが見つかりません。期限切れかキャンセルされた可能性があります。', ephemeral: true });
    }

    if (interaction.user.id !== session.userB) {
      return interaction.followUp({ content: 'この操作は申請された相手のみ実行できます。', ephemeral: true });
    }

    const monsterId = parseInt(selectedValue.split('_').slice(3).join('_')); // e.g. trade_val_b_15 -> 15
    const monster = db.prepare('SELECT * FROM monsters WHERE id = ? AND player_id = ?').get(monsterId, session.userB);

    if (!monster) {
      return interaction.followUp({ content: '選択したパチモンが見つかりません。', ephemeral: true });
    }

    session.monsterB = monster.id;

    const userAUser = await interaction.client.users.fetch(session.userA);
    const monsterA = db.prepare('SELECT * FROM monsters WHERE id = ?').get(session.monsterA);

    const embed = new EmbedBuilder()
      .setTitle('🤝 パチモン交換の最終確認')
      .setDescription(
        `以下のパチモン交換を確定しますか？\n` +
        `お互いが「交換を確定する」ボタンを押すと、交換が完了します。\n\n` +
        `**【交換内容】**\n` +
        `・**${userAUser.username}** から提供: **${monsterA.nickname}** (Lv.${monsterA.level} / ${MONSTERS[monsterA.monster_no]?.name || '不明'})\n` +
        `・**${interaction.user.username}** から提供: **${monster.nickname}** (Lv.${monster.level} / ${MONSTERS[monster.monster_no]?.name || '不明'})\n\n` +
        `現在の確定状況:\n` +
        `・**${userAUser.username}**: ${session.confirmA ? '✅ 確定済み' : '⏳ 待機中'}\n` +
        `・**${interaction.user.username}**: ${session.confirmB ? '✅ 確定済み' : '⏳ 待機中'}`
      )
      .setColor('#4CAF50');

    const buttonA = new ButtonBuilder()
      .setCustomId(`trade_confirm_a_${sessionId}`)
      .setLabel(`${userAUser.username} が確定`)
      .setStyle(ButtonStyle.Success);

    const buttonB = new ButtonBuilder()
      .setCustomId(`trade_confirm_b_${sessionId}`)
      .setLabel(`${interaction.user.username} が確定`)
      .setStyle(ButtonStyle.Success);

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
