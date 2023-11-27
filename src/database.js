const sqlite3 = require("sqlite3");

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("./database.sqlite", (err) => {
      if (err) {
        reject(err);
      } else {
        console.log("Connected to the database.");

        // Create tables if they don't exist
        db.exec(
          `
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
            loser_id TEXT
          );
          `,
          (err) => {
            if (err) {
              reject(err);
            } else {
              console.log("Tables created successfully.");
              resolve(db);
            }
          }
        );
      }
    });
  });
}

module.exports = initializeDatabase;
