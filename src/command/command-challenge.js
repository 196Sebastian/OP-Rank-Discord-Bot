require("dotenv").config();
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
  console.log("Challenge command initiated.");
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
  const isOpponentInGame = await isUserInGame(opponent.id, games, getUserData);

  if (isOpponentInGame) {
    message.reply("The opponent is already in a game.");
    return;
  }

  // Create a challenge message with reactions
  const challengeEmbed = new EmbedBuilder()
    .setColor("#880808")
    .setThumbnail(process.env.FIGHT_LUFFY)
    .setTitle("⚔️ CHALLENGE ⚔️")
    .setDescription(`${message.author} has challenged ${opponent} to a match.`)
    .addFields({
      name: "Instructions",
      value: "React with ✅ to accept or ❌ to decline.",
    });

  const challengeMessage = await message.channel.send({
    embeds: [challengeEmbed],
  });

  // Add reactions to the challenge message
  addReactions(challengeMessage, ["✅", "❌"]);

  // Fetch current Elo values for the challenger and opponent from the database
  const challengerEloData = await getUserData(message.author.id, db);
  const opponentEloData = await getUserData(opponent.id, db);

  // Add the game data to the map
  const gameId = generateGameId();
  games.set(gameId, {
    challenger: message.author.id,
    opponent: opponent.id,
    state: "pending",
    timeout: null,
    winner: null,
    loser: null,
    elo: {
      [message.author.id]: challengerEloData.elo || 1000,
      [opponent.id]: opponentEloData.elo || 1000,
    },
  });

  console.log(
    `Game pending between: ${message.author.id} ${opponent.id} ${gameId}`
  );
  console.log(
    `Updated Elo values:\n${JSON.stringify(games.get(gameId).elo, null, 2)}`
  );

  // Add the accept/decline event listeners
  const filter = (reaction, user) =>
    !user.bot &&
    user.id === opponent.id &&
    (reaction.emoji.name === "✅" || reaction.emoji.name === "❌");

  let gameData;

  try {
    const collected = await challengeMessage.awaitReactions({
      filter,
      max: 1,
      time: 45000,
      errors: ["time"],
    });

    const reaction = collected.first();
    const user = reaction.users.cache.filter((u) => !u.bot).first();

    // Inside the challengeCommand function, after the line const user = reaction.users.cache.first();
    console.log(`Reaction: ${reaction.emoji.name} by User: ${user.username}`);
    console.log(`Reaction details:`, reaction);

    if (!user.bot && reaction.emoji.name === "✅" && user.id === opponent.id) {
      gameData = games.get(gameId);

      if (!gameData || gameData.state !== "pending") {
        message.channel.send("Challenge is no longer valid.");
        console.error("Challenge is no longer valid. Game data:", gameData);
        return;
      }

      // Clear the timeout
      clearTimeout(games.get(gameId).timeout);

      // Mark the game as accepted
      gameData.state = "accepted";
      games.set(gameId, gameData);

      console.log("Game marked as accepted.");
      console.log(
        "Updated Elo values:\n",
        JSON.stringify(games.get(gameId).elo, null, 2)
      );

      // Update the challenge message
      const acceptedEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setThumbnail(process.env.ACCEPTED_ICON)
        .setTitle("⚔️ CHALLENGE ACCEPTED ⚔️")
        .setDescription(
          `${opponent} has accepted the challenge from ${message.author}.`
        );
      challengeMessage.edit({ embeds: [acceptedEmbed] });

      // Call startGame function here
      console.log("Calling startGame function.");
      startGame(
        message,
        message.author,
        opponent,
        gameId,
        games,
        db,
        getUserData
      );
    } else {
      // Clear the timeout using the saved timeout ID
      clearTimeout(games.get(gameId).timeout);

      // Challenge declined
      endGame(
        db,
        message,
        message.author,
        opponent,
        gameId,
        false,
        games,
        getUserData
      );

      // Update the challenge message
      const declinedEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setThumbnail(process.env.DECLINED_ICON)
        .setTitle("⚔️ CHALLENGE DECLINED ⚔️")
        .setDescription(
          `${opponent} has declined the challenge from ${message.author}.`
        );
      challengeMessage.edit({ embeds: [declinedEmbed] });
    }
  } catch (error) {
    if (error instanceof Map) {
      // Challenge timed out
      gameData = games.get(gameId);

      // Delete the initial challenge message
      challengeMessage.delete().catch(console.error);

      // Create an error embed for timeout
      const errorEmbed = new EmbedBuilder()
        .setColor("#CC5500")
        .setTitle("⚠️ Error Collecting Reactions ⚠️")
        .setDescription("Challenge timed out.")
        .setThumbnail(process.env.ERROR_ICON)
        .setTimestamp();

      // Send the error embed
      message.channel.send({ embeds: [errorEmbed] });
    } else {
      // ... (add additional error handling here if needed)
    }
  }
}

// Function to generate a unique game ID
function generateGameId() {
  return uuidv4();
}

async function isUserInGame(userId, games, getUserData) {
  for (const game of games.values()) {
    const challengerData = await getUserData(game.challenger);
    const opponentData = await getUserData(game.opponent);

    // Check if the user data is available and has a valid ID
    if (
      challengerData &&
      opponentData &&
      challengerData.id &&
      opponentData.id
    ) {
      if (
        (game.state === "pending" || game.state === "accepted") &&
        (challengerData.id === userId || opponentData.id === userId)
      ) {
        return true;
      }
    } else {
      console.error(`Invalid user data for game ID ${game.id}`);
    }
  }
  return false;
}

module.exports = { challengeCommand };
