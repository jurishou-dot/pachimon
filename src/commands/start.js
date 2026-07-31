import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getPlayer } from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('新人調査員の登録を行い、最初のパチモンを選びます。');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const player = getPlayer(userId);

  if (player) {
    return interaction.reply({
      content: `すでに調査員登録されています！ \`/menu\` コマンドを入力して本部メニューを開いてください。`,
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('🛸 パチモン調査隊へようこそ！')
    .setDescription(
      `君は今日から「パチモン調査隊」の新人調査員だ！\n` +
      `世界中に潜む怪しい偽物の生き物「パチモン」を調査、保護、育成して図鑑完成を目指そう。\n\n` +
      `**最初の相棒パチモンを下の3体から選択してください：**`
    )
    .setColor('#00E5FF')
    .addFields([
      { name: '🌱 草タイプ: タマネギマキ', value: '頭部のタマネギが涙を誘う泣き虫なパチモン。', inline: true },
      { name: '⚡ 電タイプ: コンセントラ', value: '虎柄のプラグ型パチモン。コンセントの隙間に潜む。', inline: true },
      { name: '💧 水タイプ: ミズモチ', value: 'ぷるぷるとした水のお餅。つつくと水が吹き出す。', inline: true }
    ])
    .setFooter({ text: 'パチモン調査隊本部 • Phase 1' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('starter_1')
      .setLabel('タマネギマキを選択')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🌱'),
    new ButtonBuilder()
      .setCustomId('starter_2')
      .setLabel('コンセントラを選択')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⚡'),
    new ButtonBuilder()
      .setCustomId('starter_5')
      .setLabel('ミズモチを選択')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💧')
  );

  await interaction.reply({
    embeds: [embed],
    components: [row]
  });
}
