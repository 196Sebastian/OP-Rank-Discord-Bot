require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { startBot } = require("./bot");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});
// Map to store ongoing game data
const games = new Map();

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  startBot(client, games);
});

client.login(process.env.BOT_TOKEN);
