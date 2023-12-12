require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const { EmbedBuilder } = require("discord.js");

async function challengeCommand(
  client,
  db,
  message,
  games,
  getUserData,
  addReactions,
  startGame,
  updateUserData
) {
  const allowedChannelId = process.env.CHALLENGE;
  if (message.channel.id !== allowedChannelId) {
    message.reply(
      "Sorry, this command can only be used in the specified channel."
    );
    return;
  }

  // Check if the user mentioned another user
  const opponent = message.mentions.users.first();

  if (!opponent) {
    message.reply("Sorry, you need to mention a user to challenge.");
    return;
  }

  // Check if the user is challenging themselves
  if (opponent.id === message.author.id) {
    message.reply("Sorry, you cannot challenge yourself.");
    return;
  }

  // Check if the opponent is a bot
  if (opponent.bot) {
    message.reply("Sorry, you cannot challenge a bot.");
    return;
  }

  // Check if the challenger or the opponent is in an ongoing game
  const isEitherInGame =
    (await isUserInGame(message.author.id, games, getUserData, db)) ||
    (await isUserInGame(opponent.id, games, getUserData, db));

  if (isEitherInGame) {
    message.reply("Sorry, one or both players are already in a game.");
    return;
  }

  // Check if the users are in the same voice channel
  const authorMember = message.guild.members.cache.get(message.author.id);
  const opponentMember = message.guild.members.cache.get(opponent.id);

  const authorVoice = authorMember.voice.channel?.parentId ?? null;
  const opponentVoice = opponentMember.voice.channel?.parentId ?? null;

  // Check if both users are in the same category (replace 'Your Category Name' with the actual category name)
  const targetCategoryName = "Rank-Tables";

  try {
    // Fetch the guild information
    const guild = await message.guild.fetch();

    const allChannels = [...guild.channels.cache.values()];
    const parentChannel = allChannels.find(
      (channel) => channel.name === targetCategoryName
    );

    // Log all channels for additional information
    console.log(`Challenger Voice: ${authorVoice}`);
    console.log(`Opponent Voice: ${opponentVoice}`);

    if (!authorVoice || !opponentVoice || !parentChannel.id) {
      // Create a message for if users are not in the same VC
      const voiceChatEmbed = new EmbedBuilder()
        .setColor("#880808")
        .setThumbnail(process.env.VOICE_CHAT_WARNING_ICON)
        .setTitle("🚨 Attention 🚨")
        .setTimestamp()
        .setDescription(
          `Challenge command aborted. \nBefore users can initiate a challenge, both users must be in the same voice channel within ${targetCategoryName}.`
        );

      message.reply({ embeds: [voiceChatEmbed] });
      return;
    }
  } catch (error) {
    console.error("Error fetching guild information:", error);
  }

  // Create a challenge message with reactions
  const challengeEmbed = new EmbedBuilder()
    .setColor("#880808")
    .setThumbnail(process.env.CHALLENGE_ICON)
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
    user.id !== message.author.id &&
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

    // Reaction logs
    console.log(`Reaction: ${reaction.emoji.name} by User: ${user.username}`);
    console.log(`Reaction details:`, reaction);

    if (!user.bot && reaction.emoji.name === "✅" && user.id === opponent.id) {
      // Check if both players are still in the server
      const guild = client.guilds.cache.get(message.guild.id);
      const player1InGuild = guild.members.cache.has(message.author.id);
      const player2InGuild = guild.members.cache.has(opponent.id);

      if (!player1InGuild || !player2InGuild) {
        // Delete the initial challenge message
        challengeMessage.delete().catch(console.error);

        // Create an error embed user not found
        const errorUserNotFoundEmbed = new EmbedBuilder()
          .setColor("#CC5500")
          .setTitle("⚠️ Error Findng User ⚠️")
          .setThumbnail(process.env.ERROR_ICON)
          .setTimestamp();

        // One or both players are no longer in the server
        if (!player1InGuild) {
          message.channel.send({
            embeds: [
              errorUserNotFoundEmbed.setDescription(
                `${message.author.username} is no longer in the server.`
              ),
            ],
          });
        }
        if (!player2InGuild) {
          message.channel.send({
            embeds: [
              errorUserNotFoundEmbed.setDescription(
                `${opponent.username} is no longer in the server.`
              ),
            ],
          });
        }
        return;
      }

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

      // Start Game
      startGame(
        client,
        message,
        message.author,
        opponent,
        gameId,
        games,
        db,
        getUserData,
        updateUserData
      );
    } else {
      // Clear the timeout
      clearTimeout(games.get(gameId).timeout);

      // Challenge declined
      games.delete(gameId);

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
    console.log(`ERROR: ${error}`);
    // Challenge declined
    games.delete(gameId);

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
  }
}

// Function to generate a unique game ID
function generateGameId() {
  return uuidv4();
}

async function isUserInGame(userId, games, getUserData, db) {
  for (const game of games.values()) {
    try {
      const usersInGame = [game.challenger, game.opponent];

      // Check if the user is either the challenger or the opponent and is in the game
      if (usersInGame.includes(userId) && game.state !== "ended") {
        const [challengerData, opponentData] = await Promise.all(
          usersInGame.map((id) => getUserData(id, db))
        );

        // Check if the user data is available and has a valid ID
        if (challengerData && opponentData) {
          return true;
        } else {
          console.error(`Invalid user data for game ID ${game.id}`);
        }
      }
    } catch (error) {
      console.error(`Error checking user data for game ID ${game.id}:`, error);
    }
  }
  return false;
}

module.exports = { challengeCommand };
