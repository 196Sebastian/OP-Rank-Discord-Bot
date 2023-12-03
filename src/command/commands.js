const { challengeCommand } = require("./command-challenge");
const { reportCommand } = require("./command-report");
const { leaderboardCommand } = require("./command-leaderboard");
const { startGame, endGame, finalizeGame } = require("../game-logic");
const {
  findGameId,
  getUserData,
  updateUserData,
} = require("../utils/database");
const { getRankByElo } = require("../utils/elo-utils");

// Map to store ongoing game data
const games = new Map();

function processCommand(db, client, message) {
  const [command, ...args] = message.content.split(" ");

  if (command === "/challenge") {
    challengeCommand(
      db,
      client,
      message,
      games,
      getUserData,
      addReactions,
      startGame,
      endGame
    );
    console.log(games)
  } else if (command === "/report") {
    reportCommand(
      db,
      client,
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
