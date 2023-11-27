require("dotenv").config();

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
    await challengeCommand(message);
  } else if (command === "/report") {
    // soon add report
    await reportCommand(message);
  }
}

// Challenge command
async function challengeCommand(message) {
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
  addReactions(challengeMessage, ["✅", "❌"]);

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

  // Notify the opponent about the challenge
  const opponentUser = message.guild.members.cache.get(opponent.id);
  if (opponentUser) {
    const acceptEmbed = new MessageEmbed()
      .setTitle("Challenge Accepted")
      .setDescription(
        `${opponentUser}, ${message.author} has challenged you. React with ✅ to accept or ❌ to decline.`
      );

    const acceptMessage = await message.channel.send({ embeds: [acceptEmbed] });

    // Add reactions to the accept message
    addReactions(acceptMessage, ["✅", "❌"]);

    // Add the accept/decline event listeners
    const filter = (reaction, user) =>
      user.id === opponent.id &&
      (reaction.emoji.name === "✅" || reaction.emoji.name === "❌");

    const collector = acceptMessage.createReactionCollector({
      filter,
      time: 45000,
    });

    collector.on("collect", (reaction, user) => {
      collector.stop(); // Stop collecting reactions once one is collected

      if (reaction.emoji.name === "✅" && user.id === opponent.id) {
        // Start the game
        startGame(message.author, opponent, gameId);
      } else {
        // Decline the challenge
        endGame(message.author, opponent, gameId, false);
        message.channel.send(`${opponentUser} has declined the challenge.`);
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        // Handle timeout logic
        endGame(message.author, opponent, gameId, true);
        message.channel.send("Challenge timed out.");
      }
    });
  }
}

// Function to check if a user is in an ongoing game
function isUserInGame(userId) {
  for (const game of games.values()) {
    if (game.challenger === userId || game.opponent === userId) {
      return true;
    }
  }
  return false;
}

// Function to generate a unique game ID
function generateGameId() {
  return Math.random().toString(36).substring(7);
}

// Function to start the game
function startGame(player1, player2, gameId) {
  const gameData = games.get(gameId);
  console.log(`game started ${player1} ${player2} ${gameId}`)

  if (!gameData) {
    console.error(`Game data not found for game ID: ${gameId}`);
    return;
  }

  // Clear the challenge timeout
  clearTimeout(gameData.timeout);

  // Set the game state to "started"
  gameData.state = "started";

  // Set the game timer to 55 minutes
  const gameTimer = setTimeout(() => {
    // Handle game end logic
    endGame(player1, player2, gameId, true);
  }, 55 * 60 * 1000); // 55 minutes

  // Set warnings at the 30 and 45 minute marks
  const thirtyMinuteWarning = setTimeout(() => {
    message.channel.send(
      `${player1} and ${player2}, 30 minutes left in the game!`
    );
  }, 30 * 60 * 1000); // 30 minutes

  const fortyFiveMinuteWarning = setTimeout(() => {
    message.channel.send(
      `${player1} and ${player2}, 15 minutes left in the game!`
    );
  }, 45 * 60 * 1000); // 45 minutes

  // Store timers in gameData to manage later
  gameData.timers = [gameTimer, thirtyMinuteWarning, fortyFiveMinuteWarning];
}

// Function to end the game
function endGame(player1, player2, gameId, timeout) {
  const gameData = games.get(gameId);

  if (!gameData) {
    console.error(`Game data not found for game ID: ${gameId}`);
    return;
  }

  // Clear all timers
  for (const timer of gameData.timers) {
    clearTimeout(timer);
  }

  // Handle different end conditions
  if (timeout) {
    message.channel.send(
      `The game between ${player1} and ${player2} has ended due to timeout.`
    );
  } else {
    message.channel.send(
      `The game between ${player1} and ${player2} has ended.`
    );
  }

  // Perform any additional end game logic here

  // Remove game data from the map
  games.delete(gameId);
}

// Function to add reactions to a message
async function addReactions(message, reactions) {
  try {
    for (const reaction of reactions) {
      await message.react(reaction);
    }
  } catch (error) {
    console.error(`Error reacting to the message: ${error}`);
    return;
  }
}

client.login(process.env.BOT_TOKEN);
