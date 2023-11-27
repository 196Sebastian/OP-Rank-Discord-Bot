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
    await reportCommand(message, args);
  }
}

// Challenge command
async function challengeCommand(message) {
  const allowedChannelId = process.env.CHALLENGE; // Replace with the actual channel ID
  if (message.channel.id !== allowedChannelId) {
    message.reply("This command can only be used in the specified channel.");
    return;
  }

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

  // Create a challenge message with reactions
  const challengeEmbed = new MessageEmbed()
    .setTitle("Challenge")
    .setDescription(`${message.author} has challenged ${opponent} to a game.`)
    .addFields({
      name: "Instructions",
      value: `${opponent}, react with ✅ to accept or ❌ to decline.`,
    });

  const challengeMessage = await message.channel.send({
    embeds: [challengeEmbed],
  });

  // Add reactions to the challenge message
  addReactions(challengeMessage, ["✅", "❌"]);

  // Add the game data to the map
  const gameId = generateGameId();
  games.set(gameId, {
    challenger: message.author.id,
    opponent: opponent.id,
    state: "pending",
    timeout: setTimeout(() => {
      // Handle timeout logic
      games.delete(gameId);
      message.channel.send("Challenge timed out.");
    }, 45000),
  });

  // Add the accept/decline event listeners
  const filter = (reaction, user) =>
    user.id === opponent.id &&
    (reaction.emoji.name === "✅" || reaction.emoji.name === "❌");

  const collector = challengeMessage.createReactionCollector({
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
      message.channel.send(`${opponent} has declined the challenge.`);
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

// Report command
async function reportCommand(message, args) {
  const allowedChannelId = process.env.REPORT; // Replace with the actual channel ID
  if (message.channel.id !== allowedChannelId) {
    message.reply("This command can only be used in the specified channel.");
    return;
  }
  // Check if the opponentUser is the same as the challengerUser
  const opponentUser = message.mentions.users.first();
  const result = args[0];

  if (!opponentUser) {
    message.reply("You need to mention the opponent user.");
    return;
  }

  if (opponentUser.id === message.author.id) {
    message.reply("You cannot report a game against yourself.");
    return;
  }

  if (opponentUser.id === message.author.bot) {
    message.reply("You cannot report a game against bot.");
    return;
  }

  // Check if the game exists
  const gameId = findGameId(message.author.id, opponentUser.id);

  if (!gameId) {
    message.reply("No ongoing game found with the mentioned opponent.");
    return;
  }

  // Confirm the result with the opponent
  const confirmationEmbed = new MessageEmbed()
    .setTitle("Result Confirmation")
    .setDescription(
      `${opponentUser}, ${message.author} has reported the result as: ${result}. React with ✅ to confirm or ❌ to reject.`
    );

  const confirmationMessage = await message.channel.send({
    embeds: [confirmationEmbed],
  });

  // Add reactions to the confirmation message
  addReactions(confirmationMessage, ["✅", "❌"]);

  // Add the confirmation event listeners
  const filter = (reaction, user) =>
    user.id === opponentUser.id &&
    (reaction.emoji.name === "✅" || reaction.emoji.name === "❌");

  const collector = confirmationMessage.createReactionCollector({
    filter,
    time: 30000, // Set a time limit for confirmation
  });

  collector.on("collect", (reaction) => {
    collector.stop(); // Stop collecting reactions once one is collected

    if (reaction.emoji.name === "✅") {
      // Confirm the result
      finalizeGame(message, message.author, opponentUser, gameId, result);
    } else {
      // Reject the result
      message.channel.send(`${opponentUser} has rejected the reported result.`);
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      // Handle timeout logic
      message.channel.send("Result confirmation timed out.");
    }
  });
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

// Function to find the ongoing game ID between two users
function findGameId(userId1, userId2) {
  for (const [gameId, gameData] of games) {
    if (
      (gameData.challenger === userId1 && gameData.opponent === userId2) ||
      (gameData.challenger === userId2 && gameData.opponent === userId1)
    ) {
      return gameId;
    }
  }
  return null;
}

// Function to start the game
function startGame(player1, player2, gameId) {
  const gameData = games.get(gameId);
  console.log(`game started ${player1} ${player2} ${gameId}`);

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
function endGame(message, player1, player2, gameId, timeout) {
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

// Function to finalize the game with the reported result
function finalizeGame(message, reporter, opponentUser, gameId, result) {
  const gameData = games.get(gameId);

  if (!gameData) {
    console.error(`Game data not found for game ID: ${gameId}`);
    return;
  }

  // Clear all timers
  for (const timer of gameData.timers) {
    clearTimeout(timer);
  }

  // Display the result
  const resultEmbed = new MessageEmbed()
    .setTitle("Game Result")
    .setDescription(
      `The game between ${reporter} and ${opponentUser} has ended. Result: ${result}`
    );

  message.channel.send({ embeds: [resultEmbed] });

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
