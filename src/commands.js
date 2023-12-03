const { challengeCommand } = require("./command-challenge");
const { reportCommand } = require("./command-report");
const { leaderboardCommand } = require("./command-leaderboard");
const { startGame, endGame, finalizeGame } = require("./game-logic");
const { findGameId, getUserData, updateUserData } = require("./database");
const { getRankByElo } = require("./elo-utils");

function processCommand(db, client, message, games) {
  const [command, ...args] = message.content.split(" ");

  if (command === "/challenge") {
    console.log(games);
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
