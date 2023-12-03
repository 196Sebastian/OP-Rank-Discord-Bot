const { EmbedBuilder } = require("discord.js");

async function leaderboardCommand(db, client, message, args, getRankByElo) {
  try {
    // Get the leaderboard data from the database
    const leaderboardData = await db.all(
      "SELECT * FROM users WHERE id IS NOT NULL ORDER BY elo DESC"
    );

    // Group users by rank
    const groupedByRank = {};
    leaderboardData.forEach((user) => {
      const rank = getRankByElo(user.elo);
      if (!groupedByRank[rank]) {
        groupedByRank[rank] = [];
      }
      groupedByRank[rank].push(user);
    });

    // Create the embed
    const leaderboardEmbed = new EmbedBuilder()
      .setTitle("☠️💰 Wanted Posters 💰☠️")
      .setDescription("Top 5 pirates for each rank.")
      .setColor("#e8b923")
      .setThumbnail(process.env.WANTED)
      .addFields({ name: "\u200B", value: " " });
    // Display the leaderboard with usernames and separate sections for each rank
    for (const [rank, users] of Object.entries(groupedByRank)) {
      const rankTitle = `『 ${rank} 』`;

      for (
        let userIndex = 0;
        userIndex < 5 && userIndex < users.length;
        userIndex++
      ) {
        const user = users[userIndex];
        try {
          const userObject = await client.users.fetch(user.id);
          const username = userObject.username;
          leaderboardEmbed.addFields(
            {
              name: rankTitle,
              value: "\u200B",
            },
            {
              name: "🏴‍☠️",
              value: `${userIndex + 1}. ${username}`,
            },
            {
              name: "🪙",
              value: `Ꞗ ${user.elo.toString()}`,
              inline: true,
            },
            {
              name: "✅ ",
              value: `Wins: ${user.wins.toString()}`,
              inline: true,
            },
            {
              name: "❌ ",
              value: `Losses: ${user.losses.toString()}`,
              inline: true,
            }
          );
        } catch (error) {
          console.error("Error fetching user:", error);
          leaderboardEmbed.addFields({
            name: `${userIndex + 1}. User ID: ${user.id}`,
            value: "Error fetching username",
          });
        }
      }
    }

    // Send the embed to the channel
    message.channel.send({ embeds: [leaderboardEmbed] });
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    message.reply("An error occurred while fetching leaderboard data.");
  }
}
module.exports = { leaderboardCommand };
