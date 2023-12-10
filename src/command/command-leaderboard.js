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

    // Create the leaderboard Embed
    const leaderboardEmbed = new EmbedBuilder()
      .setTitle("☠️💰 Wanted Posters 💰☠️")
      .setDescription("Top 5 wanted poster for each rank.")
      .setColor("#e8b923")
      .setThumbnail(process.env.WANTED_POSTER_ICON)
      .addFields({ name: "\u200B", value: " " });

    // Display the leaderboard with usernames and separate sections for each rank
    for (const [rank, users] of Object.entries(groupedByRank)) {
      const rankTitle = `『 ${rank} 』`;

      let rankField = ""; // Create a single field for each rank

      for (
        let userIndex = 0;
        userIndex < 5 && userIndex < users.length;
        userIndex++
      ) {
        const user = users[userIndex];

        try {
          const userObject = await client.users.fetch(user.id);
          const username = userObject.username;
          const avatarUrl = userObject.avatarURL({
            format: "png",
            dynamic: true,
            size: 64,
          });

          rankField += `\n「 🏴‍☠️ ${userIndex + 1}. ${username} 」\n`;
          rankField += `🪙 Ꞗ ${user.elo.toString()} » ✅ Wins: ${user.wins.toString()} » ❌ Losses: ${user.losses.toString()}\n`;
        } catch (error) {
          console.error("Error fetching user:", error);
          rankField += `\n${userIndex + 1}. User ID: ${
            user.id
          }\nError fetching username\n`;
        }
      }

      leaderboardEmbed.addFields({
        name: rankTitle,
        value: rankField,
      });
    }

    // Send the embed to the channel
    message.channel.send({ embeds: [leaderboardEmbed] });
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    message.reply("An error occurred while fetching leaderboard data.");
  }
}
module.exports = { leaderboardCommand };
