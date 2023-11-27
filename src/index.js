const { Client, MessageEmbed, Intents } = require("discord.js");
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
});

const ranks = {
  1: "Pirate King",
  2: "Yonko",
  3: "Seven Warlords of the Sea",
  4: "Supernova",
  5: "East Blue Pirates",
};

// Map to store ongoing game data
const games = new Map();

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Command processing
  processCommand(message);
});

// Function to process commands
async function processCommand(message) {
  const [command, ...args] = message.content.split(" ");

  if (command === "/challenge") {
    await challengeCommand(message, args);
  } else if (command === "/report") {
    // soon add report
    //await reportCommand(message, args);
  }
  // Add more commands as needed
}

// Challenge command
async function challengeCommand(message, args) {
  // Check if the user mentioned another user
  const opponent = message.mentions.users.first();

  if (!opponent) {
    message.reply("You need to mention a user to challenge.");
    return;
  }

  // Check if the user is challenging themselves
  if (opponent.id === message.author.id) {
    message.reply("You cannot challenge yourself.");
    return;
  }

  // Check if the opponent is a bot
  if (opponent.bot) {
    message.reply("You cannot challenge a bot.");
    return;
  }

  // Check if the opponent is in an ongoing game
  if (isUserInGame(opponent.id)) {
    message.reply("The opponent is currently in a match.");
    return;
  }

  // Create a challenge message
  const challengeEmbed = new MessageEmbed()
    .setTitle("Challenge")
    .setDescription(`${message.author} has challenged ${opponent} to a game.`);

  const challengeMessage = await message.channel.send({
    embeds: [challengeEmbed],
  });

  // React to the challenge message
  try {
    await challengeMessage.react("✅");
    await challengeMessage.react("❌");
  } catch (error) {
    console.error("Error reacting to the challenge message:", error);
    return;
  }

  // Add the game data to the map
  const gameId = generateGameId();
  games.set(gameId, {
    challenger: message.author.id,
    opponent: opponent.id,
    state: "pending", // or use an enum for states (e.g., { PENDING: 'pending', ACCEPTED: 'accepted', DECLINED: 'declined' })
    timeout: setTimeout(() => {
      // Handle timeout logic
      games.delete(gameId);
      message.channel.send("Challenge timed out.");
    }, 45000),
  });
}
