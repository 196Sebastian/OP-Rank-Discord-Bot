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

module.exports = {
  initializeDatabase,
};
