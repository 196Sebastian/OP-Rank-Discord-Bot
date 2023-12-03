const { initializeDatabase } = require("../utils/database");
const { processCommand } = require("../command/commands");

let db;

async function startBot(client, games) {
  try {
    db = await initializeDatabase();

    if (!db) {
      console.error("Error initializing database.");
      return;
    }
    console.log("Database connected successfully.");

    client.on("messageCreate", (message) => {
      if (message.author.bot) return;

      processCommand(db, client, message, games);
    });
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

module.exports = { startBot };
