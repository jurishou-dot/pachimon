import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getPlayer, getPlayerParty } from '../database.js';
import { activePvPs } from '../utils/sessionManager.js';

export const data = new SlashCommandBuilder()
  .setName('pvp')
  .setDescription('フレンドにパチモン対戦（PvP）を挑みます。')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('対戦相手のユーザーを選択してください')
      .setRequired(true)
  );

export async function execute(interaction) {
  const userA = interaction.user;
  const userB = interaction.options.getUser('user');

  if (userA.id === userB.id) {
    return interaction.reply({ content: '自分自身と対戦することはできません。', ephemeral: true });
  }

  const playerA = getPlayer(userA.id);
  const playerB = getPlayer(userB.id);

  if (!playerA) {
    return interaction.reply({ content: 'あなたの調査員データが見つかりません。まずは `/start` コマンドで登録してください。', ephemeral: true });
  }

  if (!playerB) {
    return interaction.reply({ content: '相手の調査員データが見つかりません。相手が先に `/start` コマンドで登録する必要があります。', ephemeral: true });
  }

  const partyA = getPlayerParty(userA.id);
  const partyB = getPlayerParty(userB.id);

  if (partyA.length === 0) {
    return interaction.reply({ content: 'あなたのもとに戦える手持ちパチモンがいません。', ephemeral: true });
  }

  if (partyB.length === 0) {
    return interaction.reply({ content: '対戦相手の調査員の手持ちに戦えるパチモンがいません。', ephemeral: true });
  }

  const sessionId = `${userA.id}_${userB.id}`;
  
  // Cleanup any old session
  activePvPs.delete(sessionId);

  activePvPs.set(sessionId, {
    userA: userA.id,
    userB: userB.id
  });

  const embed = new EmbedBuilder()
    .setTitle('⚔ パチモン対戦（PvP）の挑戦')
    .setDescription(
      `🔥 **${userA.username}** が **${userB.username}** にパチモンバトルを挑みました！\n\n` +
      `**対戦予定の先頭パチモン:**\n` +
      `・**${userA.username}** の先頭: **${partyA[0].nickname}** (Lv.${partyA[0].level})\n` +
      `・**${userB.username}** の先頭: **${partyB[0].nickname}** (Lv.${partyB[0].level})\n\n` +
      `**${userB.username}** さん、挑戦を受諾しますか？`
    )
    .setColor('#F44336');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pvp_accept_${sessionId}`)
      .setLabel('受けて立つ ⚔')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`pvp_decline_${sessionId}`)
      .setLabel('辞退する 🏃')
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.reply({
    embeds: [embed],
    components: [row]
  });
}
