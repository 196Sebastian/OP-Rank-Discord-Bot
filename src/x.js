
// Report command
async function reportCommand(message, args) {
  console.log("Args received:", args);

  const [result, ...usernameArray] = args;
  const username = usernameArray.join(" ");

  console.log("Result:", result);
  console.log("Username:", username);

  if (!result) {
    return message.reply(
      "Please provide the result of the game (win, lose, or draw)."
    );
  }

  if (!username) {
    console.error(
      `"Error: Invalid or non-existent user mentioned or is a bot. ${username}"`
    );
    return message.reply(
      "Invalid or non-existent user mentioned. Please challenge someone first."
    );
  }

  const challengerUser = message.author;
  let opponentUser =
    message.mentions.users.first() ||
    (username.startsWith("<@") && username.endsWith(">")
      ? client.users.cache.get(username.slice(2, -1))
      : null);

  // Check if the opponentUser is the same as the challengerUser
  if (opponentUser && opponentUser.id === challengerUser.id) {
    return message.reply("You cannot report a game against yourself.");
  }

  // If the opponentUser is not mentioned or is the challengerUser, try to find by username
  if (!opponentUser) {
    const guild = message.guild;
    opponentUser = findUserByUsername(guild, username);
  }

  if (!opponentUser) {
    console.error("Error: Invalid or non-existent user mentioned or is a bot.");
    return message.reply(
      "Invalid or non-existent user mentioned. Please challenge someone first."
    );
  }

  console.log("Challenger User:", challengerUser.tag);
  console.log("Opponent User:", opponentUser.tag);

  // Ensure both users are present in the eloSystem.userElo map
  // if (!eloSystem.userElo.has(challengerUser.id)) {
  //   eloSystem.userElo.set(challengerUser.id, 1200);
  // }

  // if (!eloSystem.userElo.has(opponentUser.id)) {
  //   eloSystem.userElo.set(opponentUser.id, 1200);
  // }

  console.error("Mentioned user:", message.mentions.users);
  console.error("Fetched member:", opponentUser);

  if (opponentUser.bot) {
    console.error("Error: Mentioned user is a bot.");
    return message.reply("You cannot report a game against a bot.");
  }

  console.log("Challenger User:", challengerUser.tag);
  console.log("Opponent User:", opponentUser.tag);

  const gameId = `${challengerUser.id}-${opponentUser.id}`;

  if (!eloSystem.gameStates.has(gameId)) {
    console.error("Error: No active game found to report.");
    return message.reply(
      "No active game found to report. Please challenge someone first."
    );
  }

  // Check if the game exists
  if (gameTimeouts[challengerUser.id] && gameTimeouts[opponentUser.id]) {
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

      const confirmationCollector = confirmationMessage.createReactionCollector(
        {
          filter: confirmationFilter,
          time: 300000, // 5 minutes for confirmation
          max: 1,
        }
      );

      confirmationCollector.on("collect", async (reaction) => {
        if (reaction.emoji.name === "👍") {
          console.log("Collected reaction:", reaction.emoji.name);
          endGame(gameId, result.toLowerCase());

          // Update game state when players confirm the result
          const gameInfo = eloSystem.gameStates.get(gameId);
          if (gameInfo) {
            gameInfo.player1Reported = true;
            gameInfo.player2Reported = true;
          }

          message.channel.send(
            "Game reported and confirmed. The game is now concluded."
          );
        } else {
          message.channel.send("Game report confirmation declined.");
        }

        // Stop the collector, even if the confirmation is collected
        confirmationCollector.stop();
      });

      confirmationCollector.on("end", (_, reason) => {
        console.log("Confirmation collector ended. Reason:", reason);
        if (reason === "time") {
          message.channel.send("Game report confirmation timed out.");
        }
      });
    } else {
      message.reply('Invalid result. Please provide "win", "lose", or "draw".');
    }
  } else {
    message.reply("No active game found to report.");
  }
}

// Function to find a user by username in the guild
function findUserByUsername(guild, username) {
  // Check if username is defined
  if (!username) {
    console.error("Error: Username is undefined or null.");
    return null;
  }

  // Convert the username to lowercase for case-insensitive comparison
  const lowerCaseUsername = username.toLowerCase();

  const member = guild.members.cache.find((member) => {
    const user = member.user;

    // Check if user is defined and the username matches (case-insensitive)
    const usernameMatches =
      user && user.username.toLowerCase() === lowerCaseUsername;

    // Log the username, lowercased username, and whether it matches
    console.log(`Username: ${user ? user.username : "undefined"}`);
    console.log(`Lowercased Username: ${lowerCaseUsername}`);
    console.log(`Username Matches: ${usernameMatches}`);

    return usernameMatches;
  });

  return member ? member.user : null;
}

// Function to check if a user is in a game
function isUserInGame(user) {
  for (const [, { player1, player2 }] of eloSystem.gameStates.entries()) {
    if (
      (player1 && player1.id === user.id && !player1.bot) ||
      (player2 && player2.id === user.id && !player2.bot)
    ) {
      return true;
    }
  }
  return false;
}

// Function to find the game ID by user ID
function findGameIdByUserId(userId) {
  for (const [gameId, { player1, player2 }] of eloSystem.gameStates.entries()) {
    if (
      (player1 && player1.id === userId && !player1.bot) ||
      (player2 && player2.id === userId && !player2.bot)
    ) {
      return gameId;
    }
  }
  return null;
}

