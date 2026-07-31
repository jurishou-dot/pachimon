import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('パチモンバトルの遊び方ガイドを表示します。');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📖 パチモンバトル 調査ガイド')
    .setDescription(
      `パチモンバトルは、パチモン（パロディモンスター）の調査・保護・育成を中心としたDiscord Botゲームです。\n` +
      `すべての操作はメッセージの下部に表示される **ボタン** または **セレクトメニュー** で行えます。`
    )
    .setColor('#00E5FF')
    .addFields([
      {
        name: '🎮 基本的なゲームループ',
        value: `1. \`/start\` で最初のパチモン（相棒）を選択して登録する。\n` +
               `2. \`/menu\` コマンドでメインメニューを表示する。\n` +
               `3. **🧭 調査** から調査エリアを選択し、探索へ出発する。\n` +
               `4. パチモンに遭遇したら **観察** や **保護** を試みる。`,
        inline: false
      },
      {
        name: '🧭 調査と保護システム',
        value: `・**👀 観察**：パチモンをじっくり観察し、警戒度を下げます。警戒度が下がると保護の成功率が大幅に上がります。\n` +
               `・**🤝 保護**：捕獲用段ボール箱（ボックス）を投げて保護を試みます。アイテム（好物のエサなど）や天候、性格も成功率に影響します。\n` +
               `・**🏃 帰る**：そのエリアから一時撤退します。`,
        inline: false
      },
      {
        name: '🍖 お世話と育成',
        value: `手持ちのパチモンは、メニューの **お世話** から「ごはん」をあげたり「遊ぶ」ことで仲良くなり、お世話を実行すると経験値（EXP）が獲得できます。レベルアップすると戦闘能力が上昇します。`,
        inline: false
      },
      {
        name: '📜 依頼（ミッション）',
        value: `特定のパチモンの保護や特定のエリアの探索など、本部からの指令を達成することで「お金」や「図鑑ポイント」「役立つアイテム」が報酬として手に入ります。`,
        inline: false
      },
      {
        name: '⚙ コマンド一覧',
        value: `・\`/start\`：ゲーム開始＆相棒選択\n` +
               `・\`/menu\`：メインメニュー表示 (推奨)\n` +
               `・\`/profile\`：ライセンス（ステータス）の確認\n` +
               `・\`/help\`：このヘルプを表示`,
        inline: false
      }
    ])
    .setFooter({ text: 'パチモン調査隊本部 • 快適な調査ライフを！' });

  await interaction.reply({ embeds: [embed] });
}
