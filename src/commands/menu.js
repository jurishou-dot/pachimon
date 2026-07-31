import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getPlayer, getPlayerParty, getEncyclopedia } from '../database.js';
import { getRankName } from '../utils/helpers.js';
import { generateProfileCard } from '../utils/canvasGenerator.js';

export const data = new SlashCommandBuilder()
  .setName('menu')
  .setDescription('調査隊本部のメニュー画面を開きます。');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const player = getPlayer(userId);

  if (!player) {
    return interaction.reply({
      content: `調査員登録がされていません。まずは \`/start\` コマンドを入力して登録を行ってください！`,
      ephemeral: true
    });
  }

  // Defer reply because Canvas rendering is sync and might take ~50-100ms
  await interaction.deferReply();

  try {
    const party = getPlayerParty(userId);
    const zukan = getEncyclopedia(userId);
    const zukanCount = Object.keys(zukan).filter(no => zukan[no] === 'PROTECTED').length;
    const rankName = getRankName(player.rank_points);

    const cardBuffer = await generateProfileCard(player, rankName, party, zukanCount);
    const attachment = new AttachmentBuilder(cardBuffer, { name: 'profile_card.png' });

    const embed = new EmbedBuilder()
      .setTitle('🏠 パチモン調査隊 本部ダッシュボード')
      .setDescription(
        `新人調査員 **${player.username}**、今日の調査目標は決まったか？\n` +
        `下のボタンから調査に行ったり、コーデックスの確認やお世話ができるぞ！`
      )
      .setImage('attachment://profile_card.png')
      .setColor('#00E5FF')
      .setFooter({ text: 'パチモン調査隊本部 • ボタンをタップして選択' });

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

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [row1, row2]
    });
  } catch (error) {
    console.error('Error generating main menu:', error);
    await interaction.editReply({
      content: `本部メニューを開く際にエラーが発生しました: ${error.message}`
    });
  }
}
