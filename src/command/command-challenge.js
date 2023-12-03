const { v4: uuidv4 } = require("uuid");
const { EmbedBuilder } = require("discord.js");

async function challengeCommand(
  db,
  client,
  message,
  games,
  getUserData,
  addReactions,
  startGame,
  endGame
) {
  const allowedChannelId = process.env.CHALLENGE;
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
  if (isUserInGame(opponent.id, games)) {
    message.reply("The opponent is currently in a match.");
    return;
  }

  // Create a challenge message with reactions
  const challengeEmbed = new EmbedBuilder()
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
    winner: null,
    loser: null,
    elo: {
      [message.author.id]: 1000,
      [opponent.id]: 1000,
    },
  });

  console.log(`Game started ${message.author.id} ${opponent.id} ${gameId}`);

  // Add this additional logging and error checking
  if (games.has(gameId)) {
    console.log(
      `Updated Elo values:\n${JSON.stringify(games.get(gameId).elo, null, 2)}`
    );
  } else {
    console.error(`Game not found in games map for ID: ${gameId}`);
  }

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
      startGame(message, message.author, opponent, gameId, games, db, getUserData);
    } else {
      // Decline the challenge
      endGame(db, message, message.author, opponent, gameId, false, getUserData);
      message.channel.send(`${opponent} has declined the challenge.`);
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      // Handle timeout logic
      endGame(db, message, message.author, opponent, gameId, true, getUserData);
      message.channel.send("Challenge timed out.");
    }
  });
}

// Function to generate a unique game ID
function generateGameId() {
  return uuidv4();
}

// Function to check if a user is in an ongoing game
function isUserInGame(userId, games) {
  for (const game of games.values()) {
    if (game.challenger === userId || game.opponent === userId) {
      return true;
    }
  }
  return false;
}

module.exports = { challengeCommand };
