const { challengeCommand } = require("./command-challenge");
const { reportCommand } = require("./command-report");
const { leaderboardCommand } = require("./command-leaderboard");
const { startGame, finalizeGame } = require("../game-logic");
const {
  findGameId,
  getUserData,
  updateUserData,
} = require("../utils/database");
const { getRankByElo } = require("../utils/elo-utils");

// Map to store ongoing game data
const games = new Map();

function processCommand(db, client, message) {
  try {
    const [command, ...args] = message.content.split(" ");

    if (command === "/challenge") {
      challengeCommand(
        client,
        db,
        message,
        games,
        getUserData,
        addReactions,
        startGame,
        updateUserData
      );
    } else if (command === "/report") {
      reportCommand(
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
      );
    } else if (command === "/leaderboard") {
      leaderboardCommand(db, client, message, args, getRankByElo);
    } else {
      // Handle unknown command
      message.reply(
        "Unknown command. Please use /challenge, /report, or /leaderboard."
      );
    }
  } catch (error) {
    console.error("Error processing command:", error);
    // Optionally, send an error message to the channel or handle the error in another way
    message.reply("An error occurred while processing the command.");
  }
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

module.exports = {
  processCommand,
  addReactions,
};
