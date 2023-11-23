require("dotenv").config();

const { Client } = require("discord.js");
const { CommandKit } = require("commandkit");

const client = new Client({
  intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
});

new CommandKit({
  client,
  commandsPath: `${__dirname}/commands`,
  bulkRegister: true,
});

client.login(process.env.BOT_TOKEN);
