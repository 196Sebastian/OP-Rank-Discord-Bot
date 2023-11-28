const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

async function initializeDatabase() {
  const db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });

  // Create tables if they don't exist
  await db.exec(`
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
      winner_id TEXT,
      loser_id TEXT,
      result TEXT
    );
  `);

  return db;
}

module.exports = {
  initializeDatabase,
};
