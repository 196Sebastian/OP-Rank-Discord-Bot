const { EmbedBuilder } = require("discord.js");
const { calculateEloChange } = require("./utils/elo-utils");
const { calculateEloChangeWithPenalty } = require("./utils/elo-utils");

// Function to start the game
async function startGame(
  message,
  player1,
  player2,
  gameId,
  games,
  db,
  getUserData,
  updateUserData
) {
  let gameData = games.get(gameId);
  console.log(`game started ${player1.id} ${player2.id} ${gameId}`);

  if (!gameData) {
    console.error(`Game data not found for game ID: ${gameId}`);
    return;
  }

  // Initialize elo property if not present
  if (!gameData.elo) {
    gameData.elo = {};
  }

  // Set the game state to "started"
  gameData.state = "started";

  // Initialize timers as an empty array
  gameData.timers = [];

  // Set the game timer to 55 minutes
  const gameTimer = setTimeout(() => {
    // Handle game end logic
    endGame(
      db,
      message,
      player1,
      player2,
      gameId,
      true,
      games,
      getUserData,
      updateUserData
    );
  }, 1 * 60 * 1000); // 55 minutes

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
  gameData.timers.push(gameTimer, thirtyMinuteWarning, fortyFiveMinuteWarning);

  // Log initial Elo values
  console.log("Initial Elo values:");
  console.log(`${player1.username}: ${gameData.elo[player1.id]}`);
  console.log(`${player2.username}: ${gameData.elo[player2.id]}`);
}

// Function to end the game
async function endGame(
  db,
  message,
  player1,
  player2,
  gameId,
  timeout,
  games,
  getUserData,
  updateUserData
) {
  let gameData = games.get(gameId);

  if (!gameData) {
    console.error(`Game data not found for game ID: ${gameId}`);
    return;
  }

  // Intitialize elo property if not present
  if (!gameData.elo) {
    gameData.elo = {};
  }

  // Clear all timers
  if (Array.isArray(gameData.timers)) {
    for (const timer of gameData.timers) {
      clearTimeout(timer);
    }
  }

  if (timeout) {
    const eloChangeWithPenalty = calculateEloChangeWithPenalty(
      gameData.elo[player1.id] || 1000,
      gameData.elo[player2.id] || 1000
    );

    // Update Elo ratings for the winner and loser
    gameData.elo[gameData.winner] = eloChangeWithPenalty.winner;
    gameData.elo[gameData.loser] = eloChangeWithPenalty.loser;

    // Log additional information when updating user data
    console.log("Updated Winner Elo Penalty:", eloChangeWithPenalty.winner);
    console.log("Updated Loser Elo Penalty:", eloChangeWithPenalty.loser);

    const winnerData = await getUserData(player1.id, db);
    const loserData = await getUserData(player2.id, db);

    // Update user records and Elo
    await updateUserData(
      player1.id,
      {
        elo: eloChangeWithPenalty.winner,
        wins: winnerData.wins,
        losses: winnerData.losses + 1,
      },
      db
    );

    await updateUserData(
      player2.id,
      {
        elo: eloChangeWithPenalty.loser,
        wins: loserData.wins,
        losses: loserData.losses + 1,
      },
      db
    );

    // Remove game data from the map
    games.delete(gameId);

    // Update game state in the database
    await db.run(
      "INSERT OR REPLACE INTO games (id, challenger_id, opponent_id, state, winner_id, loser_id, result, elo_challenger, elo_opponent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      gameId,
      gameData.challenger,
      gameData.opponent,
      "ended",
      null,
      null,
      "timeout",
      gameData.elo[eloChangeWithPenalty.winner] || 1000,
      gameData.elo[eloChangeWithPenalty.loser] || 1000
    );
    return;
  }
}

// Function to finalize the game with the reported result
async function finalizeGame(
  db,
  message,
  reporter,
  opponentUser,
  gameId,
  result,
  games,
  getUserData,
  updateUserData
) {
  const gameData = games.get(gameId);

  if (!gameData) {
    console.error(`Game data not found for game ID: ${gameId}`);
    return;
  }

  // Clear all timers
  if (Array.isArray(gameData.timers)) {
    for (const timer of gameData.timers) {
      clearTimeout(timer);
    }
  }

  //Update game result in gameData
  gameData.result = result;

  // Determine winner and loser based on player reports
  if (result.toLowerCase() === "win") {
    gameData.winner = reporter.id;
    gameData.loser = opponentUser.id;
  } else if (result.toLowerCase() === "lost") {
    gameData.winner = opponentUser.id;
    gameData.loser = reporter.id;
  } else {
    // Handle other result cases as needed
    message.channel.send(`Invalid result: ${result}`);
    return;
  }

  // Calculate Elo changes
  const eloChange = calculateEloChange(
    gameData.elo[gameData.winner],
    gameData.elo[gameData.loser]
  );

  // Update user records and Elo
  const winnerData = await getUserData(gameData.winner, db);
  const loserData = await getUserData(gameData.loser, db);

  await updateUserData(
    gameData.winner,
    {
      elo: eloChange.winner,
      wins: winnerData.wins + 1,
      losses: winnerData.losses,
    },
    db
  );

  await updateUserData(
    gameData.loser,
    {
      elo: eloChange.loser,
      wins: loserData.wins,
      losses: loserData.losses + 1,
    },
    db
  );

  // Display the result
  const resultEmbed = new EmbedBuilder();
  resultEmbed
    .setTitle("Game Result")
    .setDescription(
      `The game between ${reporter} and ${opponentUser} has ended. Result: ${result}`
    )
    .addFields({
      name: "Elo Changes",
      value: `${reporter}: ${eloChange.winner}\n${opponentUser}: ${eloChange.loser}`,
    });

  message.channel.send({ embeds: [resultEmbed] });

  // Remove game data from the map
  games.delete(gameId);

  // Update game state in the database
  await db.run(
    "INSERT OR REPLACE INTO games (id, challenger_id, opponent_id, state, winner_id, loser_id, result, elo_challenger, elo_opponent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    gameId,
    gameData.challenger,
    gameData.opponent,
    "ended",
    gameData.winner,
    gameData.loser,
    gameData.result,
    gameData.elo[gameData.challenger] || 1000,
    gameData.elo[gameData.opponent] || 1000
  );
}

module.exports = {
  startGame,
  endGame,
  finalizeGame,
};
