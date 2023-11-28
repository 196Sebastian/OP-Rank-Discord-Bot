require("dotenv").config();

const { Client, EmbedBuilder, GatewayIntentBits } = require("discord.js");
const { initializeDatabase } = require("./database"); // Adjust the path accordingly
const { v4: uuidv4 } = require("uuid");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

let db;

async function startBot() {
  try {
    db = await initializeDatabase();

    if (!db) {
      console.error("Error initializing database.");
      return;
    }

    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  startBot();
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
    await reportCommand(message, args);
  } else if (command === "/leaderboard") {
    await leaderboardCommand(message);
  }
}

// Function to get user data from the database
async function getUserData(userId) {
  const user = await db.get("SELECT * FROM users WHERE id = ?", userId);
  console.log("Retrieved User Data:", user);

  return user || { id: userId, elo: 1000, wins: 0, losses: 0 };
}

// Function to update user data in the database
async function updateUserData(userId, newData) {
  // Ensure that newData has elo property
  newData.elo = newData.elo || 1000;

  await db.run(
    "INSERT OR REPLACE INTO users (id, elo, wins, losses) VALUES (?, ?, ?, ?)",
    userId,
    newData.elo || 1000,
    newData.wins || 0,
    newData.losses || 0
  );
  console.log("Updated User Data for User ID:", userId, "New Data:", newData);
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
      startGame(message, message.author, opponent, gameId);
    } else {
      // Decline the challenge
      endGame(message, message.author, opponent, gameId, false);
      message.channel.send(`${opponent} has declined the challenge.`);
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      // Handle timeout logic
      endGame(message, message.author, opponent, gameId, true);
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
  const confirmationEmbed = new EmbedBuilder()
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

// Command to display the leaderboard
async function leaderboardCommand(message) {
  try {
    const leaderboard = await db.all(
      "SELECT * FROM users ORDER BY elo DESC LIMIT 10"
    );

    console.log("Leaderboard data:", leaderboard);

    if (!Array.isArray(leaderboard)) {
      // Handle the case where leaderboard is not an array
      console.error("Error: Leaderboard data is not an array");
      return;
    }

    const leaderboardEmbed = new EmbedBuilder()
      .setTitle("Leaderboard")
      .setDescription("Top 10 Players");

    leaderboard.forEach((user, index) => {
      leaderboardEmbed.addFields({
        name: `#${index + 1} ${ranks[index + 1] || "Unknown Rank"}`,
        value: `${user.id} - Elo: ${user.elo} | Wins: ${user.wins} | Losses: ${user.losses}`,
      });
    });

    message.channel.send({ embeds: [leaderboardEmbed] });
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
  }
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
  return uuidv4();
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
async function startGame(message, player1, player2, gameId) {
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
    endGame(message, player1, player2, gameId, true);
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
  
  // Update game state in the database
  await db.run(
    "INSERT OR REPLACE INTO games (id, challenger_id, opponent_id, state, elo_challenger, elo_opponent, winner_id, loser_id, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    gameId,
    player1.id,
    player2.id,
    "started",
    gameData.elo[player1.id] || 1000,
    gameData.elo[player2.id] || 1000,
    gameData.winner,
    gameData.loser,
    gameData.result || "unknown"
  );
}

// Function to end the game
async function endGame(message, player1, player2, gameId, timeout) {
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

  // Update user records and Elo
  const eloChange = calculateEloChange(
    gameData.elo[gameData.winner],
    gameData.elo[gameData.loser]
  );

  console.log("Winner ID:", gameData.winner);
  console.log("Loser ID:", gameData.loser);

  const winnerData = await getUserData(gameData.winner);
  const loserData = await getUserData(gameData.loser);

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

  await updateUserData(gameData.winner, {
    elo: eloChange.winner,
    wins: winnerData.wins + 1,
  });

  await updateUserData(gameData.loser, {
    elo: eloChange.loser,
    losses: loserData.losses + 1,
  });

  console.log(
    "Updated User Data for Winner ID:",
    gameData.winner,
    "New Data:",
    {
      elo: eloChange.winner,
      wins: winnerData.wins + 1,
    }
  );

  console.log("Updated User Data for Loser ID:", gameData.loser, "New Data:", {
    elo: eloChange.loser,
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
    "INSERT OR REPLACE INTO games (id, challenger_id, opponent_id, state, winner_id, loser_id, result) VALUES (?, ?, ?, ?, ?, ?, ?)",
    gameId,
    gameData.challenger,
    gameData.opponent,
    "ended",
    gameData.winner,
    gameData.loser,
    gameData.result
  );
}

// Function to finalize the game with the reported result
async function finalizeGame(message, reporter, opponentUser, gameId, result) {
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

  // Calculate Elo changes
  const eloChange = calculateEloChange(
    gameData.elo[gameData.winner],
    gameData.elo[gameData.loser]
  );

  // Update user records and Elo
  const winnerData = await getUserData(gameData.winner);
  const loserData = await getUserData(gameData.loser);

  await updateUserData(gameData.winner, {
    elo: eloChange.winner,
    wins: winnerData.wins + 1,
  });

  await updateUserData(gameData.loser, {
    elo: eloChange.loser,
    losses: loserData.losses + 1,
  });

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

// Function to calculate Elo change
function calculateEloChange(winnerElo, loserElo) {
  const kFactor = 32; // Adjust this value as needed

  // Log the values for debugging
  console.log("Winner Elo:", winnerElo);
  console.log("Loser Elo:", loserElo);

  // Ensure that winnerElo and loserElo are valid numbers
  if (isNaN(winnerElo) || isNaN(loserElo)) {
    console.error("Invalid Elo values for calculation.");
    return { winner: 0, loser: 0 }; // Return default values or handle accordingly
  }

  const expectedWinnerScore = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const expectedLoserScore = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));

  const winnerNewElo = Math.round(
    winnerElo + kFactor * (1 - expectedWinnerScore)
  );
  const loserNewElo = Math.round(loserElo + kFactor * (0 - expectedLoserScore));

  return { winner: winnerNewElo, loser: loserNewElo };
}

client.login(process.env.BOT_TOKEN);
