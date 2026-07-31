import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getPlayer, getPlayerParty, getEncyclopedia } from '../database.js';
import { getRankName } from '../utils/helpers.js';
import { generateProfileCard } from '../utils/canvasGenerator.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('自分の調査員ライセンス（ステータス）を表示します。');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const player = getPlayer(userId);

  if (!player) {
    return interaction.reply({
      content: `調査員登録がされていません。まずは \`/start\` コマンドを入力して登録を行ってください！`,
      ephemeral: true
    });
  }

  await interaction.deferReply();

  try {
    const party = getPlayerParty(userId);
    const zukan = getEncyclopedia(userId);
    const zukanCount = Object.keys(zukan).filter(no => zukan[no] === 'PROTECTED').length;
    const rankName = getRankName(player.rank_points);

    const cardBuffer = await generateProfileCard(player, rankName, party, zukanCount);
    const attachment = new AttachmentBuilder(cardBuffer, { name: 'profile_card.png' });

    const embed = new EmbedBuilder()
      .setTitle(`🏠 ${player.username} の調査員プロフィール`)
      .setImage('attachment://profile_card.png')
      .setColor('#00E5FF')
      .setFooter({ text: 'パチモン調査隊本部' });

    await interaction.editReply({
      embeds: [embed],
      files: [attachment]
    });
  } catch (error) {
    console.error('Error generating profile:', error);
    await interaction.editReply({
      content: `プロフィールの生成中にエラーが発生しました: ${error.message}`
    });
  }
}
