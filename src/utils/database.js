const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

async function initializeDatabase() {
  try {
    const db = await open({
      filename: "./database.sqlite",
      driver: sqlite3.Database,
    });

    // Create tables if they don't exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        elo INTEGER,
        wins INTEGER,
        losses INTEGER
      );

      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        challenger_id TEXT,
        opponent_id TEXT,
        state TEXT,
        elo_challenger INTEGER, 
        elo_opponent INTEGER,   
        winner_id TEXT,
        loser_id TEXT,
        result TEXT
      );
    `);

    return db;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error; // Re-throw the error to indicate initialization failure
  }
}

// Function to get user data from the database
async function getUserData(userId, db) {
  try {
    const user = await db.get("SELECT * FROM users WHERE id = ?", userId);

    if (!user || user.id === null) {
      console.log(`User with ID ${userId} not found or has null ID.`);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error retrieving user data:", error);
    return null;
  }
}

// Function to update user data in the database
async function updateUserData(userId, newData, db) {
  // Ensure that newData has elo property
  newData.elo = newData.elo || 1000;

  const { elo, wins, losses } = newData;

  await db.run(
    "INSERT OR REPLACE INTO users (id, elo, wins, losses) VALUES (?, ?, ?, ?)",
    userId,
    elo || 1000,
    wins || 0,
    losses || 0
  );
  console.log("Updated User Data for User ID:", userId, "New Data:", newData);
}

// Function to find the ongoing game ID between two users
function findGameId(userId1, userId2, games) {
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

module.exports = {
  initializeDatabase,
  getUserData,
  updateUserData,
  findGameId,
};
