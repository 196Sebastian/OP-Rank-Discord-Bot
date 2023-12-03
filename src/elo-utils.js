// Function to calculate Elo change
function calculateEloChange(winnerElo, loserElo) {
  const kFactor = 32; // Adjust this value as needed

  // Log the values for debugging
  console.log("Winner Elo:", winnerElo);
  console.log("Loser Elo:", loserElo);

  // Ensure that winnerElo and loserElo are valid numbers
  if (isNaN(winnerElo) || isNaN(loserElo)) {
    console.error("Invalid Elo values for calculation.");
    return { winner: 0, loser: 0 }; // Return default values or handle accordingly
  }

  const expectedWinnerScore = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const expectedLoserScore = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));

  const winnerNewElo = Math.round(
    winnerElo + kFactor * (1 - expectedWinnerScore)
  );
  const loserNewElo = Math.round(loserElo + kFactor * (0 - expectedLoserScore));

  // Log additional information for debugging
  console.log("Expected Winner Score:", expectedWinnerScore);
  console.log("Expected Loser Score:", expectedLoserScore);
  console.log("Winner New Elo:", winnerNewElo);
  console.log("Loser New Elo:", loserNewElo);

  return { winner: winnerNewElo, loser: loserNewElo };
}

// Function to get rank based on Elo
function getRankByElo(elo) {
  if (elo >= 1200) {
    return "Pirate King";
  } else if (elo >= 1100) {
    return "Yonko";
  } else if (elo >= 1000) {
    return "Seven Warlords of the Sea";
  } else if (elo >= 900) {
    return "Supernova";
  } else {
    return "East Blue Pirates";
  }
}

module.exports = {
  calculateEloChange,
  getRankByElo,
};
