import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getPlayer, getPlayerMonsters } from '../database.js';
import { activeTrades } from '../utils/sessionManager.js';
import { MONSTERS } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('trade')
  .setDescription('フレンドとパチモンを交換します。')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('交換相手のユーザーを選択してください')
      .setRequired(true)
  );

export async function execute(interaction) {
  const userA = interaction.user;
  const userB = interaction.options.getUser('user');

  if (userA.id === userB.id) {
    return interaction.reply({ content: '自分自身と交換することはできません。', ephemeral: true });
  }

  const playerA = getPlayer(userA.id);
  const playerB = getPlayer(userB.id);

  if (!playerA) {
    return interaction.reply({ content: 'あなたの調査員データが見つかりません。まずは `/start` コマンドで登録してください。', ephemeral: true });
  }

  if (!playerB) {
    return interaction.reply({ content: '相手の調査員データが見つかりません。相手が先に `/start` コマンドで登録する必要があります。', ephemeral: true });
  }

  // Create session
  const sessionId = `${userA.id}_${userB.id}`;
  
  // Cleanup any old active trade session between these two users
  activeTrades.delete(sessionId);

  activeTrades.set(sessionId, {
    userA: userA.id,
    userB: userB.id,
    monsterA: null,
    monsterB: null,
    confirmA: false,
    confirmB: false
  });

  const monstersA = getPlayerMonsters(userA.id);
  if (monstersA.length === 0) {
    return interaction.reply({ content: '交換に出せるパチモンを1匹も持っていません。', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle('🤝 パチモン交換の申請')
    .setDescription(
      `**${userA.username}** から **${userB.username}** へパチモン交換の申請が届きました！\n\n` +
      `まずは提案者である **${userA.username}** が、交換に出すパチモンを以下のセレクトメニューから選択してください。`
    )
    .setColor('#FF9800');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`trade_select_a_${sessionId}`)
    .setPlaceholder('交換に出す自分のパチモンを選択...')
    .addOptions(
      monstersA.slice(0, 25).map(m => ({
        label: `${m.nickname} (Lv.${m.level})`,
        value: `trade_val_a_${m.id}`,
        description: `タイプ: ${MONSTERS[m.monster_no]?.type || '不明'} | 性格: ${m.personality}`
      }))
    );

  const button = new ButtonBuilder()
    .setCustomId(`trade_cancel_${sessionId}`)
    .setLabel('キャンセル')
    .setStyle(ButtonStyle.Danger);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(button);

  return interaction.reply({
    embeds: [embed],
    components: [row1, row2]
  });
}
