




// // Function to end the game
// function endGame(gameId, challengerWon) {
//   const [challengerId, opponentId] = gameId.split("-");
//   const challengerUser = client.users.cache.get(challengerId);
//   const opponentUser = client.users.cache.get(opponentId);

//   if (challengerUser && gameTimeouts[challengerUser.id]) {
//     clearTimeout(gameTimeouts[challengerUser.id]);
//     delete gameTimeouts[challengerUser.id];
//   }

//   if (opponentUser && gameTimeouts[opponentUser.id]) {
//     clearTimeout(gameTimeouts[opponentUser.id]);
//     delete gameTimeouts[opponentUser.id];
//   }

//   // Check if the game has been reported by both players
//   const reportedByPlayer1 = eloSystem.gameStates.get(gameId)?.player1Reported;
//   const reportedByPlayer2 = eloSystem.gameStates.get(gameId)?.player2Reported;

//   if (reportedByPlayer1 && reportedByPlayer2) {
//     // Determine the winner and loser based on your game logic
//     let winnerId, loserId;

//     if (challengerWon) {
//       winnerId = challengerUser.id;
//       loserId = opponentUser.id;
//     } else {
//       winnerId = opponentUser.id;
//       loserId = challengerUser.id;
//     }

//     // updateElo(winnerId, loserId, false);
//     // updateRecords(winnerId, "win");
//     // updateRecords(loserId, "lose");
//     // updateLeaderboard();
//   } else {
//     // Game ends in a draw only if both players confirm the result
//     if (reportedByPlayer1 || reportedByPlayer2) {
//       // updateElo(challengerUser.id, opponentUser.id, true);
//       // updateRecords(challengerUser.id, "draw");
//       // updateRecords(opponentUser.id, "draw");
//       // updateLeaderboard();
//     }
//   }

//   // Reset game state for the next game
//   eloSystem.gameStates.delete(gameId);
// }








// // Function to update Records
// function updateRecords(userId, result) {
//   // Use eloSystem.userRecords, which is a Map
//   eloSystem.userRecords.set(
//     userId,
//     eloSystem.userRecords.get(userId) || {
//       gamesPlayed: 0,
//       gamesWon: 0,
//       gamesLost: 0,
//       gamesDrawn: 0,
//     }
//   );

//   const userRecord = eloSystem.userRecords.get(userId);

//   userRecord.gamesPlayed++;

//   if (result === "win") {
//     userRecord.gamesWon++;
//   } else if (result === "lose") {
//     userRecord.gamesLost++;
//   } else {
//     userRecord.gamesDrawn++;
//   }
// }

// // Function to update Elo ratings
// function updateElo(winnerId, loserId, isDraw) {
//   // K-factor, adjust as needed
//   const k = 32;

//   const winnerElo = eloSystem.userElo.get(winnerId) || 1200;
//   const loserElo = eloSystem.userElo.get(loserId) || 1200;

//   const expectedScoreWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
//   const expectedScoreLoser = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));

//   console.log(
//     `Before update - Winner: ${winnerId}, Elo: ${winnerElo}, Loser: ${loserId}, Elo: ${loserElo}`
//   );

//   // Update Elo ratings based on the game result
//   if (isDraw) {
//     const delta = k * (0.5 - expectedScoreWinner);
//     eloSystem.userElo.set(winnerId, Math.round(winnerElo + delta));
//     eloSystem.userElo.set(loserId, Math.round(loserElo - delta));
//   } else {
//     const delta = k * (1 - expectedScoreWinner);
//     eloSystem.userElo.set(winnerId, Math.round(winnerElo + delta));
//     eloSystem.userElo.set(loserId, Math.round(loserElo - delta));
//   }

//   // Log updated Elo ratings (replace with your actual logging or storage logic)
//   console.log(
//     `After update - Winner: ${winnerId}, Elo: ${eloSystem.userElo.get(
//       winnerId
//     )}, Loser: ${loserId}, Elo: ${eloSystem.userElo.get(loserId)}`
//   );
// }

// // Function to update the leaderboard
// function updateLeaderboard() {
//   console.log("eloSystem:", eloSystem.userElo);
//   const leaderboard = Array.from(eloSystem.userElo.entries())
//     .sort(([, a], [, b]) => b - a)
//     .map(([userId, elo]) => ({
//       userId,
//       elo,
//       rank: getRank(elo),
//       record: eloSystem.userRecords.get(userId) || {
//         gamesPlayed: 0,
//         gamesWon: 0,
//         gamesLost: 0,
//         gamesDrawn: 0,
//       },
//       avatar:
//         client.users.cache
//           .get(userId)
//           ?.displayAvatarURL({ format: "png", dynamic: true }) || "",
//     }));

//   // Create an embed for the leaderboard
//   // Add image
//   const leaderboardEmbed = new MessageEmbed()
//     .setTitle("Leaderboard")
//     .setColor("#0099ff")
//     .setDescription("Top players based on Elo rating")
//     .addFields(
//       leaderboard.map((user, index) => ({
//         name: `${index + 1}. ${client.users.cache.get(user.userId).tag}`,
//         value: `Rank: ${user.rank}\nElo: ${user.elo}\nRecord: ${user.record.gamesWon}/${user.record.gamesLost}/${user.record.gamesDrawn}`,
//         inline: true,
//       }))
//     )
//     .setTimestamp();

//   // Update your leaderboard message in the Discord channel
//   const channel = client.channels.cache.get(process.env.LEADERBOARD);
//   if (channel?.isText()) {
//     channel.send({ embeds: [leaderboardEmbed] });
//   } else {
//     console.error("Error: Channel not found or not a text channel.");
//   }
// }

// // Function to get the rank based on elo
// function getRank(elo) {
//   if (elo >= 2000) {
//     return ranks[1]; // Pirate King
//   } else if (elo >= 1800) {
//     return ranks[2]; // Yonko
//   } else if (elo >= 1600) {
//     return ranks[3]; // Seven Warlords of the Sea
//   } else if (elo >= 1400) {
//     return ranks[4]; // Supernova
//   } else {
//     return ranks[5]; // East Blue Pirates
//   }
// }