// Function to start the game
function startGame(player1, player2, gameId) {
  if (!player1 || !player2) {
    console.error("Error: Invalid players for starting the game.");
    return;
  }

  // Set up game timeouts
  gameTimeouts[player1.id] = setTimeout(() => endGame(gameId), 3300000); // 55 minutes
  gameTimeouts[player2.id] = setTimeout(() => endGame(gameId), 3300000);

  // Create gameState object
  eloSystem.gameStates.set(gameId, {
    player1Reported: false,
    player2Reported: false,
  });

  // Send game announcement
  const channelId = process.env.UPDATE;
  const channel = client.channels.cache.get(channelId);

  // Add this code before trying to get the channel
  console.log(
    "Available channels:",
    client.channels.cache.map((channel) => channel.id)
  );

  if (!channel) {
    console.error("Error: Channel not found.");
    return;
  }

  const updateChannel = client.channels.cache.get(process.env.UPDATE);
  const leaderboardChannel = client.channels.cache.get(process.env.LEADERBOARD);

  if (!updateChannel) {
    console.error("Error: Update channel not found.");
    return;
  }

  if (!leaderboardChannel) {
    console.error("Error: Leaderboard channel not found.");
    return;
  }

  console.log(`Game started between ${player1.tag} and ${player2.tag}.`);
  channel.send(`Game started between ${player1.tag} and ${player2.tag}.`);

  // Add time warnings
  setTimeout(
    () => channel.send(`${player1.tag} vs ${player2.tag}: 30 minutes left.`),
    1800000
  ); // 30 minutes
  setTimeout(
    () => channel.send(`${player1.tag} vs ${player2.tag}: 1 minute left.`),
    2640000
  ); // 44 minutes
}

// Function to end the game
function endGame(gameId, challengerWon) {
  const [challengerId, opponentId] = gameId.split("-");
  const challengerUser = client.users.cache.get(challengerId);
  const opponentUser = client.users.cache.get(opponentId);

  if (challengerUser && gameTimeouts[challengerUser.id]) {
    clearTimeout(gameTimeouts[challengerUser.id]);
    delete gameTimeouts[challengerUser.id];
  }

  if (opponentUser && gameTimeouts[opponentUser.id]) {
    clearTimeout(gameTimeouts[opponentUser.id]);
    delete gameTimeouts[opponentUser.id];
  }

  // Check if the game has been reported by both players
  const reportedByPlayer1 = eloSystem.gameStates.get(gameId)?.player1Reported;
  const reportedByPlayer2 = eloSystem.gameStates.get(gameId)?.player2Reported;

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

    // updateElo(winnerId, loserId, false);
    // updateRecords(winnerId, "win");
    // updateRecords(loserId, "lose");
    // updateLeaderboard();
  } else {
    // Game ends in a draw only if both players confirm the result
    if (reportedByPlayer1 || reportedByPlayer2) {
      // updateElo(challengerUser.id, opponentUser.id, true);
      // updateRecords(challengerUser.id, "draw");
      // updateRecords(opponentUser.id, "draw");
      // updateLeaderboard();
    }
  }

  // Reset game state for the next game
  eloSystem.gameStates.delete(gameId);
}








// Function to update Records
function updateRecords(userId, result) {
  // Use eloSystem.userRecords, which is a Map
  eloSystem.userRecords.set(
    userId,
    eloSystem.userRecords.get(userId) || {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDrawn: 0,
    }
  );

  const userRecord = eloSystem.userRecords.get(userId);

  userRecord.gamesPlayed++;

  if (result === "win") {
    userRecord.gamesWon++;
  } else if (result === "lose") {
    userRecord.gamesLost++;
  } else {
    userRecord.gamesDrawn++;
  }
}

// Function to update Elo ratings
function updateElo(winnerId, loserId, isDraw) {
  // K-factor, adjust as needed
  const k = 32;

  const winnerElo = eloSystem.userElo.get(winnerId) || 1200;
  const loserElo = eloSystem.userElo.get(loserId) || 1200;

  const expectedScoreWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const expectedScoreLoser = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));

  console.log(
    `Before update - Winner: ${winnerId}, Elo: ${winnerElo}, Loser: ${loserId}, Elo: ${loserElo}`
  );

  // Update Elo ratings based on the game result
  if (isDraw) {
    const delta = k * (0.5 - expectedScoreWinner);
    eloSystem.userElo.set(winnerId, Math.round(winnerElo + delta));
    eloSystem.userElo.set(loserId, Math.round(loserElo - delta));
  } else {
    const delta = k * (1 - expectedScoreWinner);
    eloSystem.userElo.set(winnerId, Math.round(winnerElo + delta));
    eloSystem.userElo.set(loserId, Math.round(loserElo - delta));
  }

  // Log updated Elo ratings (replace with your actual logging or storage logic)
  console.log(
    `After update - Winner: ${winnerId}, Elo: ${eloSystem.userElo.get(
      winnerId
    )}, Loser: ${loserId}, Elo: ${eloSystem.userElo.get(loserId)}`
  );
}

// Function to update the leaderboard
function updateLeaderboard() {
  console.log("eloSystem:", eloSystem.userElo);
  const leaderboard = Array.from(eloSystem.userElo.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([userId, elo]) => ({
      userId,
      elo,
      rank: getRank(elo),
      record: eloSystem.userRecords.get(userId) || {
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
