require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { startBot } = require("./utils/bot");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  startBot(client);
});

client.login(process.env.BOT_TOKEN);