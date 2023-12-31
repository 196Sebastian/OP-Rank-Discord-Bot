require("dotenv").config();
const { EmbedBuilder } = require("discord.js");

async function reportCommand(
  client,
  db,
  message,
  args,
  games,
  addReactions,
  findGameId,
  finalizeGame,
  getUserData,
  updateUserData
) {
  if (!message.channel) {
    console.error("Error: message.channel is undefined");
    return;
  }

  const allowedChannelId = process.env.REPORT;
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
  }

  // Check if the game exists
  const gameId = findGameId(message.author.id, opponentUser.id, games);

  if (!gameId) {
    message.reply("No ongoing game found with the mentioned opponent.");
    return;
  }

  // Check if the result is valid
  const validResults = ["win", "lost"];
  if (!validResults.includes(result.toLowerCase())) {
    message.reply("Invalid result. Please use 'win' or 'lost'.");
    return;
  }

  // Confirm the result with the opponent
  const confirmationEmbed = new EmbedBuilder()
    .setTitle("Result Confirmation")
    .setThumbnail(process.env.REPORT_ICON)
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
    time: 45000,
  });

  collector.on("collect", (reaction) => {
    collector.stop(); // Stop collecting reactions once one is collected

    if (reaction.emoji.name === "✅") {
      // Confirm the result
      finalizeGame(
        client,
        db,
        message,
        message.author,
        opponentUser,
        gameId,
        result,
        games,
        getUserData,
        updateUserData,
        confirmationMessage
      );
    } else {
      // Reject the result
      message.channel.send(`${opponentUser} has rejected the reported result.`);
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      // Delete the initial confirmation message
      confirmationMessage.delete().catch(console.error);

      // Create an error embed for timeout
      const errorEmbed = new EmbedBuilder()
        .setColor("#CC5500")
        .setTitle("⚠️ Error Collecting Reactions ⚠️")
        .setDescription("Result confirmation timed out.")
        .setThumbnail(process.env.ERROR_ICON)
        .setTimestamp();

      // Send the error embed
      message.channel.send({ embeds: [errorEmbed] });
    }
  });
}
module.exports = { reportCommand };
