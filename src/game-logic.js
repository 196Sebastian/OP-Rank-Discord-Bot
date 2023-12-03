const { EmbedBuilder } = require("discord.js");
const { calculateEloChange } = require("./utils/elo-utils");

// Function to start the game
async function startGame(
  message,
  player1,
  player2,
  gameId,
  games,
  db,
  getUserData
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

  // Clear the challenge timeout
  clearTimeout(gameData.timeout);

  // Set the game state to "started"
  gameData.state = "started";

  // Set the game timer to 55 minutes
  const gameTimer = setTimeout(() => {
    // Handle game end logic
    endGame(db, message, player1, player2, gameId, true, getUserData);
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

  // Add winner and loser properties to gameData
  gameData.winner = null;
  gameData.loser = null;

  // Retrieve current Elo values from the database or assign default values for first-time users
  const eloPlayer1 =
    (await db.get("SELECT elo FROM users WHERE id = ?", player1.id))?.elo ||
    1000;
  const eloPlayer2 =
    (await db.get("SELECT elo FROM users WHERE id = ?", player2.id))?.elo ||
    1000;

  // Initialize Elo values for players
  gameData.elo[player1.id] = eloPlayer1;
  gameData.elo[player2.id] = eloPlayer2;

  // Log initial Elo values
  console.log("Initial Elo values:");
  console.log(`${player1.username}: ${gameData.elo[player1.id]}`);
  console.log(`${player2.username}: ${gameData.elo[player2.id]}`);

  // Update game state in the database
  await db.run(
    "INSERT OR REPLACE INTO games (id, challenger_id, opponent_id, state, elo_challenger, elo_opponent, winner_id, loser_id, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    gameId,
    player1.id,
    player2.id,
    "started",
    gameData.elo[player1.id],
    gameData.elo[player2.id],
    gameData.winner,
    gameData.loser,
    gameData.result || "unknown"
  );

  // Log updated Elo values
  console.log("Updated Elo values:");
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
  const gameData = games.get(gameId);

  if (!gameData) {
    console.error(`Game data not found for game ID: ${gameId}`);
    return;
  }

  // Intitialize elo property if not present
  if (!gameData.elo) {
    gameData.elo = {};
  }

  // Clear all timers
  for (const timer of gameData.timers) {
    clearTimeout(timer);
  }

  // Calculate Elo changes
  const eloChange = calculateEloChange(
    gameData.elo[gameData.winner],
    gameData.elo[gameData.loser]
  );

  // Update Elo ratings for the winner and loser
  gameData.elo[gameData.winner] = eloChange.winner;
  gameData.elo[gameData.loser] = eloChange.loser;

  // Log additional information when updating user data
  console.log("Updated Winner Elo:", eloChange.winner);
  console.log("Updated Loser Elo:", eloChange.loser);

  // Display the result
  const resultEmbed = new EmbedBuilder()
    .setTitle("Game Result")
    .setDescription(
      `The game between ${player1} (${
        gameData.elo[player1.id]
      } Elo) and ${player2} (${
        gameData.elo[player2.id]
      } Elo) has ended. Result: ${gameData.result}`
    );

  console.log("Winner ID:", gameData.winner);
  console.log("Loser ID:", gameData.loser);

  const winnerData = await getUserData(gameData.winner, db);
  const loserData = await getUserData(gameData.loser, db);

  console.log("Retrieved Winner Data:", winnerData);
  console.log("Retrieved Loser Data:", loserData);

  // Check if eloChange.winner and eloChange.loser are objects
  if (
    typeof eloChange.winner === "object" &&
    typeof eloChange.loser === "object"
  ) {
    resultEmbed.addFields([
      { name: "Winner Elo Change", value: eloChange.winner },
      { name: "Loser Elo Change", value: eloChange.loser },
    ]);
  } else {
    console.error("eloChange.winner or eloChange.loser is not an object.");
  }

  // Update user records and Elo
  await updateUserData(
    gameData.winner,
    {
      elo: gameData.elo[gameData.winner],
      wins: winnerData.wins + 1,
    },
    db
  );

  await updateUserData(
    gameData.loser,
    {
      elo: gameData.elo[gameData.loser],
      losses: loserData.losses + 1,
    },
    db
  );

  console.log(
    "Updated User Data for Winner ID:",
    gameData.winner,
    "New Data:",
    {
      elo: gameData.elo[gameData.winner],
      wins: winnerData.wins + 1,
    }
  );

  console.log("Updated User Data for Loser ID:", gameData.loser, "New Data:", {
    elo: gameData.elo[gameData.loser],
    losses: loserData.losses + 1,
  });

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
  for (const timer of gameData.timers) {
    clearTimeout(timer);
  }

  //Update game result in gameData
  gameData.result = result;

  // Determine winner and loser based on player reports
  if (result.toLowerCase() === "win") {
    gameData.winner = reporter.id;
    gameData.loser = opponentUser.id;
  } else if (result.toLowerCase() === "lose") {
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
    },
    db
  );

  await updateUserData(
    gameData.loser,
    {
      elo: eloChange.loser,
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
