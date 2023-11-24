require("dotenv").config();

const { Client, MessageEmbed, Intents } = require("discord.js");

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
});

const userElo = {}; // Store user Elo ratings
const gameTimeouts = {}; // Store game timeouts
const userRecords = {}; // Define a userRecords object to store user records

let challengerUser; // Declare player1 in a scope accessible to both commands
let opponentUser; // Define opponentUser in a scope accessible to both commands

// Assuming you have a gameState object that tracks the state of the game
const gameState = {
  player1Reported: false,
  player2Reported: false,
};

const ranks = {
  1: "Pirate King",
  2: "Yonko",
  3: "Seven Warlords of the Sea",
  4: "Supernova",
  5: "East Blue Pirates",
};

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Additional logic to initialize userElo when a user sends a message
  if (!userElo[message.author.id]) {
    userElo[message.author.id] = 1200;
  }

  // Challenge command
  if (message.content.startsWith("/challenge")) {
    const [_, opponent] = message.content.split(" ");

    if (!opponent) {
      return message.reply("You need to mention a user to challenge.");
    }

    challengerUser = message.author;
    opponentUser = message.mentions.users.first();

    if (!opponentUser) {
      return message.reply("Invalid user mentioned.");
    }

    // Check if users are already in a game
    if (gameTimeouts[challengerUser.id] || gameTimeouts[opponentUser.id]) {
      return message.reply("One of the users is already in a game.");
    }

    // Send challenge message to opponent
    const challengeMessage = await message.channel.send(
      `${opponentUser}, ${challengerUser} has challenged you to a game. Do you accept?`
    );

    // React to the challenge message
    try {
      await challengeMessage.react("✅");
      await challengeMessage.react("❌");
    } catch (error) {
      console.error("Error reacting to the challenge message:", error);
      return;
    }

    // Set up reaction collector
    const filter = (reaction, user) =>
      user.id === opponentUser.id &&
      (reaction.emoji.name === "✅" || reaction.emoji.name === "❌");

    const collector = challengeMessage.createReactionCollector({
      filter,
      time: 45000,
      max: 1, // Set max reactions to 1 to collect only one reaction
      errors: ["time"], // Trigger 'end' event only on timeout
    });

    client.on("messageReactionAdd", (reaction, user) => {
      if (user.id === opponentUser.id) {
        console.log(`${user.tag} reacted with ${reaction.emoji.name}`);

        if (reaction.emoji.name === "✅") {
          console.log("start");
          startGame(challengerUser, opponentUser);
        } else if (reaction.emoji.name === "❌") {
          console.log(`${user.tag} declined the challenge.`);
          message.channel.send(`${user} declined the challenge.`);
        }
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time" && collected.size === 0) {
        message.channel.send("Challenge timed out.");
      }
    });
  }
  // Report command
  if (message.content.startsWith("/report")) {
    const [_, result] = message.content.split(" ");

    if (!opponentUser) {
      return message.reply(
        "Opponent not defined. Please challenge someone first."
      );
    }

    if (!result) {
      return message.reply(
        "Please provide the result of the game (win, lose, or draw)."
      );
    }

    const gameId = `${message.author.id}-${opponentUser.id}`;

    // Check if the game exists
    if (gameTimeouts[message.author.id] && gameTimeouts[opponentUser.id]) {
      // Check if the result is valid (win, lose, or draw)
      if (["win", "lose", "draw"].includes(result.toLowerCase())) {
        const confirmationMessage = await message.channel.send(
          `${message.author}, do you confirm the result "${result}"?`
        );

        // React to the confirmation message
        await confirmationMessage.react("👍");
        await confirmationMessage.react("👎");

        // Set up reaction collector for confirmation
        const confirmationFilter = (reaction, user) =>
          user.id === message.author.id &&
          (reaction.emoji.name === "👍" || reaction.emoji.name === "👎");

        const confirmationCollector =
          confirmationMessage.createReactionCollector({
            confirmationFilter,
            time: 300000, // 5 minutes for confirmation
            max: 1,
          });

        confirmationCollector.on("collect", async (reaction) => {
          if (reaction.emoji.name === "👍") {
            console.log("Collected reaction:", reaction.emoji.name);
            endGame(gameId, result.toLowerCase());

            // Update game state when players confirm the result
            // How does this work? Not sure if this is correct
            gameState.player1Reported = true;
            gameState.player2Reported = true;

            message.channel.send(
              "Game reported and confirmed. The game is now concluded."
            );
          } else {
            message.channel.send("Game report confirmation declined.");
          }
        });

        confirmationCollector.on("end", (_, reason) => {
          console.log("Confirmation collector ended. Reason:", reason);
          if (reason === "time") {
            message.channel.send("Game report confirmation timed out.");
          }
        });
      } else {
        message.reply(
          'Invalid result. Please provide "win", "lose", or "draw".'
        );
      }
    } else {
      message.reply("No active game found to report.");
    }
  }
});

