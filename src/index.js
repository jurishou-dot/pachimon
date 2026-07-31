import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { dbInit } from './database.js';

// Load slash commands
import * as startCmd from './commands/start.js';
import * as menuCmd from './commands/menu.js';
import * as profileCmd from './commands/profile.js';
import * as helpCmd from './commands/help.js';
import * as adminCmd from './commands/admin.js';
import * as tradeCmd from './commands/trade.js';
import * as pvpCmd from './commands/pvp.js';

// Load interaction handlers
import { handleButton } from './handlers/buttonHandler.js';
import { handleSelect } from './handlers/selectHandler.js';
import { handleModal } from './handlers/modalHandler.js';

// Load environment variables
dotenv.config();

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.warn('\n⚠️  [Pachimon Battle Bot WARNING] DISCORD_TOKEN or CLIENT_ID is missing in the environment variables.');
  console.warn('💡  Please copy .env.template to .env and fill in your Discord Bot Token and Client ID to run the bot.');
  console.warn('⚙️  Note: SQLite Database and local tests can still be verified without credentials by running "node src/test_run.js"\n');
}

// Create Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Setup commands collection
client.commands = new Collection();
client.commands.set(startCmd.data.name, startCmd);
client.commands.set(menuCmd.data.name, menuCmd);
client.commands.set(profileCmd.data.name, profileCmd);
client.commands.set(helpCmd.data.name, helpCmd);
client.commands.set(adminCmd.data.name, adminCmd);
client.commands.set(tradeCmd.data.name, tradeCmd);
client.commands.set(pvpCmd.data.name, pvpCmd);

/**
 * Register Slash Commands with Discord API
 */
async function deployCommands() {
  if (!DISCORD_TOKEN || !CLIENT_ID) return;

  const commandsJson = [];
  for (const cmd of client.commands.values()) {
    commandsJson.push(cmd.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    console.log(`🤖 Deploying ${commandsJson.length} slash commands to Discord...`);
    // Register commands globally. (For instant guild-specific testing, use Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) instead)
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commandsJson }
    );
    console.log('✅ Commands deployed successfully to Discord!');
  } catch (error) {
    console.error('❌ Failed to deploy slash commands:', error);
  }
}

// Bot ready event listener
client.once('ready', async () => {
  console.log(`📡 Logged in as ${client.user.tag}!`);
  
  // Initialize Database
  dbInit();

  // Deploy Slash Commands
  await deployCommands();
  
  console.log('🛸 Pachimon Battle Bot is online and ready to explore!');
});

// Bot interaction router
client.on('interactionCreate', async (interaction) => {
  try {
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      console.log(`💬 Slash Command received: /${interaction.commandName} from ${interaction.user.username}`);
      await command.execute(interaction);
    }
    
    // 2. Button clicks
    else if (interaction.isButton()) {
      console.log(`🔘 Button pressed: ${interaction.customId} from ${interaction.user.username}`);
      await handleButton(interaction);
    }
    
    // 3. Dropdown choices
    else if (interaction.isStringSelectMenu()) {
      console.log(`🗂 Select Menu chosen: ${interaction.customId} (Value: ${interaction.values[0]}) from ${interaction.user.username}`);
      await handleSelect(interaction);
    }
    
    // 4. Modal submissions
    else if (interaction.isModalSubmit()) {
      console.log(`📝 Modal submitted: ${interaction.customId} from ${interaction.user.username}`);
      await handleModal(interaction);
    }
  } catch (error) {
    console.error('❌ Error handling interaction:', error);
    
    const errMsg = 'インタラクションの処理中に予期せぬエラーが発生しました。';
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {});
    }
  }
});

// Login to Discord if token is configured
if (DISCORD_TOKEN) {
  client.login(DISCORD_TOKEN).catch((err) => {
    console.error('❌ Discord login failed. Check your DISCORD_TOKEN:', err.message);
  });
}