// Function to start the game
function startGame(player1, player2) {
  if (!player1 || !player2) {
    console.error("Error: Invalid players for starting the game.");
    return;
  }
  const gameId = `${player1.id}-${player2.id}`;

  // Set up game timeouts
  gameTimeouts[player1.id] = setTimeout(() => endGame(gameId), 3300000); // 55 minutes
  gameTimeouts[player2.id] = setTimeout(() => endGame(gameId), 3300000);

  // Send game announcement
  const channel = client.channels.cache.get(process.env.UPDATE);
  if (!channel) {
    console.error("Error: Channel not found.");
    return;
  }

  channel.send(`Game started between ${player1} and ${player2}.`);

  // Add time warnings
  setTimeout(
    () =>
      client.channels.cache.get(process.env.UPDATE).send("30 minutes left."),
    1800000
  ); // 30 minutes
  setTimeout(
    () => client.channels.cache.get(process.env.UPDATE).send("1 minute left."),
    2640000
  ); // 44 minutes
}

// Function to end the game
function endGame(gameId, challengerWon) {
  clearTimeout(gameTimeouts[challengerUser.id]);
  clearTimeout(gameTimeouts[opponentUser.id]);

  // Check if the game has been reported by both players
  // Agian how does this work? Come back to this
  const reportedByPlayer1 = gameState.player1Reported;
  const reportedByPlayer2 = gameState.player2Reported;

  if (reportedByPlayer1 && reportedByPlayer2) {
    // Determine the winner and loser based on your game logic
    let winnerId, loserId;

    if (challengerWon) {
      winnerId = challengerUser.id;
      loserId = opponentUser.id;
    } else {
      winnerId = opponentUser.id;
      loserId = challengerUser.id;
    }

    // Update Elo ratings
    updateElo(winnerId, loserId, false);

    // Update user records
    // Come back to this, is this correct. Seems like the opponetUser is always the loser
    updateRecords(winnerId, "win");
    updateRecords(loserId, "lose");
    updateLeaderboard();
  } else {
    // Game ends in a draw if not reported by both players
    updateElo(challengerUser.id, opponentUser.id, true);

    // Update user records & leaderboard
    updateRecords(challengerUser.id, "draw");
    updateRecords(opponentUser.id, "draw");
    updateLeaderboard();
  }
}

// Function to update Records
function updateRecords(userId, result) {
  userRecords[userId] = userRecords[userId] || {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDrawn: 0,
  };
  userRecords[userId].gamesPlayed++;

  if (result === "win") {
    userRecords[userId].gamesWon++;
  } else if (result === "lose") {
    userRecords[userId].gamesLost++;
  } else {
    userRecords[userId].gamesDrawn++;
  }
}

// Function to update Elo ratings
function updateElo(winnerId, loserId, isDraw) {
  // K-factor, adjust as needed
  const k = 32; 

  const winnerElo = userElo[winnerId] || 1200;
  const loserElo = userElo[loserId] || 1200;

  const expectedScoreWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const expectedScoreLoser = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));

  console.log(
    `Before update - Winner: ${winnerId}, Elo: ${winnerElo}, Loser: ${loserId}, Elo: ${loserElo}`
  );

  // Update Elo ratings based on the game result
  if (isDraw) {
    userElo[winnerId] = Math.round(winnerElo + k * (0.5 - expectedScoreWinner));
    userElo[loserId] = Math.round(loserElo + k * (0.5 - expectedScoreLoser));
  } else {
    userElo[winnerId] = Math.round(winnerElo + k * (1 - expectedScoreWinner));
    userElo[loserId] = Math.round(loserElo + k * (0 - expectedScoreLoser));
  }

  // Log updated Elo ratings (replace with your actual logging or storage logic)
  console.log(
    `After update - Winner: ${winnerId}, Elo: ${userElo[winnerId]}, Loser: ${loserId}, Elo: ${userElo[loserId]}`
  );
}

// Function to update the leaderboard
function updateLeaderboard() {
  console.log("eloSystem:", userElo);
  const leaderboard = Object.entries(userElo)
    .sort(([, a], [, b]) => b - a)
    .map(([userId, elo]) => ({
      userId,
      elo,
      rank: getRank(elo),
      record: userRecords[userId] || {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDrawn: 0,
      },
      avatar:
        client.users.cache
          .get(userId)
          ?.displayAvatarURL({ format: "png", dynamic: true }) || "",
    }));

  // Create an embed for the leaderboard
  // Add image
  const leaderboardEmbed = new MessageEmbed()
    .setTitle("Leaderboard")
    .setColor("#0099ff")
    .setDescription("Top players based on Elo rating")
    .addFields(
      leaderboard.map((user, index) => ({
        name: `${index + 1}. ${client.users.cache.get(user.userId).tag}`,
        value: `Rank: ${user.rank}\nElo: ${user.elo}\nRecord: ${user.record.gamesWon}/${user.record.gamesLost}/${user.record.gamesDrawn}`,
        inline: true,
      }))
    )
    .setTimestamp();

  // Update your leaderboard message in the Discord channel
  const channel = client.channels.cache.get(process.env.LEADERBOARD);
  if (channel?.isText()) {
    channel.send({ embeds: [leaderboardEmbed] });
  } else {
    console.error("Error: Channel not found or not a text channel.");
  }
}

// Function to get the rank based on elo
function getRank(elo) {
  if (elo >= 2000) {
    return ranks[1]; // Pirate King
  } else if (elo >= 1800) {
    return ranks[2]; // Yonko
  } else if (elo >= 1600) {
    return ranks[3]; // Seven Warlords of the Sea
  } else if (elo >= 1400) {
    return ranks[4]; // Supernova
  } else {
    return ranks[5]; // East Blue Pirates
  }
}

client.login(process.env.BOT_TOKEN);
